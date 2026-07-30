## Imperative API (ref)

```jsx
const ref = useRef(null);
<LixEditor ref={ref} />

ref.current.getBlocks();      // → Block[] current document
ref.current.getEditor();      // → underlying BlockNote editor
ref.current.replaceBlocks(b); // replace the whole document
```
