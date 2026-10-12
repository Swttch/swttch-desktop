# Terminal tabs

Implemented in the working tree and intentionally left uncommitted for user review.

The new-tab chooser opens a real terminal in the panel's project. Node.js owns a `node-pty` login shell, using the registered project's database path as its working directory. The browser/Electron renderer uses xterm.js and FitAddon, loaded only when a terminal view is needed. No Electron-only IPC or mock shell is required.

Terminal resources are bound to the authenticated browser session. Creation, input, resize, and deletion require the existing CSRF token; other clients cannot read or operate them. Output uses an authenticated same-origin SSE stream with bounded replay and event IDs. Commands and escapes are passed unchanged to the PTY. Empty or disconnected resources are reclaimed after a 30-second reconnect grace period, and host shutdown stops owned shells.

Terminal views retain their ID and process while changing tabs, dragging to another panel, or moving into a new split. Closing a terminal deletes only that resource. Splitting a terminal via the existing open-in-split commands creates a separate shell. A terminal refresh redraws/fits its view without restarting its shell. Rename remains a local view name; chat-only actions are disabled. Full workspace restoration and terminal process recovery after host restart remain future work. Browser tabs remain unavailable.

## Verification

Test-first coverage includes resource routes and access boundaries, the enabled terminal menu choice, output replay/resume, sibling isolation, resizing, disconnect reclamation, and safe cleanup after a process has already disappeared. The missing routes and disabled menu tests failed before implementation; regression cleanup tests also failed before their fixes.

Strict build and all 83 tests passed. In the browser, a real login shell printed its registered project path, executed commands, survived chat/terminal tab switches and drag-to-split movement with its original terminal ID, reported fitted rows/columns with `stty size`, and interrupted `sleep 30` with Ctrl+C. Closing one of two terminals returned HTTP 204 while the sibling still executed a command. No test command created project files. Native Electron and Windows/Linux were not launched.
