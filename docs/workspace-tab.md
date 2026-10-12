# First workspace tab

The subsequent multi-tab and split-panel implementation supersedes the single-panel limitation below. See [Workspace panels and tabs](workspace-panels.md) for current behavior and verification.

The existing single workspace panel now exposes its embedded chat application as one visible tab. This follows the planning relationship: panel area → panel → tab → independent application. The tab hosts the chat web app; it is not a chat session entity. Switching sessions updates the same tab's label and view URL.

The tab strip starts at the sidebar boundary. The tab shows the Claude provider icon, the embedded document's session title, a selected state, a title tooltip, and a close control. Selecting it returns from project navigation to the existing mounted chat view. Multiple tabs and split panels remain future work; each future panel must own its tab list and selected tab.

Closing calls the authenticated, CSRF-protected `DELETE /desktop-api/workspace` endpoint. It clears the client's view and, for Desktop clients, its persisted workspace restore target. It does not delete chat history, stop the agent, or close other clients' views.

Verification: renderer build and 60 backend tests passed. The restore test now also covers rejected close attempts with a forged CSRF token, view closure, persisted closure, and isolation from another client. Browser checks covered an existing session's title, returning from project navigation, closure, and reload after closure. Electron was not launched.

## Activity and context menu

Running session activity from the existing backend subscription shrinks the provider icon and spins a ring around it. Idle, completed, and awaiting-input states do not spin; reduced motion disables the animation.

Right-click or Shift+F10 opens the tab's Tippy context menu. It supports a custom tab display name (and reverting to the automatic session label), scheduled messages, background tasks, remote tunnel, assets, and closing the tab. Renaming affects the current tab's display name only, not the session's stored title. The override lasts for the mounted tab, including session changes, and is not persisted across reloads yet.

Application actions use a same-origin, owning-frame message contract and reuse the webview's existing dock actions. Acknowledgments detect unavailable actions instead of silently treating them as successful. The listener lives on the chat page and remains mounted when the visual webview header is hidden.

Verification: Desktop and webview builds passed. The webview boundary test rejects foreign origins/sources and unsupported actions, verifies all four supported commands, and verifies cleanup. Browser checks covered renaming, all four actual surfaces, Escape dismissal, and a real demo agent response: the running ring appeared during work and disappeared after `TAB_SPINNER_OK`.

For created chat sessions, rename uses the same CLI-backed session API as the sidebar. Shared session queries supply titles to every open view, including split clones. The rename dialog stays open with its input and error if saving fails. Uncreated chats retain a temporary tab label until a session exists. Project trust is never approved implicitly.

Verification: Command+E on the browser-demo session reached the CLI adapter and reproduced the existing project-trust error, leaving the edited value and dialog intact. A trusted CLI save was observed in its JSONL and restored to its previous custom title afterward. CLI custom titles now take priority over legacy plugin aliases; legacy alias files remain unchanged. API tests verify successful source synchronization and rejected trust errors without changing saved titles.
