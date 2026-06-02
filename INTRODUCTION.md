# RAG Project Overview

`INTRODUCTION.md` is the root-level overview for this repository. It explains what the project is, why it exists, and what it includes.

## What this project is

This repo implements a retrieval-augmented generation (RAG) chatbot for medical question answering. It combines:

- a NestJS backend API
- PostgreSQL with `pgvector` for semantic search
- OpenAI for embeddings and chat
- a React + Vite frontend
- optional voice support via Whisper speech-to-text and Piper text-to-speech
- Zitadel-based authentication for secure access

The purpose is to deliver accurate, grounded medical answers from a curated knowledge base while keeping the system operationally lightweight.

**Accessibility is a first-class concern.** The frontend is designed for users who rely on screen readers, keyboard navigation, or assistive technology. This shapes component choices, ARIA usage, focus management, and font sizing throughout.

## Key features

- Retrieval-augmented generation: queries are answered using relevant documents from the knowledge base instead of pure LLM hallucination. When no relevant chunks are found above the score threshold, the system explicitly says so rather than guessing.
- Query rewriting: conversational follow-up questions are rewritten into self-contained queries before embedding, improving multi-turn retrieval quality.
- Vector search with PostgreSQL + `pgvector` (cosine similarity, HNSW index).
- Hybrid search support (optional BM25 + vector ranking).
- Streaming response delivery via SSE.
- Web UI for chat and session management.
- Voice input/output support through Whisper and Piper.
- Contact collection: the assistant can collect a caller's phone number or email via OpenAI tool calling when they request a human callback, running a structured state machine to confirm the details.
- Authentication and authorization using Zitadel.
- Observability with Prometheus, Grafana, and LangWatch.
- Full pipeline for scraping, chunking, summarizing, embedding, and storing knowledge.
- Evaluation framework with RAGAS faithfulness tests, LangWatch agent simulations, and DeepEval — covering retrieval quality, answer grounding, and adversarial safety.

## Components

### API (`projects/api`)

- NestJS application using Fastify.
- Drizzle ORM for Postgres persistence.
- API modules for:
  - chat and session handling
  - RAG pipeline execution
  - embeddings and vector search
  - contact collection workflows
  - speech services (Whisper/Piper)
  - system health and metrics
- Streaming SSE endpoints for chat responses.
- Validation using TypeBox.

### Frontend (`projects/frontend`)

- React 18 + Vite + TypeScript.
- MUI v5 for accessible UI components.
- TanStack Query for server state and session caching.
- React Router v6 for navigation.
- Client-side SSE support for real-time answer streaming.
- UI for chat, session history, pinned queries, and debug tools.

### Voice services

- Whisper-based speech-to-text service.
- Piper-based text-to-speech service.
- Docker-compose support for local voice service development.

### Infrastructure

- Docker Compose orchestration for development and production.
- Bind-mounted storage for persistent data under `docker/storage/`.
- Prometheus metrics and Grafana dashboards for observability.
- Centralized environment configuration using `.env.config` and `.env.secrets`.

## Capabilities

- Answer medical questions using a grounded knowledge base.
- Generate responses that cite and rely on retrieved context.
- Stream answers to the browser as the LLM generates them.
- Collect callback details like phone or email when the user requests support.
- Support authenticated access and protected endpoints.
- Enable local end-to-end voice interactions.

## Why this repo exists

This project is focused on building a practical, maintainable RAG chatbot that is safe for medical use. It emphasizes:

- grounded retrieval over hallucination — the system is explicitly designed not to fabricate answers
- accessible frontend design — screen readers, keyboard navigation, and assistive technology are supported throughout
- transparent architecture and observability
- operationally lightweight infrastructure — pgvector over a separate vector DB, bind mounts over named volumes, minimal moving parts
- clear separation between API, frontend, and data pipeline
