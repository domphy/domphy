import { type DomphyElement, type State } from '@domphy/core'
import { themeSize } from '@domphy/theme'
import { EditorView, basicSetup } from 'codemirror'
import { javascript } from '@codemirror/lang-javascript'
import { oneDark } from '@codemirror/theme-one-dark'

export function Editor(code: State<string>): DomphyElement<'div'> {
  return {
    div: [],
    _onMount: (node) => {
      new EditorView({
        doc: code.get(),
        extensions: [
          basicSetup,
          javascript({ typescript: true }),
          oneDark,
          EditorView.updateListener.of((update) => {
            if (update.docChanged) code.set(update.state.doc.toString())
          }),
        ],
        parent: node.domElement!,
      })
    },
    style: {
      display: "flex",
      flex: 1,
      minHeight: 0,
      overflow: "auto"
    },
  }
}