# First workspace tab

The existing single workspace panel now exposes its embedded chat application as one visible tab. This follows the planning relationship: panel area → panel → tab → independent application. The tab hosts the chat web app; it is not a chat session entity. Switching sessions updates the same tab's label and view URL.

The tab strip starts at the sidebar boundary. The tab shows the Claude provider icon, the embedded document's session title, a selected state, a title tooltip, and a close control. Selecting it returns from project navigation to the existing mounted chat view. Multiple tabs and split panels remain future work; each future panel must own its tab list and selected tab.

Closing calls the authenticated, CSRF-protected `DELETE /desktop-api/workspace` endpoint. It clears the client's view and, for Desktop clients, its persisted workspace restore target. It does not delete chat history, stop the agent, or close other clients' views.

Verification: renderer build and 60 backend tests passed. The restore test now also covers rejected close attempts with a forged CSRF token, view closure, persisted closure, and isolation from another client. Browser checks covered an existing session's title, returning from project navigation, closure, and reload after closure. Electron was not launched.
