# Files

- [Authentication, authorization, and credential scope](auth-and-security.md) - How Open SWE authenticates dashboard and automation users, scopes GitHub and personal integration credentials to threads and repositories, verifies inbound requests, and keeps secrets out of sandboxes.
- [Model, profile, and instruction resolution](models-profiles-instructions.md) - Explains how workspace defaults, profiles, thread snapshots, adaptive routing, deployment gates, skills, and instruction sources determine an agent run. Covers persistence boundaries, prompt composition, validation, and operational fallback behavior.
- [Threads, runs, and durable state](threads-and-state.md) - How Open SWE identifies conversations and invocations, separates LangGraph state from product records, and preserves metadata, Store data, and sandbox continuity across triggers.
- [Tools, Skills, and Authorization](tools.md) - How Open SWE composes graph-specific tool and skill surfaces, defers integration schemas, and enforces identity, privacy, mode, and channel boundaries. Use this page to safely add or change an agent capability.
