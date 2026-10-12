# Desktop shortcuts

Desktop owns keyboard shortcuts in its shell and embedded application windows. The capture-phase listener consumes matched events with `preventDefault`, `stopPropagation`, and `stopImmediatePropagation` before executing actions. Each embedded listener is disposed with its tab; the owning view ID is validated against the live layout. Holding close/split/favorite keys does not repeatedly operate on additional tabs. The close-event test removes the listener inside the callback and verifies that the original event still never reaches another handler.

macOS uses Command. Windows/Linux use Control. Tab navigation is Command+Option+Left/Right on macOS and Control+Alt+Left/Right elsewhere. Panel navigation is Control+Option+Command+arrows on macOS; Control+Alt+Shift+arrows elsewhere, avoiding the duplicate-Control ambiguity. Panel navigation uses spatially overlapping neighbors rather than jumping diagonally.

Implemented commands: split columns (Mod+D), split rows (Mod+Shift+D), rename tab (Mod+E), close tab (Mod+W), session favorite (Mod+B), Desktop help (Mod+/), settings (Mod+,), new chat (Mod+N), and sidebar visibility (Mod+Shift+S). Matching uses physical key codes for letter shortcuts, with composition protection. Menu hints use platform-appropriate symbols.

Favorites reuse the session repository, API, and existing sidebar favorites. An uncreated new chat has no session to favorite; the menu is disabled until its first message creates a session. Requests are serialized per session and the shared query cache updates every view of that session.

Desktop help opens a separate host dialog rather than the webview's help. It includes host shortcuts and applicable chat/text-editing entries described by the active webview's existing shortcut catalog. That catalog uses the actual composer and voice settings and excludes IDE-only capabilities. Combinations overridden by the host are omitted from the embedded section.

Settings opens the existing settings application in a host dialog, through a fixed-route, authenticated, CSRF-protected settings-view resource. Its embedded keyboard listener closes only that dialog on Mod+W and sends help to the Desktop dialog.

All chat view addresses receive `top_bar_display=F` from both the Desktop URL factory and final iframe adapter. Hiding the visual webview header retains its chat-page activity and host-action listeners.

Browser verification covered shortcuts originating inside the composer: rename, favorite/sidebar synchronization, both split directions, all four panel directions, previous/next tab navigation, exactly one tab closing with the browser still open, Desktop-only help with real chat entries, settings with and without a chat tab, settings-dialog closure, and hidden-header parameters on every open view. Native Electron was not launched. Complete layout restoration remains TODO 25.
