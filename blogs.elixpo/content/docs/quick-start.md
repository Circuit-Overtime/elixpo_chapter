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
