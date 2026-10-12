# Swttch Desktop Agent Instructions

Read and follow the [core principles](docs/core-principles.md) before starting work.
For frontend work, also read the [design system](DESIGN.md) and [UI playbook](docs/design-playbook.md). Use Tailwind utilities and shared tokens.

- Use TDD (Red → Green → Refactor) for new behavior and bug fixes. Write and run a meaningful failing behavior test before implementation, then implement, verify, and refactor while green. Cover regressions without mirroring implementation. For visual-only changes, establish acceptance criteria and observe the failing UI before editing, then verify the actual result. Distinguish test-first work from tests added afterward; never claim retrospective TDD.

- Before every implementation, including minor changes, check the personal backlog at `ignore/할일.md` and add a task if none exists. Keep this private, Git-excluded document in Korean.
- After implementation, verification, and the task's commit are complete, mark its backlog item complete and record the commit and verification evidence. Leave implemented but uncommitted items unchecked with an explicit pending status.
- When all children of a backlog item are complete, tell the user and ask whether to mark the parent complete. Check the parent only after an explicit answer; never infer approval from completed children.

- Use English for public documentation, commit messages, code comments, issues, and pull requests. Localized product copy belongs in i18n resources. Preserve existing commit history.
- The base html/body font size is 14px. Use Tippy for shared tooltips and react-hot-toast for shared toasts.
- Implement all dropdowns with Tippy. Do not replace it with manual positioning and global outside-click listeners. Use the shared `Dropdown.tsx` for new dropdowns and preserve outside-click dismissal, Escape dismissal, and mutually exclusive opening.
- Preserve existing hover and focus tooltips when refactoring to click dropdowns. Tooltips and dropdowns coexist as separate Tippy instances; showing a tooltip must not close an open dropdown.

- Use the same React + TypeScript frontend and local Node.js backend in Electron and localhost browsers.
- Shared features must actually work in browsers. Electron-only preload dependencies or browser mocks do not establish completion of shared functionality.
- Perform routine frontend implementation, execution, and verification in the Codex browser on localhost. Verify Electron-specific integrations separately in the native app.
- Use the desktop package's npm scripts: `npm run dev` (Electron development), `npm run dev:browser` (browser), `npm start` (normal app), `npm run build`, and `npm test`. Use `npm run runtime:build` to invoke the parent repository's official build script for the CCG runtime.
- Reuse the existing chat app and backend. Do not duplicate CLI or session business logic in the shell.
- Each workspace panel owns its tab list and selected tab. Tabs host independent applications; a chat session is not a tab entity. The approved scope includes multiple chat tabs and nested horizontal/vertical splits. Keep mounted views alive when changing tabs, splitting, or resizing.
- The project title bar ends at the sidebar boundary. Panel-local tab strips occupy the workspace area to its right. Keep the left rail and use `⇧⌘S` to toggle only the middle project/session sidebar.
- Implement navigation with React Router through `useRouter()` and `router.push(PATH.*)`. Define path literals in `src/paths.mjs` and import them through `renderer/src/routes.ts` in the frontend. Substitute route parameters with the shared `replacePathParams` helper.

- Use the Drizzle ORM schema and repositories for SQLite data access. Restrict raw SQL to schema-upgrade DDL. Import projects only from `~/.claude-code-gui/entities/project/projects.entity.jsonl` and never modify the original file.

- Manage frontend HTTP reads and writes with TanStack Query (`useQuery`/`useMutation`). Do not duplicate server state in separate React state. Update the Query cache when SSE events arrive. Reuse the embedded chat's existing WebSocket implementation.
- Follow RESTful API conventions in the backend: resource-oriented routes, GET for reads, POST for creation, PUT for full replacement, PATCH for partial updates, and DELETE for deletion. Keep shared route constants in `src/api-paths.mjs`.

- Reserve the shell URL for app and project navigation. Each work view's iframe manages its own session URL; use the plural resource name `sessions`. Pass the project ID to the session-opening API, resolve its path from the database in the backend, and always include `workingDir` in the iframe URL.
