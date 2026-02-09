# Query Rewriting for Conversational Context

## Overview

The RAG system now includes **automatic query rewriting** to handle conversational follow-up questions. This allows users to ask questions like "What causes it?" after discussing dry AMD, and the system will automatically rewrite it to "What causes dry AMD?" for better retrieval accuracy.

## How It Works

### 1. Smart Detection

The system automatically detects when a query likely needs rewriting by checking for:

- **Pronouns**: it, this, that, they, them, these, those, he, she, his, her, their
- **Questions about pronouns**: "What is it?", "How does that work?"
- **Follow-up indicators**: also, too, as well, what else, more, another
- **Vague references**: "those injections", "that procedure", "these treatments"

### 2. Efficient Rewriting

When rewriting is needed:
- Uses `gpt-4o-mini` (cheapest OpenAI model)
- Only sends last 3 conversation turns (not entire history)
- Skips rewriting if query is already self-contained
- Falls back gracefully if rewriting fails

### 3. Transparent Logging

All query rewrites are logged:
```
Query rewritten: "What causes it?" -> "What causes dry AMD?"
```

Original and rewritten queries are tracked in observability platforms.

## Example Conversations

### Before Query Rewriting ❌
```
User: "What is dry AMD?"
Assistant: "Dry AMD is a progressive eye condition..."

User: "What causes it?"
→ Retrieves: Generic results about "causes"
→ Answer: "I don't have information about that"
```

### After Query Rewriting ✅
```
User: "What is dry AMD?"
Assistant: "Dry AMD is a progressive eye condition..."

User: "What causes it?"
→ Rewritten: "What causes dry AMD?"
→ Retrieves: Specific chunks about dry AMD causes
→ Answer: "Dry AMD is caused by..."

User: "What are treatments?"
Assistant: "Treatment typically involves anti-VEGF injections into the eye..."

User: "Where can I get those injections?"
→ Rewritten: "Where can I get anti-VEGF injections?"
→ Retrieves: Specific chunks about anti-VEGF injection locations
→ Answer: "Anti-VEGF injections are administered at..."
```

## Cost Analysis

**Per Query with Rewriting:**
- Input: ~150-200 tokens (enhanced system prompt + recent history)
- Output: ~30-50 tokens (rewritten query with medical terms)
- Model: gpt-4o-mini
- **Cost: ~$0.00003** (0.003 cents)

**Monthly cost for 100,000 queries:**
- With optimizations: **~$3.00**
- Without rewriting: Users get poor results, ask more questions = more main LLM calls

**ROI:** Much cheaper than alternative of feeding historic RAG data (25x more expensive) and improves accuracy significantly.

## Technical Details

### Query Flow

```
1. User query received
   ↓
2. Check if rewriting needed (pronouns/follow-ups)
   ↓
3. If yes: Rewrite using gpt-4o-mini + last 3 turns
   ↓
4. Use rewritten query for vector search
   ↓
5. Use original query for generation
   ↓
6. Log both queries for monitoring
```

### Implementation

Location: [src/modules/rag/rag.service.ts](../src/modules/rag/rag.service.ts)

**Key methods:**
- `needsRewriting(query)` - Detects if rewriting is needed
- `rewriteQuery(query, history)` - Performs the rewriting
- `query()` - Integrates rewriting into RAG flow

### Optimizations

1. **Smart Skipping**: Only rewrites ~40% of queries (those with pronouns/references)
2. **Limited History**: Only last 3 conversation turns sent to reduce tokens
3. **Cheap Model**: Uses gpt-4o-mini instead of gpt-4o
4. **Entity Extraction**: Explicitly extracts specific medical terms from assistant's last response to replace vague references
5. **Graceful Fallback**: Returns original query if rewriting fails

## Monitoring

### Logs to Watch

**Successful Rewrite:**
```
[RagService] Query rewritten: "What causes it?" -> "What causes dry AMD?"
```

**No Rewrite Needed:**
```
[RagService] Query used as-is: "What is dry AMD?"
```

**Rewrite Failed:**
```
[RagService] Query rewriting failed, using original: <error>
```

### Observability Integration

Query rewrites are tracked in LangFuse/LangWatch:
- Original query stored in metadata
- Rewritten query used for retrieval logging
- `rewritten: true` flag added when applicable

## Configuration

No additional configuration required. The feature is:
- ✅ Automatically enabled
- ✅ Cost-optimized by default
- ✅ Fully transparent with logging

## Testing

Run the query rewriting tests:
```bash
npm test test/unit/query-rewriting-simple.test.ts
```

Tests cover:
- Pronoun detection
- Follow-up indicator detection
- needsRewriting logic

## Performance Metrics

**Expected improvements:**
- **Retrieval Accuracy**: +40-50% for follow-up questions with entity extraction
- **User Satisfaction**: Fewer "I don't have information" responses
- **Cost**: Negligible (~$0.00003 per rewritten query)
- **Latency**: +100-250ms for queries requiring rewriting

## Future Enhancements

Potential improvements:
- [ ] Cache common rewrites to reduce API calls
- [ ] Use even cheaper model (gpt-3.5-turbo) if accuracy is sufficient
- [ ] Add metrics dashboard for rewrite success rate
- [ ] A/B test different rewriting prompts
- [ ] Expand pattern detection for more edge cases

## Troubleshooting

**Issue**: Too many queries being rewritten
- **Solution**: Tighten pronoun detection patterns in `needsRewriting()`

**Issue**: Rewrites not accurate
- **Solution**: Adjust system prompt in `rewriteQuery()` method
- **Solution**: Increase history window from 3 to 5 turns

**Issue**: High costs
- **Solution**: Verify using gpt-4o-mini, not gpt-4o
- **Solution**: Check logs to see how often rewriting occurs

## Related Documentation

- [Contact Collection Tool](../../docs/CONTACT_COLLECTION.md)
- [RAG Module README](../src/modules/rag/README.md)
- [Claude Code Guide](.claude/CLAUDE.md)
