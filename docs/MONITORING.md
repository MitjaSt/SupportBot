# Monitoring & Observability

This document describes the Prometheus/Grafana monitoring stack for the RAG system.

## Overview

The monitoring stack tracks:
- **RAG Performance**: Retrieval scores, chunks retrieved, query latency
- **Token Usage & Cost**: OpenAI API token consumption and estimated costs
- **Voice Pipeline**: Whisper (STT) and Piper (TTS) performance metrics
- **System Health**: API latency, error rates, database performance
- **Session Tracking**: User conversations and engagement

## Architecture

```
┌─────────────┐
│  NestJS API │ ──metrics──> ┌────────────┐
│   (port     │              │ Prometheus │
│    3030)    │              │ (port 3060)│
└─────────────┘              └──────┬─────┘
                                    │
┌─────────────┐                     │
│   Whisper   │ ──metrics──>        │
│  (port 3040)│                     │
└─────────────┘                     │
                                    │
┌─────────────┐                     │
│    Piper    │ ──metrics──>        │
│  (port 3050)│                     │
└─────────────┘                     │
                                    ↓
                              ┌──────────┐
                              │ Grafana  │
                              │ (3070)   │
                              └──────────┘
```

## Quick Start

### 1. Start All Services

```bash
# Create Docker network (first time only)
make docker-network

# Start infrastructure (Postgres, Whisper, Piper)
make docker-start

# Start monitoring (Prometheus, Grafana)
make monitoring-start

# Start API server
make api
```

### 2. Access Dashboards

- **Prometheus**: [http://localhost:3060](http://localhost:3060)
- **Grafana**: [http://localhost:3070](http://localhost:3070)
  - Username: `admin`
  - Password: `admin`

### 3. View Metrics

Grafana includes a pre-configured dashboard: **Macular Society - RAG & Voice Monitoring**

Access it via:
- Grafana UI → Dashboards → Browse → "Macular Society - RAG & Voice Monitoring"
- Or use the quick link: `make grafana`

## Metrics Collected

### RAG Metrics

| Metric | Type | Description |
|--------|------|-------------|
| `macular_rag_queries_total` | Counter | Total RAG queries (labeled by status) |
| `macular_rag_retrieval_duration_seconds` | Histogram | Vector search latency |
| `macular_rag_retrieval_score` | Histogram | Cosine similarity scores |
| `macular_rag_chunks_retrieved` | Histogram | Number of chunks per query |
| `macular_rag_failed_retrievals_total` | Counter | Queries with no results above threshold |

### Token & Cost Metrics

| Metric | Type | Description |
|--------|------|-------------|
| `macular_tokens_input_total` | Counter | Input tokens consumed (by model, endpoint) |
| `macular_tokens_output_total` | Counter | Output tokens generated (by model, endpoint) |
| `macular_tokens_total` | Counter | Total tokens (input + output) |
| `macular_tokens_per_request` | Histogram | Token distribution per request |
| `macular_estimated_cost_usd` | Counter | Estimated OpenAI cost in USD |

**Cost Calculation**:
- **gpt-4o**: $5.00/1M input tokens, $15.00/1M output tokens
- **text-embedding-3-small**: $0.02/1M tokens

### Voice Pipeline Metrics

#### Whisper (Speech-to-Text)

| Metric | Type | Description |
|--------|------|-------------|
| `macular_whisper_transcription_duration_seconds` | Histogram | Transcription processing time |
| `macular_whisper_transcription_total` | Counter | Total transcriptions (by model, language) |
| `macular_whisper_transcription_errors_total` | Counter | Transcription errors (by error type) |
| `macular_whisper_audio_duration_seconds` | Histogram | Duration of audio files processed |

#### Piper (Text-to-Speech)

| Metric | Type | Description |
|--------|------|-------------|
| `macular_piper_synthesis_duration_seconds` | Histogram | TTS synthesis processing time |
| `macular_piper_synthesis_total` | Counter | Total syntheses (by voice, language) |
| `macular_piper_synthesis_errors_total` | Counter | Synthesis errors (by error type) |
| `macular_piper_audio_bytes_generated_total` | Counter | Total audio bytes generated |

### OpenAI API Metrics

| Metric | Type | Description |
|--------|------|-------------|
| `macular_openai_api_duration_seconds` | Histogram | API call latency (by operation, model) |
| `macular_openai_api_calls_total` | Counter | Total API calls (by operation, model) |
| `macular_openai_api_errors_total` | Counter | API errors (by operation, error type) |

### Function Calling Metrics

| Metric | Type | Description |
|--------|------|-------------|
| `macular_function_calls_total` | Counter | Function calls by tool name and status |
| `macular_function_call_duration_seconds` | Histogram | Function execution duration |
| `macular_function_call_errors_total` | Counter | Function call errors |
| `macular_contact_collection_success_total` | Counter | Successful contact collections (by type) |

### Session & Database Metrics

| Metric | Type | Description |
|--------|------|-------------|
| `macular_active_sessions` | Gauge | Current active sessions |
| `macular_new_sessions_total` | Counter | New sessions created |
| `macular_messages_per_session` | Histogram | Message distribution per session |
| `macular_db_query_duration_seconds` | Histogram | Database query latency |
| `macular_db_connection_pool_size` | Gauge | Current connection pool size |

## Dashboard Panels

The pre-configured Grafana dashboard includes:

### RAG Performance
1. **RAG Query Rate**: Queries per second (by status)
2. **RAG Retrieval Duration (p95)**: 95th percentile retrieval latency
3. **RAG Retrieval Scores**: Distribution of similarity scores
4. **Chunks Retrieved per Query**: Average chunks returned

### Token Economics
5. **Token Usage Rate**: Input/output tokens over time
6. **Estimated OpenAI Cost (Hourly)**: Cost tracker

### Voice Pipeline
7. **Whisper Transcription Duration**: STT latency (p50, p95)
8. **Piper TTS Synthesis Duration**: TTS latency (p50, p95)
9. **Whisper Transcription Rate**: Transcriptions and errors
10. **Piper TTS Synthesis Rate**: Syntheses and errors

### System Health
11. **OpenAI API Duration (p95)**: API latency by operation
12. **OpenAI API Errors**: Error tracking

## Makefile Commands

### Monitoring Commands

```bash
make monitoring-start      # Start Prometheus + Grafana
make monitoring-stop       # Stop monitoring services
make monitoring-restart    # Restart monitoring services
make monitoring-logs       # Tail monitoring logs
make prometheus            # Open Prometheus in browser
make grafana              # Open Grafana in browser
```

### Docker Commands

```bash
make docker-network       # Create shared Docker network
make docker-start        # Start all infrastructure services
make docker-stop         # Stop all services
make docker-status       # Check service status
make docker-logs         # View service logs
```

## Querying Metrics

### Prometheus Query Examples

#### RAG Performance
```promql
# Average retrieval score over last 5 minutes
histogram_quantile(0.50, rate(macular_rag_retrieval_score_bucket[5m]))

# Failed retrievals per minute
rate(macular_rag_failed_retrievals_total[1m]) * 60

# Average chunks retrieved
histogram_quantile(0.50, rate(macular_rag_chunks_retrieved_bucket[5m]))
```

#### Token Usage
```promql
# Total tokens per minute (by model)
rate(macular_tokens_total[1m]) * 60

# Estimated cost per hour
sum(increase(macular_estimated_cost_usd[1h]))

# Token distribution (p95)
histogram_quantile(0.95, rate(macular_tokens_per_request_bucket[5m]))
```

#### Voice Pipeline
```promql
# Whisper p95 latency
histogram_quantile(0.95, rate(macular_whisper_transcription_duration_seconds_bucket[5m]))

# Piper throughput (requests per second)
rate(macular_piper_synthesis_total[1m])

# Voice error rate
rate(macular_whisper_transcription_errors_total[5m]) + rate(macular_piper_synthesis_errors_total[5m])
```

#### OpenAI API
```promql
# API latency by operation
histogram_quantile(0.95, rate(macular_openai_api_duration_seconds_bucket[5m]))

# API call rate
sum(rate(macular_openai_api_calls_total[1m])) by (operation)

# Error rate
sum(rate(macular_openai_api_errors_total[1m])) by (error_type)
```

## Postgres Data Queries

Grafana is configured with PostgreSQL datasource for custom queries:

### Recent Conversations
```sql
SELECT
  s.session_id,
  s.created_at,
  COUNT(m.id) as message_count,
  s.collection_state
FROM sessions s
LEFT JOIN messages m ON s.session_id = m.session_id
WHERE s.created_at > NOW() - INTERVAL '24 hours'
GROUP BY s.session_id, s.created_at, s.collection_state
ORDER BY s.created_at DESC
LIMIT 100;
```

### Contact Collection Funnel
```sql
SELECT
  collection_state,
  COUNT(*) as count
FROM sessions
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY collection_state;
```

### Average Session Length
```sql
SELECT
  AVG(message_count) as avg_messages,
  MAX(message_count) as max_messages,
  MIN(message_count) as min_messages
FROM (
  SELECT
    session_id,
    COUNT(*) as message_count
  FROM messages
  GROUP BY session_id
) t;
```

## Alerting (Optional)

To enable alerting in Grafana:

1. Go to **Alerting** → **Alert rules**
2. Create alerts based on thresholds:
   - RAG retrieval score drops below 0.7
   - API error rate exceeds 5%
   - Token cost exceeds budget threshold
   - Voice pipeline errors spike
3. Configure notification channels (email, Slack, etc.)

## Troubleshooting

### Prometheus Not Scraping Metrics

**Check API /metrics endpoint**:
```bash
curl http://localhost:3030/metrics
```

Should return Prometheus format metrics. If empty, restart API.

**Check Prometheus targets**:
- Visit [http://localhost:3060/targets](http://localhost:3060/targets)
- All targets should show "UP" status
- If "DOWN", check network connectivity and service health

### Grafana Dashboard Not Showing Data

**Verify datasource connection**:
1. Grafana → Configuration → Data Sources → Prometheus
2. Click "Test" button
3. Should show "Data source is working"

**Check time range**:
- Ensure dashboard time range includes recent data
- Default is "Last 1 hour"
- Generate some traffic to the API to populate metrics

### Network Issues

If services can't communicate:
```bash
# Recreate network
docker network rm macular-network
make docker-network

# Restart all services
make docker-restart
make monitoring-restart
```

## Performance Considerations

### Prometheus Retention

Default retention: 15 days

To adjust, edit [docker/prometheus/prometheus.yml](../docker/prometheus/prometheus.yml):
```yaml
command:
  - '--storage.tsdb.retention.time=30d'  # Change to 30 days
```

### Scrape Intervals

- **API**: 10 seconds (frequent updates)
- **Whisper/Piper**: 15 seconds (less frequent)

Adjust in [docker/prometheus/prometheus.yml](../docker/prometheus/prometheus.yml):
```yaml
scrape_configs:
  - job_name: 'macular-api'
    scrape_interval: 5s  # More frequent
```

### Grafana Refresh Rate

Dashboard auto-refreshes every 10 seconds. Adjust in dashboard settings:
- Click ⚙️ (Settings) in top-right
- Set "Auto refresh" to desired interval

## Security Notes

### Production Considerations

**Grafana**:
- Change default admin password immediately
- Enable HTTPS for production
- Restrict network access
- Configure proper user roles

**Prometheus**:
- No authentication by default
- Consider placing behind reverse proxy with auth
- Restrict network access

**Metrics Endpoint**:
- `/metrics` endpoint is public by default
- Consider adding authentication middleware in production
- Or restrict via firewall rules

## Next Steps

### Expanding Monitoring

1. **Add PostgreSQL Exporter**: Track database-specific metrics
   - Connection pool exhaustion
   - Query performance
   - Table sizes

2. **Add Node Exporter**: Monitor host metrics
   - CPU usage
   - Memory usage
   - Disk I/O

3. **Custom Dashboards**: Create specialized views
   - User engagement analytics
   - Cost optimization
   - Performance debugging

4. **Alerting**: Set up proactive notifications
   - SLA breach alerts
   - Budget threshold alerts
   - System health alerts

## Resources

- [Prometheus Documentation](https://prometheus.io/docs/)
- [Grafana Documentation](https://grafana.com/docs/)
- [PromQL Cheat Sheet](https://promlabs.com/promql-cheat-sheet/)
- [Grafana Dashboard Best Practices](https://grafana.com/docs/grafana/latest/best-practices/best-practices-for-creating-dashboards/)
