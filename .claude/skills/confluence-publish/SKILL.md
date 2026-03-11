# Confluence Publish

Publishes a description or prior skill output as a Confluence page. Implements find-or-create: if a page with the same title already exists, it updates it instead of creating a duplicate.

**Primary path:** Atlassian MCP server (`search_pages`, `create_page`, `update_page`) — available when the user has authenticated the `mcp-remote` connection.
**Fallback path:** Confluence REST API via Bash (Python + `urllib`) — always available using credentials from project env files.

## Usage

```
/confluence-publish <description or content>
```

Alternatively, run a prior skill first (e.g. `/prd`, `/explore`, `/plan`) then run `/confluence-publish` to push its output to Confluence without repeating the content.

---

## Instructions

Follow every step. Do not skip any.

### Step 1: Determine title and content

- If the user passed a short description (< 200 chars with no markdown headings), treat it as a title prompt: generate a full page body using your knowledge of the topic and the project context in CLAUDE.md.
- If the user passed structured content (markdown with headings), use the first `# Heading` as the page title and the full content as the body.
- If the user is continuing from a prior skill output in this session, use that output directly.

The page title must be concise and descriptive (5–10 words). Strip any leading `#` from it.

### Step 2: Load credentials from env

Read these values — they are always present:

| Variable | File | Notes |
|---|---|---|
| `CONFLUENCE_BASE_URL` | `.env.config` | e.g. `https://org.atlassian.net` |
| `CONFLUENCE_SPACE_KEY` | `.env.config` | Personal space has `~` prefix, e.g. `~5570582136700a371d4122bb28f0181ecfb0d6` |
| `CONFLUENCE_ACCOUNT_EMAIL` | `.env.config` | Developer account email for Basic auth |
| `JIRA_API_TOKEN` | `.env.secrets` | Used as the API password in Basic auth |

### Step 3: Find or create

**Try MCP first.** If `search_pages`, `create_page`, `update_page` are available as tools:

1. Call `search_pages` with the exact page title.
2. If a page with a **title that exactly matches** (case-insensitive) exists in the configured space → **Update** (Step 4b).
3. Otherwise → **Create** (Step 4a).

**If MCP tools are not available**, use the REST API fallback (Step 5).

### Step 4a: Create via MCP

Call `create_page` with:
- `spaceKey`: `CONFLUENCE_SPACE_KEY`
- `title`: page title from Step 1
- `body`: page body in Confluence storage format (see Format rules)

### Step 4b: Update via MCP

Call `update_page` with:
- `pageId`: ID from the search result
- `newBody`: page body in Confluence storage format

### Step 5: REST API fallback (when MCP is unavailable)

Write a Python script to `/tmp/confluence_publish.py` and run it with `python3`. The script must:

1. **Search** for an existing page:
   ```
   GET {CONFLUENCE_BASE_URL}/wiki/rest/api/content
     ?title={URL-encoded title}
     &spaceKey={CONFLUENCE_SPACE_KEY}
     &expand=version
   ```
   Auth: `Basic base64("{CONFLUENCE_ACCOUNT_EMAIL}:{JIRA_API_TOKEN}")`

2. **If found** (results array non-empty): call `PUT /wiki/rest/api/content/{id}` with the new version number + body.

3. **If not found**: call `POST /wiki/rest/api/content` with `type=page`, `space.key`, `title`, and `body.storage.value`.

4. On success, fetch `GET /wiki/rest/api/content/{id}?expand=_links` and print the `_links.webui` path to get the canonical page URL.

Embed the full markdown content as a raw string inside the script. Use the `md_to_storage()` conversion function (see Format rules) to convert it before sending. Do not shell-escape the content — write it directly into the Python file.

### Step 6: Output result

Always end with:
```
Page:   <full URL>
Space:  <spaceKey>
Action: created | updated
```

---

## Format rules (Confluence storage format)

Convert markdown to Confluence storage format (XHTML subset). Implement as a `md_to_storage(md)` Python function. Key mappings:

| Markdown | Storage format |
|----------|---------------|
| `# H1` | `<h1>text</h1>` |
| `## H2` | `<h2>text</h2>` |
| `**bold**` | `<strong>text</strong>` |
| `_italic_` | `<em>text</em>` |
| `` `code` `` | `<code>text</code>` |
| ` ```lang\ncode\n``` ` | `<ac:structured-macro ac:name="code"><ac:parameter ac:name="language">lang</ac:parameter><ac:plain-text-body><![CDATA[code]]></ac:plain-text-body></ac:structured-macro>` |
| `- [ ] item` / `- [x] item` | `<ul><li>&#9633; item</li></ul>` / `<ul><li>&#10003; item</li></ul>` |
| `- item` | `<ul><li>item</li></ul>` |
| `1. item` | `<ol><li>item</li></ol>` |
| `[text](url)` | `<a href="url">text</a>` |
| `---` | `<hr/>` |
| `> blockquote` | `<blockquote><p>text</p></blockquote>` |
| Table | `<table><tbody><tr><th>...</th></tr><tr><td>...</td></tr></tbody></table>` |

Wrap plain paragraphs in `<p>` tags. Do not include `<html>`, `<body>`, or `<head>` tags. Escape `&`, `<`, `>` in text content before wrapping in tags (use `escape_xml()`). Skip the first `# H1` line — it becomes the page title, not part of the body.

Add this notice banner at the top of every page body:

```xml
<ac:structured-macro ac:name="info">
  <ac:rich-text-body>
    <p><strong>AI draft</strong> — generated by Claude Code. Review before treating as authoritative.</p>
  </ac:rich-text-body>
</ac:structured-macro>
```
