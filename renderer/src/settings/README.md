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
