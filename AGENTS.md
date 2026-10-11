# Swttch Desktop Agent Instructions

Read and follow the [core principles](docs/core-principles.md) before starting work.
For frontend work, also read the [design system](DESIGN.md) and [UI playbook](docs/design-playbook.md). Use Tailwind utilities and shared tokens.

- Use English for public documentation, commit messages, code comments, issues, and pull requests. Localized product copy belongs in i18n resources. Preserve existing commit history.
- The base html/body font size is 14px. Use Tippy for shared tooltips and react-hot-toast for shared toasts.
- Implement all dropdowns with Tippy. Do not replace it with manual positioning and global outside-click listeners. Use the shared `Dropdown.tsx` for new dropdowns and preserve outside-click dismissal, Escape dismissal, and mutually exclusive opening.
- Preserve existing hover and focus tooltips when refactoring to click dropdowns. Tooltips and dropdowns coexist as separate Tippy instances; showing a tooltip must not close an open dropdown.

- Use the same React + TypeScript frontend and local Node.js backend in Electron and localhost browsers.
- Shared features must actually work in browsers. Electron-only preload dependencies or browser mocks do not establish completion of shared functionality.
- Perform routine frontend implementation, execution, and verification in the Codex browser on localhost. Verify Electron-specific integrations separately in the native app.
- Use the desktop package's npm scripts: `npm run dev` (Electron development), `npm run dev:browser` (browser), `npm start` (normal app), `npm run build`, and `npm test`. Use `npm run runtime:build` to invoke the parent repository's official build script for the CCG runtime.
- Reuse the existing chat app and backend. Do not duplicate CLI or session business logic in the shell.
- Preserve the MVP scope of one panel and one tab.
- Hide the outer tab bar by default. Keep the left rail and use `⇧⌘S` to toggle only the middle project/session sidebar.
- Implement navigation with React Router through `useRouter()` and `router.push(PATH.*)`. Define path literals in `src/paths.mjs` and import them through `renderer/src/routes.ts` in the frontend. Substitute route parameters with the shared `replacePathParams` helper.

- Use the Drizzle ORM schema and repositories for SQLite data access. Restrict raw SQL to schema-upgrade DDL. Import projects only from `~/.claude-code-gui/entities/project/projects.entity.jsonl` and never modify the original file.

- Manage frontend HTTP reads and writes with TanStack Query (`useQuery`/`useMutation`). Do not duplicate server state in separate React state. Update the Query cache when SSE events arrive. Reuse the embedded chat's existing WebSocket implementation.
- Follow RESTful API conventions in the backend: resource-oriented routes, GET for reads, POST for creation, PUT for full replacement, PATCH for partial updates, and DELETE for deletion. Keep shared route constants in `src/api-paths.mjs`.

- Reserve the shell URL for app and project navigation. Each work view's iframe manages its own session URL; use the plural resource name `sessions`. Pass the project ID to the session-opening API, resolve its path from the database in the backend, and always include `workingDir` in the iframe URL.
