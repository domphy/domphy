import { type DomphyElement, type State } from '@domphy/core'

function ConsoleLog(log: string, i: number): DomphyElement<'div'> {
  return {
    div: [
      { span: '›', style: { flexShrink: '0', color: '#555', userSelect: 'none' } },
      { span: log, style: { whiteSpace: 'pre-wrap', wordBreak: 'break-all' } },
    ],
    _key: i,
    style: {
      display: 'flex', alignItems: 'flex-start', gap: '6px',
      padding: '3px 10px', color: '#9cdcfe', borderBottom: '1px solid #1e1e1e',
    },
  }
}

function ConsoleHeader(logs: State<string[]>, copied: State<boolean>): DomphyElement<'div'> {
  return {
    div: [
      { span: 'Console' },
      {
        button: (listener) => copied.get(listener) ? '✓ Copied' : 'Copy',
        onClick: () => {
          navigator.clipboard.writeText(logs.get().join('\n')).then(() => {
            copied.set(true)
            setTimeout(() => copied.set(false), 2000)
          })
        },
        style: {
          cursor: 'pointer', background: '#2a2a2a', border: '1px solid #3a3a3a',
          color: '#888', fontFamily: 'monospace', fontSize: '10px',
          letterSpacing: '0.05em', padding: '2px 8px', borderRadius: '3px',
          textTransform: 'uppercase',
        },
      },
    ],
    style: {
      position: 'sticky', top: '0', zIndex: '1',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '4px 10px', background: '#1a1a1a', borderBottom: '1px solid #2a2a2a',
      color: '#555', fontSize: '11px', letterSpacing: '0.05em', textTransform: 'uppercase',
    },
  }
}

export function Console(logs: State<string[]>, copied: State<boolean>): DomphyElement<'div'> {
  return {
    div: (listener) => {
      const currentLogs = logs.get(listener)
      if (!currentLogs.length) return []
      return [ConsoleHeader(logs, copied), ...currentLogs.map(ConsoleLog)]
    },
    style: {
      borderTop: '1px solid var(--vp-c-divider)', background: '#141414',
      fontFamily: 'monospace', fontSize: '12px',
      maxHeight: '500px', overflowY: 'auto', position: 'relative',
    },
  }
}