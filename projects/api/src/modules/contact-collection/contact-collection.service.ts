import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@/config/config.service';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';

export interface ContactInfo {
  type: 'phone' | 'email';
  value: string;
  isValid: boolean;
  validationMessage?: string;
}

export interface ConversationTurn {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

@Injectable()
export class ContactCollectionService {
  private readonly logger = new Logger(ContactCollectionService.name);
  private readonly historyDir: string;

  constructor(private readonly config: ConfigService) {
    this.historyDir = join(process.cwd(), '.cache', 'history');
  }

  /**
   * Validate UK phone number (basic validation)
   * Accepts formats: +44..., 07..., 01..., 02..., 03...
   */
  validatePhoneNumber(phone: string): ContactInfo {
    const cleaned = phone.replace(/[\s\-\(\)]/g, '');

    // UK mobile (07...)
    const ukMobileRegex = /^(\+44|0)7\d{9}$/;
    // UK landline (01..., 02..., 03...)
    const ukLandlineRegex = /^(\+44|0)[123]\d{9,10}$/;

    const isValidMobile = ukMobileRegex.test(cleaned);
    const isValidLandline = ukLandlineRegex.test(cleaned);

    if (isValidMobile || isValidLandline) {
      return {
        type: 'phone',
        value: cleaned,
        isValid: true,
      };
    }

    let validationMessage = 'Invalid phone number format. ';
    if (cleaned.length < 10) {
      validationMessage += 'The number seems too short. ';
    } else if (cleaned.length > 13) {
      validationMessage += 'The number seems too long. ';
    }
    validationMessage +=
      'Please provide a valid UK phone number (e.g., 07123456789 or 01234567890).';

    return {
      type: 'phone',
      value: phone,
      isValid: false,
      validationMessage,
    };
  }

  /**
   * Validate email address
   */
  validateEmail(email: string): ContactInfo {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (emailRegex.test(email)) {
      return {
        type: 'email',
        value: email.toLowerCase(),
        isValid: true,
      };
    }

    return {
      type: 'email',
      value: email,
      isValid: false,
      validationMessage:
        'Invalid email format. Please provide a valid email address (e.g., example@email.com).',
    };
  }

  /**
   * Validate contact info (auto-detect type)
   */
  validateContact(input: string): ContactInfo {
    const cleaned = input.trim();

    // Check if it looks like an email
    if (cleaned.includes('@')) {
      return this.validateEmail(cleaned);
    }

    // Otherwise treat as phone number
    return this.validatePhoneNumber(cleaned);
  }

  /**
   * Save conversation history to markdown file
   */
  async saveConversationHistory(
    contactInfo: ContactInfo,
    conversationHistory: ConversationTurn[],
    sessionId?: string,
  ): Promise<string> {
    try {
      // Ensure history directory exists
      if (!existsSync(this.historyDir)) {
        await mkdir(this.historyDir, { recursive: true });
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const contactValue = contactInfo.value.replace(/[^\w@.-]/g, '_');
      const filename = `${timestamp}_${contactInfo.type}_${contactValue}.md`;
      const filepath = join(this.historyDir, filename);

      // Build markdown content
      const markdown = this.buildMarkdown(contactInfo, conversationHistory, sessionId);

      await writeFile(filepath, markdown, 'utf-8');

      this.logger.log(`Saved conversation history to ${filename}`);
      return filepath;
    } catch (error) {
      this.logger.error('Failed to save conversation history:', error);
      throw error;
    }
  }

  /**
   * Build markdown document from conversation
   */
  private buildMarkdown(
    contactInfo: ContactInfo,
    conversationHistory: ConversationTurn[],
    sessionId?: string,
  ): string {
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-GB');
    const timeStr = now.toLocaleTimeString('en-GB');

    let markdown = `# Conversation History - Callback Request\n\n`;
    markdown += `**Date:** ${dateStr}\n`;
    markdown += `**Time:** ${timeStr}\n`;

    if (sessionId) {
      markdown += `**Session ID:** ${sessionId}\n`;
    }

    markdown += `**Contact Type:** ${contactInfo.type === 'phone' ? 'Phone' : 'Email'}\n`;
    markdown += `**Contact Value:** ${contactInfo.value}\n\n`;

    markdown += `---\n\n`;
    markdown += `## Conversation\n\n`;

    for (const turn of conversationHistory) {
      const role = turn.role === 'user' ? 'User' : 'Assistant';
      const timestamp = turn.timestamp.toLocaleTimeString('en-GB');

      markdown += `### ${role} (${timestamp})\n\n`;
      markdown += `${turn.content}\n\n`;
    }

    markdown += `---\n\n`;
    markdown += `## Follow-up Required\n\n`;
    markdown += `- [ ] Contact customer at ${contactInfo.value}\n`;
    markdown += `- [ ] Discuss their query\n`;
    markdown += `- [ ] Log outcome\n\n`;

    markdown += `*Generated by Macular Society RAG System*\n`;

    return markdown;
  }
}
