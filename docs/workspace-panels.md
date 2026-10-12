# Workspace panels and tabs

Approved and implemented on 2026-10-12, extending the original single-panel MVP.

## Ownership

The workspace is a binary split tree. A leaf panel owns its ordered application tabs and selected tab; a split owns its direction, ratio, and two children. Each tab has a stable view ID, its own application URL, session metadata, and optional display-name override. Session metadata is not the tab's identity.

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

## Tab drag and drop

React DnD's HTML5 backend owns tab-strip drags. Each tab can be dropped before or after another tab, or at the end of a different panel's strip. A one-pixel insertion marker shows the position; overflowing strips scroll near their edges. Hover does not mutate the layout, so cancelled drags leave it unchanged. Moving the last tab out of a panel collapses that panel's split. The destination selects the moved tab, and focus history follows the existing view ID.

Tab transfers move the existing view rather than creating a session or iframe. The flat keyed iframe layer stays mounted; iframe pointer targeting is temporarily disabled during a drag so embedded pages cannot swallow its events. Close controls, context menus, tooltips, and keyboard shortcuts retain their behavior.

Native Codex browser dragging verified both order directions within one panel, transfers between nested row/column panels, last-tab panel collapse, unchanged iframe instance IDs, and preservation of a natively typed unsent draft. The verification draft was removed without sending it. Native Electron was not launched. Complete layout persistence remains deferred.

## Drag to create a panel

During tab dragging, each panel body becomes a React DnD drop target. Its outer quarter regions choose the nearest normalized edge, and a half-panel preview shows the proposed left/right/top/bottom split. The center transfers the tab into the existing panel. Tab-strip insertion targets retain their existing ordering behavior.

Dropping on an edge creates a sibling panel containing the same view ID and places it before the target for left/top or after it for right/bottom. The original tab is removed from its source; an emptied source collapses. Dropping a panel's only tab on its own edge is ignored, avoiding an empty self-split. Layout mutation happens only on drop, not while hovering.

Native browser verification covered all four edges, new column/row splits, source-panel collapse, rejection of single-tab self-splits, and preservation of the iframe instance ID and a natively typed unsent draft across successive transfers. The test draft was removed without sending it. Strict build and all 72 tests passed. Native Electron was not launched.

The panel drop placeholder has no border. Its geometry and opacity transition over 150 ms with ease-out; it stays mounted throughout the drag so edge changes interpolate rather than recreate the preview. Reduced-motion preferences disable the transition.

Panel separators render a 1 px divider at the same color/opacity as the workspace/sidebar boundary, with an invisible expanded pointer hit area for resizing. The development highlight belongs to the app root and spans the complete viewport above both title bar and panel tabs.

## New tab chooser and collapsed sidebar

The panel plus button opens a shared Tippy dropdown, with a separate hover tooltip labeled “새 탭 열기”. Chat and terminal choices are enabled; the browser choice retains its icon but is disabled and marked as upcoming. Opening the chooser does not create a tab. Choosing chat closes the menu and creates one chat in that panel. The redundant new-chat button in the project title bar is removed.

When the sidebar is collapsed, the top-left panel view clips its iframe at the same radius as the workspace corner, connecting the icon rail and tab bar smoothly. Other split-panel corners remain unchanged. The status-bar usage refresh icon uses the existing small size, preserving its pointer target.

The chooser's tests were written first and confirmed failing against the previous direct-chat control; implementation then made them pass. Native browser checks covered opening without creating a tab, disabled upcoming choices, one chat created on selection, Escape/outside dismissal, title-bar button removal, the collapsed corner, and the smaller refresh icon. Build and all 74 tests passed.

## Work page and routed pages

The workspace is the Work page and appears only at the exact root pathname (`/`). Other routed pages replace the entire right-hand content area, including the former tab-strip space. The Work page is kept mounted but hidden and inert while another page is active, so panel layout, selected tabs, embedded app instances, terminal processes, and subscriptions survive navigation.

Hidden work views do not execute close, refresh, rename, favorite, movement, or split shortcuts. Shared help/settings/sidebar shortcuts and explicitly opening a new chat remain available. Workspace Tippy menus close when leaving the Work page.

TDD regression tests first failed for non-root visibility and hidden-work command execution, then passed. Browser verification covered Projects and project detail pages, zero visible work tab strips, page content starting at the top of the right-hand viewport, retained view IDs, and a terminal command finishing across navigation. Full browser reload restoration is a separate feature.
