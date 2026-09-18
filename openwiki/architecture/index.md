# Files

- [Coding Agent Assembly](agent-graph.md) - How an executable thread run is compiled into the primary Deep Agent, including durable settings, sandbox and skills backends, model routing, tool eligibility, subagents, and middleware enforcement.
- [Agent middleware and failure boundaries](middleware-stack.md) - Ordering-sensitive middleware for coding, reviewer, and subagent graphs. Covers run preparation, model routing and recovery, tool safety boundaries, queue delivery, completion handling, and focused operational tests.
- [Runtime and product architecture](overview.md) - System-level architecture for the LangGraph deployment, custom FastAPI ingress, durable runs, persistence, and cloud and desktop product surfaces.
- [Read-only review and style-learning graphs](reviewer-and-analyzer.md) - The reviewer assesses pull requests without delivering code, while the analyzer learns a repository-specific review-style supplement. This page covers review preparation, durable findings and publication, PR chat, and the style-analysis feedback loop.
- [Thread Sandbox Lifecycle](sandbox-lifecycle.md) - How a normal agent thread receives, persists, reconnects to, and deliberately replaces its sandbox. Covers provider provisioning, workspace initialization, credential-proxy refresh, data-preserving recovery, and desktop behavior.
