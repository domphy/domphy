import { type DomphyElement, type State, ElementNode } from '@domphy/core'
import { moduleMap } from './Modules'
import { Render } from './Render.js'
import { transformCode } from './transformCode.js'

export function Preview(code: State<string>, isDark: State<boolean>, hasGrid: State<boolean>, error: State<string>, shadowHost: HTMLElement, previewContainer: HTMLElement): DomphyElement<'div'> {
  return {
    div: [],
    _onMount: (node) => {
      const dom = node.domElement as HTMLElement
      dom.appendChild(shadowHost)
      let newNode: ElementNode | null = null

      const update = (val: string) => {
        previewContainer.textContent = ""
        try {
          if (newNode) newNode.remove()
          const fn = new Function('__modules__', transformCode(val))
          const el = fn(moduleMap)
          if (!el) return
          newNode = new ElementNode(Render(el, isDark, hasGrid))
          newNode.render(previewContainer)
        } catch (e: any) {
          error.set(e.message)
        }
      }
      update(code.get())
      code.addListener(update)
    },
    style: {
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
    },
  }
}
