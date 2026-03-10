import { type DomphyElement, type State } from '@domphy/core'

export function ErrorOverlay(error: State<string>): DomphyElement<'div'> {
  return {
    div: (listener) => `⚠ ${error.get(listener)}`,
    style: {
      display: (listener) => error.get(listener) ? 'block' : 'none',
      position: 'absolute',
      top: '8px', left: '8px', right: '8px',
      zIndex: '10',
      color: '#ff6b6b',
      fontSize: '12px',
      fontFamily: 'monospace',
      background: 'rgba(0,0,0,0.75)',
      padding: '6px 10px',
      borderRadius: '4px',
      whiteSpace: 'pre-wrap',
    },
  }
}