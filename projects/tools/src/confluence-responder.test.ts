import { describe, it, expect, beforeEach } from "vitest";
import { isMentioned, alreadyReplied, stripMentions } from "./confluence-responder.js";

// Set bot account ID for tests
beforeEach(() => {
  process.env.CONFLUENCE_BOT_ACCOUNT_ID = "bot-account-123";
});

describe("isMentioned", () => {
  it("returns true when comment body contains bot mention in storage format", () => {
    const body = `<p>Hey <ac:link><ri:user ri:account-id="bot-account-123"/></ac:link> can you explain this?</p>`;
    expect(isMentioned(body)).toBe(true);
  });

  it("returns false when comment does not mention the bot", () => {
    const body = `<p>This looks good to me.</p>`;
    expect(isMentioned(body)).toBe(false);
  });

  it("returns false when a different user is mentioned", () => {
    const body = `<p>Hey <ri:user ri:account-id="some-other-user"/> what do you think?</p>`;
    expect(isMentioned(body)).toBe(false);
  });
});

describe("alreadyReplied", () => {
  it("returns true when a child comment is authored by the bot", () => {
    const children = [
      { authorId: "human-user-456" },
      { authorId: "bot-account-123" },
    ];
    expect(alreadyReplied(children)).toBe(true);
  });

  it("returns false when no child comments are from the bot", () => {
    const children = [
      { authorId: "human-user-456" },
      { authorId: "another-human-789" },
    ];
    expect(alreadyReplied(children)).toBe(false);
  });

  it("returns false when there are no child comments", () => {
    expect(alreadyReplied([])).toBe(false);
  });
});

describe("stripMentions", () => {
  it("removes ri:user tags from storage format", () => {
    const body = `<p><ac:link><ri:user ri:account-id="bot-account-123"/></ac:link> what does section 3 mean?</p>`;
    const result = stripMentions(body);
    expect(result).not.toContain("ri:user");
    expect(result).toContain("what does section 3 mean");
  });

  it("returns trimmed text when only a mention is present", () => {
    const body = `<ri:user ri:account-id="bot-account-123"/>`;
    const result = stripMentions(body);
    expect(result.trim()).toBe("");
  });
});
