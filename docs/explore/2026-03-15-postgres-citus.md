# Exploration: Postgres Citus

> Stage: Explore | Date: 2026-03-15
> Pipeline: **Explore** → PRD → Architecture → QA → Plan → Value → Challenge → Decision

## Idea summary

Evaluate whether Citus (distributed PostgreSQL extension) could benefit this project, given the current single-node Postgres + pgvector setup.

> **Note:** "Postgres Citrus" is a common misspelling of **Citus** (by Citus Data, now Microsoft). There is also a separate unrelated tool called "Citrus" (a search service) — this brief covers Citus.

---

## What Citus actually is

Citus is a PostgreSQL **extension** (not a fork). It adds horizontal sharding, distributed query execution, and columnar compressed storage on top of standard Postgres. It works by distributing table rows across multiple worker nodes (shards), with a coordinator node routing queries. Acquired by Microsoft in 2019; now backs Azure Cosmos DB for PostgreSQL. Open source (Apache 2.0). Latest: Citus 13 (Postgres 17 support).

Key capabilities:
- **Horizontal sharding** across worker nodes
- **Columnar compression** (10x+ compression, even on a single node)
- **Distributed parallelism** for analytical queries
- **Reference tables** replicated to all nodes for fast joins

---

## Problem interpretations

### Interpretation A: Vector store performance at scale
As the Macular Society knowledge base grows (more documents, more embeddings), pgvector cosine searches on a single node may slow down. Could Citus distribute the vector index across nodes?

### Interpretation B: Storage cost from growing embeddings
Each `text-embedding-3-small` vector is 1536 float32 values (~6 KB per chunk). At tens of thousands of chunks, storage grows. Columnar compression could reduce this significantly.

### Interpretation C: Future multi-tenancy (client-agnostic platform)
There is an existing explore doc for a client-agnostic platform (`2026-03-09-client-agnostic-platform.md`). If the platform eventually becomes multi-tenant (one schema per charity), Citus sharding by tenant ID is its canonical use case.

---

## Who is affected

| User | Situation | Current workaround | Pain level |
|------|-----------|--------------------|------------|
| Ops/engineering | Single-node Postgres, no horizontal scale path | Vertical scaling (bigger instance) | Low today |
| End users (macular degeneration) | Slow RAG responses if DB becomes overloaded | None | Not yet a problem |
| Future tenants (client-agnostic) | Each new charity org multiplies data volume | Not yet designed | Unknown |

---

## Why now

There is no operational pressure on the DB today — this is speculative infrastructure. The only realistic near-term angle is **columnar compression** for the embeddings table, which Citus supports as a single-node feature (no cluster required). The distributed sharding story does not apply until scale or multi-tenancy materialises.

---

## Existing solutions

**Internal:**
- Single PostgreSQL node with `pgvector` extension
- Drizzle ORM + raw `sql` template tag for vector ops
- Docker bind-mount storage at `docker/storage/`
- No current signs of DB performance bottlenecks

**External:**
- **Citus columnar** — compression-only benefit, single node, no sharding overhead
- **pgvector HNSW index** — approximate nearest neighbour search; better scaling path for pure vector workloads than Citus sharding
- **Qdrant** — purpose-built vector DB (a `docker/storage/qdrant/` directory exists — previously evaluated)
- **TimescaleDB** — another Postgres extension with columnar compression, possibly simpler than Citus for single-node use

---

## Possible directions

### Direction A: Do nothing (baseline)
Current scale does not justify Citus. Focus on pgvector index tuning (HNSW vs. IVFFlat) if search latency becomes a problem. Revisit Citus when data volume or multi-tenancy demands it.

### Direction B: Add Citus columnar on existing node
Use Citus only for its columnar compression on the `embeddings` table — no cluster, no sharding. Reduces storage, speeds up analytical scans. Operationally: add Citus to the Postgres Docker image. Risk: adds an extension dependency without clear upside at current scale.

### Direction C: Full Citus cluster for multi-tenant future
Distribute the DB across coordinator + N worker nodes. Only relevant if the client-agnostic platform PRD matures into a confirmed product direction.

---

## Hard problems

- **pgvector + Citus compatibility**: Citus distributes rows; pgvector indexes are per-shard. Distributed vector search requires cross-shard result merging — not the intended use case, and poorly documented. pgvector HNSW scales much further on a single node before hitting a Citus-worthy bottleneck.
- **Operational complexity**: CLAUDE.md explicitly calls for "operationally lightweight" infrastructure. A Citus cluster (coordinator + workers + Patroni) contradicts this directly for a charity deployment.
- **Coordinator SPOF**: If the coordinator node fails, no queries reach workers. Requires Patroni for HA — itself complex to configure and limited to a single database per cluster.
- **Migration cost**: Retrofitting an existing schema for Citus requires choosing shard keys, adjusting foreign keys, and modifying cross-shard queries. Non-trivial for a running app.
- **Backup complexity**: Consistent backups across all nodes are significantly harder than single-node `pg_dump`. Requires coordinating snapshots across every worker.

---

## Unknowns

| Unknown | Why it matters | How to investigate |
|---------|---------------|--------------------|
| Current query latency under load | Is there an actual performance problem? | Prometheus + Grafana (already deployed on port 3060/3070) |
| pgvector index type in use | Is the existing index type (IVFFlat vs HNSW) optimal? | Read `vector-db.service.ts` index creation SQL |
| Qdrant prior evaluation outcome | `docker/storage/qdrant/` exists — was it tried and rejected? | Check `docs/adr/` for a decision record |
| Client-agnostic platform decision | Citus multi-tenancy only relevant if that direction is confirmed | Track `docs/plan/` for that feature |

---

## Promising direction

**Direction A (do nothing)** — scale and multi-tenancy are not present problems.

Citus is built for two things this project currently lacks: multi-tenant SaaS data volumes and high-frequency analytical dashboards. This is a single-tenant RAG chatbot for a UK charity with an explicit mandate for operational simplicity. If vector search latency degrades, the correct first response is pgvector HNSW index tuning — not distributed database infrastructure. Revisit Citus only if the client-agnostic platform direction is confirmed and data volume projections justify the operational cost.
