# Desktop shortcuts

Desktop owns keyboard shortcuts in its shell and embedded application windows. The capture-phase listener consumes matched events with `preventDefault`, `stopPropagation`, and `stopImmediatePropagation` before executing actions. Each embedded listener is disposed with its tab; the owning view ID is validated against the live layout. Holding close/split/favorite keys does not repeatedly operate on additional tabs. The close-event test removes the listener inside the callback and verifies that the original event still never reaches another handler.

macOS uses Command. Windows/Linux use Control. Tab navigation is Command+Option+Left/Right on macOS and Control+Alt+Left/Right elsewhere. Panel navigation is Control+Option+Command+arrows on macOS; Control+Alt+Shift+arrows elsewhere, avoiding the duplicate-Control ambiguity. Panel navigation uses spatially overlapping neighbors rather than jumping diagonally.

Implemented commands: split columns (Mod+D), split rows (Mod+Shift+D), rename tab (Mod+E), close tab (Mod+W in Electron, Option/Alt+W in browsers), session favorite (Mod+B), Desktop help (Mod+/), settings (Mod+,), new chat (Mod+N), and sidebar visibility (Mod+Shift+S). Matching uses physical key codes for letter shortcuts, with composition protection. Menu hints use platform-appropriate symbols.

Favorites reuse the session repository, API, and existing sidebar favorites. An uncreated new chat has no session to favorite; the menu is disabled until its first message creates a session. Requests are serialized per session and the shared query cache updates every view of that session.

Desktop help opens a separate host dialog rather than the webview's help. It includes host shortcuts and applicable chat/text-editing entries described by the active webview's existing shortcut catalog. That catalog uses the actual composer and voice settings and excludes IDE-only capabilities. Combinations overridden by the host are omitted from the embedded section.

Settings opens the existing settings application in a host dialog, through a fixed-route, authenticated, CSRF-protected settings-view resource. Its embedded keyboard listener closes only that dialog on the host-specific close shortcut and sends help to the Desktop dialog.

All chat view addresses receive `top_bar_display=F` from both the Desktop URL factory and final iframe adapter. Hiding the visual webview header retains its chat-page activity and host-action listeners.

Page-dispatched automation covered shortcuts originating inside the composer: rename, favorite/sidebar synchronization, both split directions, all four panel directions, previous/next tab navigation, exactly one tab closing under page-dispatched input, Desktop-only help with real chat entries, settings with and without a chat tab, settings-dialog closure, and hidden-header parameters on every open view. Native Electron was not launched. Complete layout restoration remains TODO 25.

## Browser-reserved close shortcut

The page-dispatched Mod+W check did not test the physical browser accelerator. On 2026-10-12, the user reported that physical Command+W closed the development browser tab. DOM event cancellation only applies to events delivered to the page; it cannot override an accelerator intercepted by the browser host. Do not claim this path fixed or browser-safe based on locator key presses.

Chromium documents close-tab as a browser-reserved shortcut. Keyboard Lock requires JavaScript-initiated fullscreen and permission, so it is not an equivalent fix for the normal embedded browser. Fixing the exact combination there requires control of the browser host; a page-only solution needs a different shortcut. Native Electron behavior remains separately unverified.

References: [Chromium shortcuts](https://github.com/chromium/chromium/blob/main/docs/ui/learn/keyboard_shortcuts.md), [Keyboard Lock](https://developer.chrome.com/docs/capabilities/web-apis/keyboard-lock).

Browser hosts are identified by the absence of the Electron preload host. The shell, chat frames, settings frame, menu hints, and help use this same host decision. Browser close uses Option+W on macOS and Alt+W on Windows/Linux; the primary-modifier W combination is not intercepted. Electron retains Command/Control+W. Other shortcuts retain their existing modifiers.

Option+W was verified using the Codex browser native key input with the new-chat composer focused: two tabs became one, the original session remained, and localhost:3031 stayed open. The context menu displayed ⌥W. Build and all 68 tests passed, including browser/Electron modifier separation and consumed close events.
