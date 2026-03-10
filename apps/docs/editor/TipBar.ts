import { type DomphyElement } from '@domphy/core'

export const TipBar: DomphyElement<'div'> = {
  div: [
    { span: '💡 Tip: ' },
    {
      code: 'console.log(domphyElement)',
      style: { color: '#0081c6', fontSize: '12px' },
    },
    { span: ' prints the full expanded patch object (all merges resolved) — paste it to AI for debugging.' },
  ],
  style: {
    borderTop: '1px solid var(--vp-c-divider)',
    color: '#6f6f6f',
    fontSize: '12px',
    fontFamily: 'monospace',
    padding: '5px 10px',
    letterSpacing: '0.02em',
  },
}