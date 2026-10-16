# Settings component conventions

Organize settings by their UI hierarchy: menu page → section → setting item. Directory and component names must follow the conventions below.

## Directory structure and naming

```text
settings/
├── README.md
└── GeneralSetting/
    ├── index.tsx
    └── PermissionsSection/
        ├── index.tsx
        ├── BasicPermissionSettingItem.tsx
        └── FullAccessSettingItem.tsx
```

- **Page:** Each settings menu entry has its own directory named with the `Setting` suffix. Its page component lives in `index.tsx` and uses the same name, such as `GeneralSetting` in `GeneralSetting/index.tsx`.
- **Section:** Each section has its own directory inside its page directory, named with the `Section` suffix. Its section component lives in `index.tsx` and uses the same name, such as `PermissionsSection` in `GeneralSetting/PermissionsSection/index.tsx`.
- **Item:** Each setting item is an independent component file inside its section directory. Both the file and component names end with `SettingItem`, such as `BasicPermissionSettingItem.tsx` exporting `BasicPermissionSettingItem`.

Use PascalCase for these directories, files, and components. Preserve the exact suffixes: `Setting`, `Section`, and `SettingItem`.

## Component responsibilities

Page components compose sections. Section components compose setting items. Keep setting-specific behavior in the item that owns it.

Each setting item must be self-contained. It owns:

- Its title, description, and localized copy references.
- The selector that subscribes to its required values in the shared Zustand settings store.
- The action that changes its setting through the shared settings update mechanism.
- Its complete UI, composed from shared primitives such as `SettingsRow`, `SettingsSwitch`, and `SettingsSelect`.
- Its availability, pending, disabled, and error presentation as applicable.

Do not pass setting values, update callbacks, or item metadata down through pages and sections. A setting item should render as a complete unit, for example `<BasicPermissionSettingItem />`, without requiring its parent to assemble its behavior or presentation.

Shared UI primitives may accept presentation and control props. Passing a value and callback from a setting item directly to its input control is ordinary composition; passing them through page and section layers is props drilling and is prohibited.

## State boundary

Use selective Zustand subscriptions so each item consumes only the settings it needs. Other application components consume the same store directly rather than receiving settings through the settings page tree.

The local Node.js backend owns persistent, device-local settings shared by Electron and localhost browsers. The frontend store holds the currently applied settings. Account-based synchronization is outside the current scope.

The native settings pages follow this structure. AgentSetting hosts the existing agent settings application in an iframe; its internal components remain owned by that application. Shell actions such as opening help are consumed directly through a shared action context, while settings values are consumed through Zustand.

## Internationalization

Use `useSettingsCopy()` (react-i18next) inside the item or section that displays a
settings string. Shell surfaces use the shared i18next shell namespace. Keep
localized strings in the locale resources rather than in JSX or persisted
identifiers. Language and direction controls subscribe to the same device store
as every other setting; pages and sections do not forward their values as props.

New plugin-backed fields must follow the per-field, import-once rules in
[Interface settings](../../../docs/interface-settings.md). Plugin edits do not flow back into initialized desktop fields. Explicit desktop
interface edits propagate through the existing plugin API; the plugin owns its
persistence and change notifications.

## Provider settings

Provider pages, such as `ClaudeCodeSetting`, edit the provider's original settings
through the existing plugin backend APIs. They do not store a second copy in the
device settings database. The provider owns persistence, merge rules, broadcasts,
and the files that each scope writes.

Scope selection belongs only to provider settings. Desktop-only preferences remain
device-wide. `ClaudeCodeSetting` keeps its scope and selected project in a small
Zustand view-state store, while TanStack Query owns server values. Each item reads
its own field through `useProviderField`; page and section components only compose
items. Scope/project changes discard unsaved input drafts.

The global view displays the global value even when a selected project overrides
it. The project view displays inherited effective values for missing local keys,
and removing an override uses the existing API's `null` reset semantics. The API
resolves project IDs to registered paths rather than accepting filesystem paths
from the renderer. Open provider pages revalidate every five seconds and on focus
to pick up changes made outside Desktop.

## Provider descriptions and field metadata

- Display the provider's real JSON key path, such as `$.model`, beneath each
  description in a small colored `code` element. Link it to the official key reference.
- Prefer the provider's official description and official translation. Keep short
  excerpts intact where practical; minimally adapt awkward phrasing or text that
  cannot fit a settings row, without introducing new product claims.
- Record the source URL and any condensation in `docs/provider-settings.md`.
  Do not present adapted copy as a verbatim quotation.
- Use provider-supplied catalogs for model and effort dropdowns. Do not guess an
  enum from the interface language list: Claude Code's response language accepts
  arbitrary language names.
- Inheritance and reset actions belong in title badges with Tippy tooltips, rather
  than taking space beside the setting value. Reset tooltips must be interactive.

## Official provider taxonomy

Provider settings pages follow the provider's official documentation taxonomy rather than Desktop or plugin convenience groups. For Claude Code, each distinct **Topic** in the official **All settings → Settings index** table becomes a section. Keep the official topic names and prefer the official localized labels. A topic remains available as an empty topic page when none of its settings have been implemented; do not add speculative controls merely to fill it.

Place each setting in the topic assigned to its exact key. Nested keys without their own index entry follow the documented parent key or explicitly documented alias. `env` is in **Memory and context** in the current reference, so environment-variable controls belong there as a labeled group. That group includes dedicated, explained controls for known keys, plus independent custom-variable items and an add item. Do not duplicate a known key in the generic editor.

Every implemented item must include an explanation from the official key reference, including nested permission items. Preserve the actual JSON path and link to the exact documented key anchor. Record the source and verification date in the provider documentation; review the mapping when updating the provider's supported settings.

Provider topic navigation belongs inside the provider content surface, not the outer settings sidebar. Keep the provider title and scope/project controls shared above the internal menu and selected topic. Reuse each existing `Section` and its closed `SettingItem` components as the selected view; do not render every topic at once. Keep topic selection in the URL for direct links and history, while retaining scope/project view state across topic changes.
