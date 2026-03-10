import { type DomphyElement, type State, ElementNode } from '@domphy/core'
import { themeApply } from '@domphy/theme'
import * as domphyCore from '@domphy/core'
import * as domphyUI from '@domphy/ui'
import * as domphyTheme from '@domphy/theme'

import { ErrorOverlay } from './ErrorOverlay'
import { Render } from './Render.js'
import { transformCode } from './transformCode.js'

const moduleMap: Record<string, any> = {
  '@domphy/core': domphyCore,
  '@domphy/ui': domphyUI,
  '@domphy/theme': domphyTheme,
}

export function Preview(code: State<string>, isDark: State<boolean>, hasGrid: State<boolean>, error: State<string>): DomphyElement<'div'> {
  return {
    div: [],
    _onMount: (node) => {
      const dom = node.domElement as HTMLElement
      const shadow = dom.attachShadow({ mode: 'open' })
      const container = document.createElement('div')
      container.style.flex = '1'
      const themeTag = document.createElement('style')
      themeTag.id = "domphy-themes"
      shadow.append(themeTag, container)
      themeApply(themeTag)
      let newNode: ElementNode | null = null

      const update = (val: string) => {
        container.textContent = ""
        try {
          if (newNode) newNode.remove()
          const fn = new Function('__modules__', transformCode(val))
          const el = fn(moduleMap)
          if (!el) return
          newNode = new ElementNode(Render(el, isDark, hasGrid))

          newNode.render(container)

        } catch (e: any) {
          error.set(e.message)
        }
      }
      update(code.get())
      code.onChange(update)
    },
    style: {
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      overflow:"auto",
    },
  }
}