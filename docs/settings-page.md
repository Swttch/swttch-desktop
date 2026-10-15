# Desktop settings

The account button at the bottom of the activity rail opens the shared Tippy dropdown. Account, plan, and settings actions navigate to the corresponding settings page. The settings action restores the last visited category in this browser or app profile.

The shell owns `/settings/*`. Its settings sidebar supports category search, including keywords such as model, notifications, and clock. Categories have direct URLs and browser history. Unknown categories redirect to General. The activity rail and status bar remain visible, while retained workspace views stay mounted and inert. Returning restores the previously visited work or project page; a direct settings entry returns to Work.

General provides the existing clock preferences, synchronized with the status bar and its quick settings. Shortcuts displays the current host-specific bindings. App information uses the package version at build time. Agent settings reuse the authenticated CCG settings application, including its scope controls and category navigation, rather than duplicating its business logic. Native shell categories and embedded CCG settings are distinguished by the existing workingDir, pair, and is_desktop parameters in both development and the built host.

Scordi account and plan pages explicitly show that integration is pending. They do not assert a logged-in identity, subscription, entitlement, or payment capability. No Scordi usage allowance is defined.

Validation on 2026-10-15: navigation and embedded-account routing tests were run failing before implementation; a production-host HTTP integration test was added afterward. The full suite passed with 102 tests. Browser verification covers account-menu entry, direct settings reload, category navigation and history, keyword search, existing agent-settings loading, immediate clock updates, and retention of all five existing iframe views plus an unsent draft across settings navigation. The temporary draft was cleared after verification. Native Electron integration remains unverified.


## Settings surfaces and pending controls

The settings shell uses a persistent category column, pill search field, grouped Personal and Integrations navigation, a centered content column, and divided setting rows with compact selectors and switches. The title bar provides back and forward navigation. The date/time controls share the existing clock preferences and update the status bar immediately.

Unimplemented categories remain visible as disabled buttons and remain discoverable through search. General includes disabled placeholders for permission policy, projectless work folders, default file opening, UI language, menu-bar behavior, window-close confirmation, overview mode, and status-panel visibility. These placeholders do not change runtime permissions or add supported capabilities.

The account dropdown includes the guest account header, plan management, disabled pet/invitation actions, settings, a nested help panel, and disabled logout. The nested panel uses the shared Tippy dropdown with parent-preserving submenu behavior. Only keyboard shortcuts and the existing user guide are active in that panel. No personal identity or paid plan is inferred from an agent account.

Additional verification: the visible-disabled category test was run failing before implementation, then passed. Browser checks verified disabled search results, both submenu levels remaining visible, submenu selection dismissing both levels, navigation to shortcuts, back/forward availability, and the redesigned clock switch updating the status bar. The original clock value was restored after testing.

## Shared shell and sidebar

Home and settings render inside the same App shell: title bar, activity rail, sidebar container and resize separator, workspace container, and StatusBar. Only sidebar navigation and page content change by route. Settings keeps its back/forward actions in the shared title bar.

The shared sidebar toggle and Shift+Cmd+S / Ctrl+Shift+S work on both routes, including inside embedded agent settings. Collapse state and the saved sidebar width carry across navigation. Both routes use SidebarResize and useSidebarWidth with the same 196–480px limits, pointer dragging, arrow-key adjustment, and local storage. Settings does not override the width at narrow breakpoints.

Verification: shell behavior and embedded-settings shortcut regressions failed before their fixes. All 104 tests and the build passed. Browser checks covered settings drag resizing, button collapse, shortcut expansion, and width preservation when navigating to Home and back. The original width was restored. Changes remain pending review and commit.

## Device settings persistence and state

Device settings are stored in the existing SQLite database through a Drizzle repository. Schema version 11 adds the device_settings table. GET /desktop-api/settings reads a revisioned snapshot; PATCH accepts validated partial clock, sidebar, and sidebarSections changes. Existing session, origin, and CSRF checks apply. Invalid patches leave the record unchanged. Transactions preserve independent writes from multiple local service processes.

The existing authenticated workspace event stream includes the settings snapshot. Each local service also checks the shared record revision every 250ms to detect writes from another service process. Electron and localhost browsers therefore share the same device settings even when they use separate local services.

A Zustand store holds the applied values. Items use selectors to subscribe directly, and all writes use one shared update action. Local edits apply immediately and are serialized through the mutation transport. Pending edits are rebased over confirmed server snapshots; a failed write is removed without undoing unrelated or newer edits. Stale revisions are ignored. Fetches and writes use the existing QueryClient transport, while the applied settings state belongs to Zustand.

Clock preferences, sidebar width and collapse, and sidebar section expansion use this store. On first initialization only, valid legacy localStorage values are imported. The first client to initialize the device record wins; later clients never overwrite that record with their old browser-local preferences. Legacy keys are retained for recovery but no longer written. Last settings route and other navigation state remain browser-local.

Native settings pages follow settings/README.md: Setting/index.tsx → Section/index.tsx → individual SettingItem.tsx. Items own their copy, subscriptions, actions and control composition. The status clock quick settings reuse the same DateTimeSection and setting items. Unimplemented controls remain disabled and dimmed.

Verification: repository persistence/validation, optimistic store rebasing and rollback, cross-service notification, and legacy migration tests were written failing before their implementations. HTTP authentication/CSRF and cross-client event tests were added after the API implementation. Shell integration coverage was updated for Zustand and the extracted agent settings page. The final suite and build results are recorded in the private task log. The restarted browser rendered the migrated General page, but additional browser interactions were blocked by the browser tool security policy; Electron UI validation could not reliably identify the target among multiple Electron instances. Do not treat native cross-window UI behavior as verified.

Follow-up native verification on 2026-10-15: explicitly selecting the live localhost tab resolved the earlier stale-tab access problem. The actual Electron account menu opened Settings. Toggling clock seconds in Electron updated the browser without reloading, and the value survived a browser reload. Toggling it back in the browser updated Electron. The native sidebar shortcut collapsed both clients, and the browser toggle expanded both. Original values were restored. A branded app restart restored the saved width and clock preference. Evidence: `artifacts/settings-page/electron-verified.jpg`, `browser-sync-verified.png`, and `swttch-native-final.jpg`. Native pointer-drag attempts did not establish a changed width, so they are not recorded as passing resize verification.
