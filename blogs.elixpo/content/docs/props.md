## `<LixEditor>` props

| Prop | Type | Description |
| --- | --- | --- |
| `initialContent` | `Block[]` | Initial document. Pass `[]` for a blank editor. |
| `onChange` | `(blocks: Block[]) => void` | Fires on every edit with the full document. |
| `onReady` | `() => void` | Fires once the editor has mounted. |
| `editable` | `boolean` | Read-only when `false`. Default `true`. |
| `collaboration` | `CollabConfig` | Yjs provider + user `{ name, color }` for live editing. |
| `blogId` | `string` | Scopes inline media uploads to a blog folder. |
