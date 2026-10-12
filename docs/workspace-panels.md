# Workspace panels and tabs

Approved and implemented on 2026-10-12, extending the original single-panel MVP.

## Ownership

The workspace is a binary split tree. A leaf panel owns its ordered chat tabs and selected tab; a split owns its direction, ratio, and two children. Each tab has a stable view ID, its own application URL, session metadata, and optional display-name override. Session metadata is not the tab's identity.

Iframe instances are rendered in a stable flat layer keyed by view ID. Panel viewport rectangles position them without moving their DOM ownership. Inactive tabs remain mounted and hidden. Selecting tabs, splitting panels, and resizing therefore preserve drafts and application state.

The first panel's tab strip aligns with the Desktop title bar. Nested panels have their own strips, using the same header-height token. Focusing a view updates the active panel and the title bar's selected project. Each iframe owns its session URL; backend events do not replace it.

## Operations

- New chat opens a new tab in the active or explicitly targeted panel.
- Opening an already-open session selects its existing tab rather than creating another tab.
- The context menu can close the current tab, the other tabs, or the tabs to its right within that panel.
- Left/right and top/bottom splits open another view of the selected chat in a new sibling panel. Existing views stay mounted. Recursive splits are supported.
- Split separators support pointer dragging and arrow keys, with a 15–85% ratio range.
- Closing the last tab in a split panel removes that empty panel and collapses its parent split. Closing the final workspace tab leaves an empty root panel and clears the legacy restore target.
- Custom tab names, activity rings, and existing application context-menu actions remain attached to the correct view.

The active-session save endpoint accepts the registered project ID alongside the session ID. It verifies that the session belongs to that project before updating the legacy last-view restore context.

## Verification and limits

Renderer build and 63 backend/layout tests passed, including panel-scoped selection/closure, nested split collapse, ratio bounds, and cross-project active-view validation. Browser checks covered real CLI replies in two separate sessions (`MULTITAB_A_OK`, `MULTITAB_B_OK`), tab-switch draft preservation, unchanged iframe instance IDs after splits and sibling closure, nested column/row splits, real separator dragging, scoped close-right/close-other actions, and the empty-workspace add-project entry point.

The complete split tree and all open tabs are currently in-memory. Reload/startup retains the existing last-view restore behavior rather than restoring the entire layout. Tab/panel drag movement and full layout persistence remain TODO 25. Terminal and other application types remain TODO 26. Electron was not launched for this browser-equivalent UI work.

Closing the focused tab selects the most recently focused surviving view across panels. Each panel also retains its own most-recently-used selection history. Closing background tabs preserves the current selection and keyboard focus; removed IDs are pruned from history.

Verification: with three tabs open, the second tab was focused, then the third; native Option+W closed the third and selected the second while the first remained unselected. Layout tests cover repeated MRU closure and background-tab closure.
