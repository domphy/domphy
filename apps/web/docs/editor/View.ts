import { toState, type DomphyElement,type State } from '@domphy/core'
import { Editor } from './Editor'
import { Toolbar } from './Toolbar'
import { Preview } from './Preview'
import { ErrorOverlay } from './ErrorOverlay'
import { TipBar } from './TipBar'
import { Console } from './Console'
import { moduleMap } from './Modules'
import { stringify } from './stringify'
import { transformCode } from './transformCode'

// Draft consider include toolbar inside shadow dom
export function Container(code: State<string>, error: State<string>): DomphyElement<'div'> {
  const isDark = toState(false)
  const hasGrid = toState(true)
  const isFull = toState(false)
  return {
            div: [
              Toolbar({ isDark, isFull, hasGrid }),
              Preview(code, isDark, hasGrid, error),
              ErrorOverlay(error),
            ],

            style: {
              position: 'relative',
              display: 'flex',
              flexDirection:"column"
            },
          }
}
