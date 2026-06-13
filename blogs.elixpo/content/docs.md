## Overview

**LixEditor** is the block-based WYSIWYG editor that powers LixBlogs. It is built on BlockNote + React, ships a custom block schema (image, equation, mentions, tabs, table of contents), and is real-time-collaboration ready via Yjs. This page documents the developer API.

## Installation

```
npm install @elixpo/lixeditor
```

Peer dependencies: `react >= 18` and `react-dom >= 18`.

## Quick start

```jsx
import { LixEditor } from '@elixpo/lixeditor';
import '@elixpo/lixeditor/style.css';

export default function Editor() {
  return (
    <LixEditor
      initialContent={[]}
      onChange={(blocks) => save(blocks)}
    />
  );
}
```

`onChange` receives the document as an array of **block** objects — clean JSON you can persist and re-render anywhere.

## `<LixEditor>` props

| Prop | Type | Description |
| --- | --- | --- |
| `initialContent` | `Block[]` | Initial document. Pass `[]` for a blank editor. |
| `onChange` | `(blocks: Block[]) => void` | Fires on every edit with the full document. |
| `onReady` | `() => void` | Fires once the editor has mounted. |
| `editable` | `boolean` | Read-only when `false`. Default `true`. |
| `collaboration` | `CollabConfig` | Yjs provider + user `{ name, color }` for live editing. |
| `blogId` | `string` | Scopes inline media uploads to a blog folder. |

## Imperative API (ref)

```jsx
const ref = useRef(null);
<LixEditor ref={ref} />

ref.current.getBlocks();      // → Block[] current document
ref.current.getEditor();      // → underlying BlockNote editor
ref.current.replaceBlocks(b); // replace the whole document
```

## Block model

Each block is `{ id, type, props, content, children }`. Built-in `type`s:

- `paragraph`, `heading` (`level` 1–3), `quote`, `codeBlock`
- `bulletListItem`, `numberedListItem`, `checkListItem`
- `image`, `table`, `equation`, `mention`, `tabs`, `tableOfContents`

Inline styles: `bold`, `italic`, `underline`, `strike`, `code`, `textColor`, `backgroundColor`, plus link and date inline content.

## Collaboration

LixEditor accepts a Yjs document + WebSocket provider. Pass a `collaboration` config with the shared doc and the local user's `{ name, color }`; remote cursors and selections render automatically.

## Markdown & slash commands

- Type `/` for the command menu (insert any block).
- Markdown shortcuts: `#` heading, `-`/`1.` lists, `>` quote, ``` ``` ``` code, `**bold**`, etc.
- Import/export Markdown via the editor's markdown helpers.

## Rendering stored content

Persist the `Block[]` JSON from `onChange`, then render it read-only later with `editable={false}` and `initialContent={blocks}` — the same renderer LixBlogs uses for published posts.
