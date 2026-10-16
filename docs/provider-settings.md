# Provider settings

`/settings/providers/claude-code` provides native Desktop controls for Claude Code
model, effort, response language, thinking, fast mode, thinking summaries, ignored
files, checkpointing, permissions, environment, file suggestions, and spinner verbs.
The existing embedded chat settings page remains available for plugin-specific
settings and other controls.

Desktop-only settings have no project scope. Provider settings offer global and
project-local scopes with a project selector, inheritance labels and per-item reset.
The project selector also lets the global view indicate project overrides without
displaying the project value as if it belonged to the global file.

`GET/PATCH /desktop-api/providers/claude-code/settings` uses `scope` and an optional
registered `projectId`. Project scope requires a project. The service authenticates
requests and validates CSRF for writes, resolves the project path, then forwards
`GET_CLAUDE_SETTINGS` or `SAVE_CLAUDE_SETTINGS` to the existing plugin backend.
It preserves the backend's raw `settings`, adds `effectiveSettings` for inheritance,
and keeps provider keys unchanged. The plugin owns the actual files, including
whether a key belongs in an existing settings.json or settings.local.json file.

The response language is independent of Desktop interface language. Editing it
writes the Claude Code `language` key; changing Desktop interface language keeps
using the separate `uiLanguage` preference propagation.

Text editors save changed values when focus leaves the field. There is
no separate save button. Unchanged values do not write, empty inputs reset the
scoped key, and invalid environment variable names remain in the editor with an inline error. Toggle
controls save immediately. Initial reads display a spinner with a status label.

## Official copy sources

Reviewed 2026-10-15 against the official Korean translation. JSON key paths link
to their entries in [All settings](https://code.claude.com/docs/ko/settings-reference).
Short Korean excerpts for response language, thinking summaries and ignored files
are used alongside condensed descriptions. Condensed English text is adapted copy,
not a claim to reproduce the full reference verbatim. Retain official terminology
and prefer the official translation when expanding or revising a description.

| Keys | Additional official source |
| --- | --- |
| model, effortLevel, alwaysThinkingEnabled | [Model configuration](https://code.claude.com/docs/ko/model-config) |
| fastMode | [Fast mode](https://code.claude.com/docs/ko/fast-mode) |
| fileCheckpointingEnabled | [Checkpointing](https://code.claude.com/docs/ko/checkpointing) |
| permissions | [Permissions](https://code.claude.com/docs/ko/permissions) |
| env | [Environment variables](https://code.claude.com/docs/ko/env-vars) |
| language, showThinkingSummaries, respectGitignore, fileSuggestion, spinnerVerbs, voice.enabled | [All settings](https://code.claude.com/docs/ko/settings-reference) |

Models and effort choices come from the plugin's existing `GET_CLI_CONFIG`
response, forwarded unchanged by `GET /desktop-api/providers/claude-code/models`.
When the catalog is unavailable, the stored value remains visible and the dropdown
is disabled with a retry action; Desktop does not invent supported models or levels.


## Structured setting controls

Structured settings never expose raw JSON. The spinner-verb editor follows the
plugin's `Appearance/Chat/SpinnerVerbsRow.tsx`: append/replace mode, mode help,
a top add field, editable list rows, remove controls, Enter/blur commit, and
composition-safe Enter for IME input. Adding entries keeps the add field focused.
An empty list removes the scoped key, restoring built-in or inherited verbs.

Permissions use a mode dropdown, binary policy switches, and allow/ask/deny/directory lists. Editing
one property starts from the raw scoped object, preserving unrelated and unknown
properties rather than copying inherited settings into a project override.
Environment variables use named value rows and validate new variable names; secret
values are masked. Inherited environment entries can be overridden, while removing
an override restores the inherited value. File suggestions use a command input,
matching the plugin's `{ type: "command", command }` value and empty-to-reset rule.
Rapid list/object edits are queued so an older response cannot replace a newer draft.

### Permission section

Permissions have their own section. Each nested key is an independent `SettingItem` with its own scope badge, reset action and JSON path. Resetting a permission removes only that key and retains sibling values. The two disable-mode policies use switches: on writes `"disable"`; off removes the scoped key, allowing the upstream/default policy to apply. Rules and additional directories use expandable list editors.

### Official topic organization

Provider pages use the provider's official taxonomy. For Claude Code, sections match every distinct **Topic** value in [All settings → Settings index](https://code.claude.com/docs/en/settings-reference#settings-index). The [official Korean reference](https://code.claude.com/docs/ko/settings-reference#settings-index) provides Korean labels and descriptions. Verified on 2026-10-16 against 245 indexed keys and 17 topics; the small [reference snapshot](claude-settings-topics.json) records the labels and relevant field metadata used by this change. This snapshot is evidence for review, not a claim that every indexed setting is supported.

All 17 topics are available in a submenu inside the Claude Code content surface. Only the selected topic section is rendered in the adjacent content panel. Unimplemented topics show a short empty page and no speculative controls. Implemented fields are grouped as follows:

| Official topic | Implemented controls |
| --- | --- |
| Model and responses | model, effortLevel, language, alwaysThinkingEnabled, fastMode, showThinkingSummaries |
| Memory and context | fileCheckpointingEnabled; env known-key controls and custom variables, including CLAUDE_CONFIG_DIR and DISABLE_AUTOUPDATER |
| Interface and terminal | respectGitignore, fileSuggestion, spinnerVerbs, voice.enabled |
| Updates and versioning | autoUpdatesChannel |
| Permission settings | permissions.defaultMode, permissions.disableBypassPermissionsMode, permissions.disableAutoMode, permissions.allow, permissions.ask, permissions.deny, permissions.additionalDirectories |

`permissions.disableAutoMode` is the documented nested alias of `disableAutoMode`; its help links to that entry. Permission descriptions use the official index's short descriptions without condensation in English and Korean. Topic labels and new permission descriptions in other interface locales currently use English pending review of their official translations.

The `env` group contains a dedicated essential-traffic switch with its description even when its value is unset, independent custom-variable items, and an add item. Do not duplicate the essential-traffic variable in the generic list. The global-only switch delegates to GET_NONESSENTIAL_TRAFFIC / SET_NONESSENTIAL_TRAFFIC, retaining managed locks and the plugin backend's environment handling. Further known-key controls can be reviewed and added to this group later.

Command and spinner input placeholders continue to reuse the plugin locale resources. The reference taxonomy supersedes the earlier plugin-based General/Appearance/Desktop-specific groupings.

### Plugin-native settings coverage (2026-10-16)

The plugin settings screen was audited by its `ClaudeNative` badges and actual persistence APIs. Four previously missing controls were ported:

| Desktop item | Plugin source | Persistence and scope |
| --- | --- | --- |
| `env.CLAUDE_CONFIG_DIR` | `General/Basics/ClaudeConfigDirRow.tsx` | GET_CLAUDE_CONFIG_DIR / SAVE_CLAUDE_CONFIG_DIR, global or registered project |
| `voice.enabled` | `General/Voice/EnabledRow.tsx` | Existing Claude settings API; changes only the nested key, retaining mode/autoSubmit and other keys |
| `env.DISABLE_AUTOUPDATER` (inverted switch) | `About/CliAutoUpdateRow.tsx` | GET_CLI_AUTO_UPDATE / SET_CLI_AUTO_UPDATE; global only, honors all backend locks |
| `autoUpdatesChannel` | `About/CliAutoUpdateRow.tsx` | Existing global SAVE_CLAUDE_SETTINGS; latest removes the override, stable is selectable, rc appears only when already configured |

Known environment controls stay under the documented parent `env` topic, Memory and context. The channel has its own Updates and versioning topic. Config-directory resolution is bootstrapping: the plugin's adapter deliberately persists its override in the plugin env map and applies it before reading Claude's configuration. Desktop must use that adapter rather than putting the value into the Claude file it selects. It shows the effective directory and saves on blur; clearing resets the scoped override.

Voice enablement follows the plugin's existing unset-means-enabled UI behavior. Voice-kit installation, silence timeout, keyboard shortcuts, spoken-language overrides, telemetry consent, announcements, IDE integration, CLI binary paths, model synchronization and session-wide automatic approvals are plugin-owned preferences or actions and are not imported as Claude Code settings. Voice mode/autoSubmit are preserved but not newly exposed: they are not separate controls in the current plugin settings screen.

Control copy, directory placeholders and lock explanations reuse the plugin's 12 locale resources. The update-channel short description follows the official settings index. Automatic-update state is shared by its switch and channel through TanStack Query; writes invalidate provider settings, and changing the config directory also refreshes affected policies. Native update actions are not triggered merely by opening this page.

### In-content topic navigation

The outer Settings sidebar keeps a single Claude Code entry. Its title and scope/project controls remain above an internal two-column layout: the official topic menu on the left and the selected topic on the right. The menu and content use the enclosing settings page scroll; neither panel has its own overflow container. Narrow content areas use a wrapping topic menu.

Topic selection uses the existing provider route with a `topic` query parameter, for example `/settings/providers/claude-code?topic=permission-settings`. This gives each topic a shareable URL and supports refresh and browser back/forward. The base URL and unknown topic IDs display Model and responses. Topic navigation does not reset the shared scope/project view state. Only the selected section mounts, retaining the existing closed setting-item components.
