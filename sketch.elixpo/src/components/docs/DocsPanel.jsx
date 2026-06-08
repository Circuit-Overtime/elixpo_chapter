'use client'

import useSketchStore from '@/store/useSketchStore'
import useUIStore from '@/store/useUIStore'
import useDocAutoSave, { triggerDocSync } from '@/hooks/useDocAutoSave'
import '@blocknote/core/fonts/inter.css'
import '@blocknote/mantine/style.css'
// KaTeX CSS — until @elixpo/lixeditor republishes with KaTeX bundled
// inline, we have to import it consumer-side or block equations won't
// render. Safe to leave even after package republish (idempotent).
import 'katex/dist/katex.min.css'
import '@elixpo/lixeditor/styles'
import './docs-theme.css'
import { LixEditor, LixThemeProvider } from '@elixpo/lixeditor'

function DocsLoading() {
  return (
    <div className="w-full h-full flex items-center justify-center text-text-dim text-xs font-[lixFont]">
      <i className="bx bx-loader-alt animate-spin mr-2" /> Loading editor…
    </div>
  )
}

export default function DocsPanel() {
  const layoutMode = useSketchStore((s) => s.layoutMode)
  const visible = layoutMode === 'split' || layoutMode === 'docs'
  // Controlled-mode theme: pass the canvas theme straight through to the
  // editor. Available since @elixpo/lixeditor@2.6.7 — replaces the prior
  // `defaultTheme` + manual `localStorage.setItem` workaround that was
  // needed because the storage-overrides-default precedence pinned the
  // editor to whatever theme was saved in a previous session.
  const canvasTheme = useUIStore((s) => s.theme)
  const docTheme = canvasTheme === 'dark' ? 'dark' : 'light'

  const { initialContent, ready } = useDocAutoSave(visible)

  if (!visible) return null

  return (
    <div className="w-full h-full bg-surface-dark overflow-hidden flex flex-col lix-sketch-theme">
      <div className="flex-1 min-h-0 overflow-y-auto lix-editor-host">
        {ready ? (
          <LixThemeProvider theme={docTheme}>
            <LixEditor
              initialContent={initialContent}
              onChange={(editor) => {
                try {
                  const blocks = editor.document
                  triggerDocSync(blocks)
                } catch {}
              }}
              features={{ equations: true, mermaid: true, code: true }}
            />
          </LixThemeProvider>
        ) : (
          <DocsLoading />
        )}
      </div>
    </div>
  )
}
