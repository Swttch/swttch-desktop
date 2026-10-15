# Development app identity

On macOS, `pnpm run dev` launches a separately prepared `artifacts/dev-app/Swttch.app`. The launcher clones the installed Electron runtime, sets the bundle display name to Swttch and the development bundle identifier to `app.swttch.desktop.dev`, installs the app icon, and signs the generated bundle locally with an ad hoc signature. The installed Electron bundle is never modified. A content stamp reuses the prepared runtime until its source runtime, icon or preparation script changes.

The PNG and ICNS assets come from the repository's existing Swttch wing avatar. ICNS contains the macOS icon sizes. The app uses the bundle icon on macOS; avoid overriding it with the square source PNG through `app.dock.setIcon`, which can produce inconsistent Dock presentation. `app.setName` changes Electron's internal name, so changing the OS-visible app name requires bundle metadata as well.

This is a development launcher, not a signed or notarized distribution build. `pnpm start` still invokes the installed Electron directly. Other platforms retain the existing executable and use the app icon on the BrowserWindow.

Verification: a test first failed for the absent launcher, then verified generated bundle identity, icon installation, cache reuse, and preservation of the original bundle. The actual generated macOS bundle launched successfully; native accessibility identified both the app and its application menu as Swttch. A temporary default Electron window created during verification was closed; only the intended development app remained running. The Dock's final appearance after removing the runtime override was not captured directly.
