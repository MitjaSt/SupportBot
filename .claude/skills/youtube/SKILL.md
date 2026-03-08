---
name: youtube
description: Fetch a YouTube video's subtitles and feed the transcript through /explore to surface ideas relevant to this project. Usage: /youtube <url> [--skill explore|prd]
---

# YouTube Transcript → Explore

Fetches a YouTube video's auto-generated or manual subtitles using `yt-dlp`, cleans the transcript, and feeds it through a pipeline skill to surface ideas.

**Default downstream skill:** `/explore`

## Usage

```
/youtube <youtube-url>
/youtube <youtube-url> --skill prd
```

---

## Instructions

### Step 0: Parse args

The YouTube URL is in `$ARGS`. Extract it. If `--skill <name>` is present, note the downstream skill (default: `explore`). If no URL is provided, ask: "What YouTube URL do you want to fetch?"

---

### Step 1: Ensure yt-dlp is available

Run via Bash:
```bash
which yt-dlp
```

If not found, install it:
```bash
brew install yt-dlp
```

If brew is also unavailable, tell the user: "Neither `yt-dlp` nor `brew` is installed. Install Homebrew first: https://brew.sh" and stop.

---

### Step 2: Fetch subtitles

Run via Bash (write to a temp dir):
```bash
mkdir -p /tmp/yt-transcript && \
yt-dlp \
  --write-auto-subs \
  --write-subs \
  --skip-download \
  --sub-format vtt \
  --sub-langs en \
  -o "/tmp/yt-transcript/%(title)s" \
  "<URL>"
```

List what was written:
```bash
ls /tmp/yt-transcript/
```

If no `.vtt` file was written, tell the user: "No subtitles found for this video. The video may not have auto-generated captions, or it may be age-restricted." Stop.

---

### Step 3: Clean the transcript

Find the `.vtt` file and clean it. Run via Bash:
```bash
cat /tmp/yt-transcript/*.vtt \
  | grep -v '^WEBVTT' \
  | grep -v '^NOTE' \
  | grep -v '^$' \
  | grep -v '^[0-9]\{2\}:[0-9]\{2\}' \
  | grep -v ' --> ' \
  | sed 's/<[^>]*>//g' \
  | awk '!seen[$0]++' \
  | tr '\n' ' ' \
  | fold -s -w 120
```

This strips: the WEBVTT header, timestamps, HTML tags (e.g. `<c>`), and duplicate lines caused by rolling-window captions. The output is plain prose.

Store the cleaned text. If it is fewer than 100 words, warn the user: "The transcript is very short — captions may be sparse. Proceeding anyway."

---

### Step 4: Identify the video title

Extract the video title from the filename (without extension) written to `/tmp/yt-transcript/`. Use it as the topic label in the next step.

---

### Step 5: Clean up temp files

```bash
rm -rf /tmp/yt-transcript/
```

---

### Step 6: Run the downstream skill

Tell the user: "Transcript fetched. Running /[skill] on: [video title]"

Now run as if the user had invoked `/explore` (or the requested skill) with the following context injected as the idea/brief:

> **Source:** YouTube transcript — [video title]
>
> [cleaned transcript text]

For `/explore`: treat the transcript as the "idea" input. Surface how the concepts in the video might apply to the Macular Society RAG platform — new RAG techniques, medical content opportunities, UX patterns, accessibility ideas, or operational improvements. Be specific about what is applicable vs. what is generic.

For `/prd`: treat the transcript as background research context. Ask the user: "What aspect of this video do you want to turn into a PRD?" before proceeding.

---

## Tone and output rules

- Do not summarise the video neutrally — always filter through the lens of this project.
- Call out anything relevant to low-vision users or medical domain accuracy explicitly.
- If the transcript is technical (ML/RAG), map concepts to the existing stack (pgvector, OpenAI, NestJS) wherever possible.
