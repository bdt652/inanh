# Repository Guidelines

## Project Structure & Module Organization
- Monorepo layout:
  - `apps/web`: Next.js App Router, TypeScript, ESLint, pnpm.
  - `apps/api`: FastAPI with virtualenv at `apps/api/.venv`.
- Root: `docker-compose.yml` (MongoDB + MinIO dev), `.env.example`, `.gitignore`, and `README.md` with Windows PowerShell steps.
- Keep shared docs/scripts at root (for example `docs/`, `scripts/`) and avoid cross-imports between apps.
- Keep generated/runtime files out of git (`.next`, caches, logs, virtualenvs, `node_modules`).

## Working Rules (Required)
- Make minimal, scoped changes. Do not refactor unrelated modules in the same PR.
- Preserve backward compatibility for existing API routes unless the PR is explicitly breaking.
- Keep behavior deterministic: avoid hidden side effects in startup code and route handlers.
- Do not add new dependencies unless there is a clear need and justification in the PR description.
- Update tests/docs together with behavior changes; do not merge behavior-only changes without verification.

## Build, Test, and Development Commands
- Start infra: `docker compose up -d` from repo root.
- Web:
  - `pnpm -C apps/web install`
  - `pnpm -C apps/web dev`
  - `pnpm -C apps/web lint && pnpm -C apps/web build`
- API (PowerShell):
  - `python -m venv .venv` in `apps/api`
  - `apps/api/.venv/Scripts/Activate.ps1`
  - `pip install -r requirements.txt`
  - `uvicorn app.main:app --reload --host 0.0.0.0 --port 8000`

## Definition of Done
- Web change:
  - `pnpm -C apps/web lint`
  - `pnpm -C apps/web build`
- API change:
  - `ruff check apps/api`
  - `pytest apps/api`
- Integration change (API + DB):
  - `docker compose up -d`
  - verify `GET /health` and affected endpoints manually.
- Docs/config change:
  - update `README.md` and/or `.env.example` if setup/runtime behavior changed.

## Coding Style & Naming Conventions
- TypeScript: follow ESLint in `apps/web`.
- Python: `ruff` is required in `apps/api`.
- Indentation: 2 spaces for TS/JSON, 4 spaces for Python; file names in `kebab-case`, React components `PascalCase`, Python identifiers `snake_case`.
- Keep route handlers thin; move business/data logic into dedicated functions/modules.
- Add explicit type hints for Python public functions and TypeScript exported APIs.
- Prefer small, composable functions over large handlers/components.

## Testing Guidelines
- Frontend checks: `pnpm -C apps/web lint && pnpm -C apps/web build`.
- Backend checks: `ruff check .` and `pytest` in `apps/api`.
- Tests: `*.test.ts(x)` for web, `test_*.py` or `*_test.py` for API. Add integration tests when behavior depends on MongoDB.
- New API endpoint rule: add at least
  - one success test (`200`/`201`)
  - one failure-path test (validation, not found, or dependency failure).

## API & Database Conventions
- Base path: `/api/v1`. Health check: `GET /health` returns `{"ok": true}`.
- CORS: allow `http://localhost:3000`.
- MongoDB uses Motor (async).
- Endpoints:
  - `GET /api/v1/ping`
  - `GET /api/v1/products` (read from MongoDB)
  - `POST /api/v1/products` (create demo product)
- Do not expose Mongo `_id` directly; serialize to string `id`.
- Keep response schemas stable; avoid ad-hoc field renaming without migration notes.
- Use explicit HTTP status codes (`201` for create, `400/404/409` where appropriate).

## Commit & Pull Request Guidelines
- Use Conventional Commits (`feat:`, `fix:`, `docs:`, `chore:`).
- PRs should include a concise summary, linked issue (if any), and screenshots for UI changes.
- Keep PRs small and reviewable; split large work into multiple PRs.
- Include test evidence in PR body (commands run and their outcomes).

## Security & Configuration Tips
- Do not commit secrets; use `.env` locally and keep `.env.example` current.
- Update `README.md` when PowerShell steps or required env vars change.
- Validate all environment variables at startup (`pydantic-settings` in API).
- Never log secrets, tokens, connection strings, or raw credentials.

## Project Discipline
- Limit individual files to ~300 lines; split logic (components, helpers, routes) early to keep each file readable.
- Use clear public interfaces for API modules so frontend teams call `apiClient.<verb>()` directly; favor small wrappers over ad-hoc fetch logic.
- Centralize shared DTOs/configs near entry points (e.g., `apps/api/app/api/v1/schemas.py`) and import them, avoid duplicate models.
- Always include request validation (Pydantic model) before business logic; return uniform responses (`status`, `data`, `error`).
- Keep API integration deterministic: mock dependencies in tests, document external contracts, and prefer a single source for base URLs/headers.
