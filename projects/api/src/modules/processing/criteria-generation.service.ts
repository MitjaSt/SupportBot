import { ConfigService } from '@/config/config.service';
import { Injectable } from '@nestjs/common';
import { existsSync } from 'fs';
import { mkdir, readdir, readFile, writeFile } from 'fs/promises';
import OpenAI from 'openai';
import { join } from 'path';

const SYSTEM_PROMPT = `
You are an expert medical content analyst, conversation designer, and AI quality evaluator.

You will be provided with the full content of a file containing medical or health-related informational text.
The provided content is the ONLY source of truth. Do not rely on outside knowledge.

Your task has THREE parts:

────────────────────────────────────
PART 1 - QUESTION GENERATION
────────────────────────────────────

Based strictly on the provided text:

- Generate 6-10 realistic user questions that could naturally occur in a real medical or health-related conversation.
- Questions may reflect the perspective of a patient, caregiver, medical student, or general reader.
- Questions must be grounded in the source text and must NOT introduce assumptions, diagnoses, or medical advice beyond what is explicitly stated.
- Vary the question intent (e.g. definition, clarification, risk, procedure, implication, limitation).
- Avoid redundant questions and ensure coverage across different key concepts or sections of the text.
- If a question cannot be safely answered using only the source text, do NOT generate it.

For each question, include:
- A unique ID
- The question text
- User intent category
- Difficulty level (basic | intermediate | advanced)
- Exact source reference (quote, paragraph, or section identifier)

────────────────────────────────────
PART 2 - AI JUDGE EVALUATION CRITERIA
────────────────────────────────────

Define a checklist of explicit, testable criteria that an AI judge should use to evaluate a conversation answering the generated questions.

The criteria must evaluate whether responses are:
- Medically correct according to the source text
- Faithful and traceable to the source text
- Logically coherent across multiple conversation turns
- Appropriate for a real medical conversation
- Within scope (informational only, no unsupported diagnosis or treatment advice)

The judge MUST:
- Accept “the source text does not provide enough information” as a valid and correct response when applicable
- FAIL the conversation if it fabricates medical facts, statistics, symptoms, diagnoses, or treatments
- FAIL the conversation if it provides personalized medical advice or recommendations not explicitly stated in the text
- FAIL the conversation if answers contradict the source text

Each criterion should include:
- A unique ID
- A clear description
- One or more explicit failure conditions

────────────────────────────────────
PART 3 - META-EVALUATION REQUIREMENTS
────────────────────────────────────

In addition to pass/fail judgments, the AI judge should:
- Provide an overall confidence score (0.0-1.0) indicating how confident it is in the evaluation
- Flag cases where low confidence suggests human review is recommended

────────────────────────────────────
OUTPUT FORMAT (STRICT)
────────────────────────────────────

Return ONLY valid JSON in the following structure:

{
  "questions": [
    {
      "id": "Q1",
      "text": "...",
      "intent": "...",
      "difficulty": "...",
      "source_reference": "..."
    }
  ],
  "judge_criteria": [
    {
      "id": "C1",
      "description": "...",
      "fail_if": "..."
    }
  ],
  "meta": {
    "notes": "Any important assumptions or limitations based on the source text"
  }
}

Do not include explanations, commentary, or content outside this JSON structure.

Content to analyze:
{text}`;

export interface SummarizeResult {
  summarized: number;
  skipped: number;
  errors: number;
}

@Injectable()
export class CriteriaGenerationService {
  private readonly summariesDir: string;
  private readonly criteriaDir: string;
  private readonly openaiClient: OpenAI;
  private readonly maxConcurrent = 3;

  constructor(private readonly config: ConfigService) {
    this.summariesDir = config.filesystem.cacheSummariesDir;
    this.criteriaDir = config.filesystem.cacheCriteriaDir;
    this.openaiClient = new OpenAI({
      apiKey: config.openai.apiKey,
      timeout: config.openai.timeout * 1000,
    });
  }

  async generationText(text: string): Promise<string> {
    const prompt = SYSTEM_PROMPT.replace('{text}', text);

    const response = await this.openaiClient.chat.completions.create({
      model: this.config.openai.chatModel,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 1024,
      temperature: 0.3,
    });

    return response.choices[0]?.message?.content?.trim() ?? '';
  }

  async generateFile(filename: string): Promise<{
    status: 'success' | 'skipped' | 'error';
    reason?: string;
  }> {
    const inputPath = join(this.summariesDir, filename);
    const outputPath = join(this.criteriaDir, filename.replace('.txt', '.json'));

    // Skip if already summarized
    if (existsSync(outputPath)) {
      return { status: 'skipped', reason: 'already summarized' };
    }

    try {
      const text = await readFile(inputPath, 'utf-8');

      if (!text.trim()) {
        return { status: 'skipped', reason: 'empty file' };
      }

      const summary = await this.generationText(text);
      await writeFile(outputPath, summary);

      return { status: 'success' };
    } catch (error) {
      console.error(`Failed to generate criteria for ${filename}:`, error);
      return { status: 'error', reason: String(error) };
    }
  }

  async criteriaGeneration(
    onProgress?: (current: number, total: number) => void,
  ): Promise<SummarizeResult> {
    // Ensure summaries directory exists
    if (!existsSync(this.criteriaDir)) await mkdir(this.criteriaDir, { recursive: true });
    if (!existsSync(this.criteriaDir)) return { summarized: 0, skipped: 0, errors: 0 };

    const files = await readdir(this.summariesDir);
    const txtFiles = files.filter((f) => f.endsWith('.txt'));

    let summarized = 0;
    let skipped = 0;
    let errors = 0;

    // Process in batches to avoid rate limits
    for (let i = 0; i < txtFiles.length; i += this.maxConcurrent) {
      const batch = txtFiles.slice(i, i + this.maxConcurrent);

      const results = await Promise.all(
        batch.map((file) => this.generateFile(file)),
      );
    return { summarized, skipped, errors };

      for (const result of results) {
        if (result.status === 'success') {
          summarized++;
        } else if (result.status === 'skipped') {
          skipped++;
        } else {
          errors++;
        }
      }

      onProgress?.(Math.min(i + batch.length, txtFiles.length), txtFiles.length);
    }

    return { summarized, skipped, errors };
  }

  async getSummarizedFiles(): Promise<string[]> {
    if (!existsSync(this.summariesDir)) {
      return [];
    }
    const files = await readdir(this.summariesDir);
    return files.filter((f) => f.endsWith('.txt'));
  }
}
