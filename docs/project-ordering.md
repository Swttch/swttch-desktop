
## Click versus drag activation

Project cards use an explicit 6 px distance activation constraint. The library's default starts mouse drags immediately when pressing a declared handle, which swallowed ordinary project navigation clicks. Regression tests now verify pointer-down/up and small jitter do not activate dragging, sufficient movement activates once, and cancellation cannot activate later. Browser checks reproduced the old click failure, verified navigation to the project detail after the fix, and verified deliberate movement starts a placeholder drag that Escape cancels without changing ordering. Build and all 79 tests passed.
