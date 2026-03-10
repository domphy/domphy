// Layer 4 - UI only, receives callback from parent
import { type DomphyElement } from '@domphy/core'
import { EditorView, basicSetup } from 'codemirror'
import { javascript } from '@codemirror/lang-javascript'
import { oneDark } from '@codemirror/theme-one-dark'

export function Pane(
  initialCode: string,
  onChange: (code: string) => void,
): DomphyElement<'div'> {
  return {
    div: [],
    _onMount: (node) => {
      new EditorView({
        doc: initialCode,
        extensions: [
          basicSetup,
          javascript({ typescript: true }),
          oneDark,
          EditorView.updateListener.of(update => {
            if (update.docChanged) onChange(update.state.doc.toString())
          }),
        ],
        parent: node.domElement!,
      })
    },
    style: {
      borderRight: '1px solid var(--vp-c-divider)',
      overflow: 'auto',
      fontSize: '13px',
    },
  }
}
