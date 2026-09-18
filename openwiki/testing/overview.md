---
type: testing strategy
title: Testing strategy and focused validation
description: Choose the narrowest deterministic Python, frontend, desktop, or end-to-end test that proves an Open SWE behavior. This guide maps test boundaries, shared isolation fixtures, controlled E2E seams, and focused commands.
tags: [testing, pytest, vitest, playwright, sandbox, webhooks, reviewer]
sources:
  - id: openwiki-source-8037e2358a2c4f9b2c722a11
    resource: repo://AGENTS.md
  - id: openwiki-source-24f77a48f966a05631988d08
    resource: repo://desktop/package.json
  - id: openwiki-source-012f2c78e3b1446dfc35803f
    resource: repo://Makefile
  - id: openwiki-source-5b54a58d1b51cd490b0e7162
    resource: repo://package.json
  - id: openwiki-source-05ccef8d4cf1698187f20464
    resource: repo://pyproject.toml
  - id: openwiki-source-a7a923eb42c2ccc6f4c875de
    resource: repo://tests/agent/test_agent_assembly_context.py
  - id: openwiki-source-f0a6e7dc03522b2682f88655
    resource: repo://tests/conftest.py
  - id: openwiki-source-069ae2b497200c26ef2dc134
    resource: repo://tests/e2e/fake_llm.py
  - id: openwiki-source-8317f526f4e30c2659c8614e
    resource: repo://tests/e2e/fakes.py
  - id: openwiki-source-c484c171a84d342028bf0794
    resource: repo://tests/e2e/global-setup.ts
  - id: openwiki-source-aefe409f90608437573cbad3
    resource: repo://tests/e2e/harness.py
  - id: openwiki-source-16e94b1dfd40df68fa54c87f
    resource: repo://tests/e2e/package.json
  - id: openwiki-source-28a3fe2bdb4cd54e328962f0
    resource: repo://tests/e2e/patches.py
  - id: openwiki-source-859f98720585f4648f0f7b2e
    resource: repo://tests/e2e/playwright.config.ts
  - id: openwiki-source-4b944ec14a3d793a6f771403
    resource: repo://tests/e2e/playwright.desktop.config.ts
  - id: openwiki-source-7ef60dc4372e1a33c7728fe6
    resource: repo://tests/e2e/README.md
  - id: openwiki-source-86954185ec7b6e72d7a5a7a7
    resource: repo://tests/e2e/tests/desktop.spec.ts
  - id: openwiki-source-4cedab06aadc98083b348ddb
    resource: repo://tests/e2e/tests/full_flow.spec.ts
  - id: openwiki-source-ec3fbe14e1e05123704c4f28
    resource: repo://tests/reviewer/test_reviewer_outcomes.py
  - id: openwiki-source-f05d7497d4c60c3b322628eb
    resource: repo://tests/sandbox/test_sandbox_state.py
  - id: openwiki-source-a9842c19fa28878dfa7fcd61
    resource: repo://tests/webhooks/test_completion_webhook.py
  - id: openwiki-source-440ae1e215cb02721dda855c
    resource: repo://turbo.json
  - id: openwiki-source-436f4179fe22abf615d2f7d0
    resource: repo://ui/package.json
verified:
  - by: openwiki/0.4.2
    at: 2026-09-18T08:14:40.725Z
generated: { by: "openwiki/0.4.2", at: "2026-09-18T08:14:40.725Z" }
---

# Testing strategy and focused validation

Validate at the lowest layer that owns the changed **observable** contract. Start with one focused test or test file; do not run the full suite locally. Prefer deterministic assertions about outputs, persisted state, authorization, or user-visible effects over prompt snapshots, constants, internal call order, or source structure. Escalate to Playwright only when the behavior crosses the real webhook, authenticated UI, sandbox/git, or Electron boundary.

```mermaid
flowchart TD
    Change["Changed behavior"] --> Owner{"Owning boundary"}
    Owner -->|"Agent reviewer sandbox webhook"| Pytest["Focused pytest"]
    Owner -->|"Dashboard rendering or client state"| Vitest["Dashboard Vitest"]
    Owner -->|"Electron main process"| NodeTest["Desktop Node test"]
    Owner -->|"Real boundary crossing"| Playwright["Focused Playwright spec"]
    Pytest --> Gate["Relevant quality gate"]
    Vitest --> Gate
    NodeTest --> Gate
    Playwright --> Gate
```

This is the validation routing decision: select the narrowest test owner, then add only the independent check that the change requires.

## Python: behavioral contracts and isolation

Pytest collects `tests/` and uses asyncio auto mode, so asynchronous tests and fixtures need no per-test asyncio marker. The agent, reviewer, sandbox, webhook, dashboard/API, GitHub, Slack, middleware, and tools directories provide the usual focused boundary. The default Makefile target is `tests/`, but that is the whole Python suite: do not use it locally without narrowing `TEST_FILE`.

Agent assembly belongs in `tests/agent/test_agent_assembly_context.py`, which captures the arguments passed to `create_deep_agent`. It protects the initialized sandbox-backed composite backend that enables deepagents context eviction and summarization, the source- and visibility-sensitive skills/tools, and middleware and parent-tool boundaries. It also demonstrates the desired assertion style: verify the assembled behavioral capability rather than a prompt string or incidental construction sequence.

### Shared fixtures are deliberate test environment policy

`tests/conftest.py` makes ordinary unit tests independent of local processes and artifacts:

- `fake_store` routes all `agent.store` access through an in-memory `FakeStore`, but preserves the production `model_dump`/`model_validate` round trip. Seed it only when persistence is part of the behavior under test.
- Autouse fixtures point `DASHBOARD_STATIC_DIR` to a missing temporary location, clear the process-global TTL cache before and after every test, and clear sandbox backend/connection registries before and after every test. These prevent a built dashboard, cached workspace settings, or a live sandbox handle from leaking across cases.
- The default auto-review fixture returns enabled for all repositories because the dashboard opt-in list would otherwise be empty without a live Store. A test of the real opt-in gate must replace that stub with its intended policy.
- `registry_db` uses `TEST_ANALYTICS_POSTGRES_URI` to create, migrate, and drop a unique PostgreSQL schema; it skips if the variable is absent. `registry_db_if_available` instead supports code that deliberately degrades when PostgreSQL is unavailable.

### Choose the owner that carries the failure semantics

| Change | Focused location and contract |
| --- | --- |
| Main-agent backend, skills/tools, middleware, model routing, or source/visibility policy | `tests/agent/test_agent_assembly_context.py`; protects initialized `CompositeBackend`/`SandboxBackendProxy` wiring, read-only skill routes, conditional exposure, and parent/subagent separation. |
| Reviewer finding outcomes or feedback learning | `tests/reviewer/test_reviewer_outcomes.py`; maps resolved versus dismissed findings and GitHub/Slack feedback to true/false-positive outcomes, while missing credentials or repository configuration is a no-op. |
| Lazy sandbox reconnect, output capture offload, timeout defaults, or sandbox identity recovery | `tests/sandbox/test_sandbox_state.py`; protects `BaseSandbox` compatibility, delegation or safe fallback, one shared reconnect, cancellation-safe waiting, retry after startup failure, and metadata recovery. |
| Completion status, Slack failure replies, reviewer check cleanup, usage, or deduplication | `tests/webhooks/test_completion_webhook.py`; checks terminal error paths at the notification boundary, including missing metadata/token and cleanup failures. |

## Focused commands and separate gates

Install the Python development set with `make install`, which runs `uv sync --extra dev`; that extra contains pytest, pytest-asyncio, Ruff, ty, and Pygments. `make test` and `make tests` run `uv run pytest -vvv $(TEST_FILE)` only if `TEST_FILE` is an existing file or directory; otherwise they print a skip message. Therefore pass a test path to Make, and use pytest directly for a node id.

```bash
make install
make test TEST_FILE=tests/sandbox/test_sandbox_state.py
uv run pytest -vvv tests/sandbox/test_sandbox_state.py::test_sandbox_proxy_retries_failed_startup
make lint
make typecheck
```

Tests are not substitutes for static gates: `make lint` runs Ruff check plus a Ruff format diff; `make format` applies Ruff formatting and fixes; and `make typecheck` runs `ty check agent tests`.

For a dashboard component/client change, run its workspace test rather than root `pnpm test`; root test delegates workspace `test` tasks to Turbo. For Electron main-process changes, use the desktop workspace test, which builds the main bundle then runs Node's test runner.

```bash
pnpm --filter open-swe-dashboard run test
pnpm --dir desktop run test
```

The dashboard command is `vitest run`; the desktop command ultimately runs `node --test test/*.test.cjs`. Keep browser E2E for behavior that these unit-level scopes cannot establish.

## Playwright: real paths with controlled external seams

The E2E harness is an integration test environment, not a fake agent. It runs the real agent through `langgraph dev`, real webhook routes, deepagents/tools/middleware, a real local-provider sandbox in a temporary directory, and real git against a seeded local bare remote. It substitutes the LLM with a scripted `BaseChatModel`, external GitHub/Slack HTTP and credential boundaries, and the snapshot service. In-memory fake Slack/GitHub stores are rendered by mock UIs, so a browser assertion observes the state the real agent wrote.

```mermaid
sequenceDiagram
    participant PW as Playwright
    participant Slack as Fake Slack UI
    participant Harness as E2E harness
    participant API as Real webhook API
    participant Agent as Real agent graph
    participant Git as Local sandbox and git
    participant Hub as Fake GitHub API
    PW->>Slack: Submit request
    Slack->>Harness: Simulate signed event
    Harness->>API: POST Slack webhook
    API->>Agent: Dispatch run
    Agent->>Git: Edit commit and push branch
    Agent->>Hub: Create pull request
    Agent->>Slack: Post thread reply
    PW->>Slack: Assert reply and pull request link
```

This shows the focused browser happy path: the external interfaces are controllable, while the production webhook, graph, sandbox, git, and output behavior remain live.

The harness overlays the real `agent.webapp` application with fake GitHub/Slack endpoints, mock UIs, and control endpoints. Its Slack and GitHub controls sign deliveries before posting them to the real webhook routes, so signature validation and route handling are covered. `full_flow.spec.ts` uses this environment for the Slack request → local implementation → PR → same-thread reply path.

### Dashboard and desktop boundaries

Browser E2E drives the real built dashboard rather than a static or mocked UI. Global setup builds `ui/` with the harness configured as its server-side API/proxy target, starts the resulting Nitro server, and Playwright uses that UI-server origin. This covers SSR, the session gate and redirects, hydration, and same-origin `/dashboard/api/*` proxy calls with a genuine signed session cookie. Set `E2E_FORCE_UI_BUILD=1` after a UI or port change to rebuild instead of reusing the built server.

The browser configuration is serial, excludes `desktop.spec.ts`, and uses a 90-second test timeout. Its desktop configuration selects only `desktop.spec.ts`, uses a 180-second test timeout and a longer expectation timeout, and writes distinct reports/results. The Electron spec resets harness state, clones the seeded remote into an isolated temporary project, injects a harness-issued `osw_session` cookie, makes a local-agent request, and checks both the local edit and fake-GitHub PR fields.

```bash
pnpm install --frozen-lockfile
pnpm run test:e2e:install
pnpm exec playwright test tests/full_flow.spec.ts
pnpm run test:e2e:desktop
```

Install Chromium before the first browser run. The E2E backend also requires `POSTGRES_URI`; see `tests/e2e/README.md` for the local throwaway PostgreSQL setup. Prefer a single spec against the locally reused warm server over the entire E2E suite.

## Diagnosing E2E failures

Browser runs retain screenshots on failure and retain trace/video on failure locally or on the first retry in CI. `E2E_ARTIFACTS=1` captures trace and video for every attempt under `test-results/` and `playwright-report/`. Desktop intentionally disables Playwright's automatic media because the spec starts an Electron trace and attaches screenshots for the unified and completed local-agent views; it removes its temporary state unless `E2E_KEEP_TMP` is set.

```bash
pnpm exec playwright show-report
pnpm exec playwright show-trace test-results/<test>/trace.zip
SLOW_MO=700 pnpm exec playwright test --headed
```

Inspect the trace, screenshot, and fake-boundary state before increasing a timeout or weakening an assertion.

## Related pages

- [Agent graph](/openwiki/architecture/agent-graph.md)
- [Sandbox lifecycle](/openwiki/architecture/sandbox-lifecycle.md)
- [Dashboard UI](/openwiki/integrations/dashboard-ui.md)
- [Quickstart](/openwiki/quickstart.md)
- [Invocation workflow](/openwiki/workflows/invocation.md)
