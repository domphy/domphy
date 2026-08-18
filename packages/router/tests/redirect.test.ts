import { describe, expect, it } from 'vitest'
import {
  DEFAULT_PROTOCOL_ALLOWLIST,
  isDangerousProtocol,
  redirect,
} from '../src'

const allowlist = new Set(DEFAULT_PROTOCOL_ALLOWLIST)

describe('isDangerousProtocol', () => {
  it('flags protocol-relative URLs as dangerous', () => {
    expect(isDangerousProtocol('//evil.com', allowlist)).toBe(true)
    expect(isDangerousProtocol('//evil.com/phish', allowlist)).toBe(true)
    expect(isDangerousProtocol('  //evil.com', allowlist)).toBe(true)
    expect(isDangerousProtocol('\t//evil.com', allowlist)).toBe(true)
  })

  it('flags javascript: (including URL-ctor-failure obfuscations) as dangerous', () => {
    expect(isDangerousProtocol('javascript:alert(1)', allowlist)).toBe(true)
    expect(isDangerousProtocol('JavaScript:alert(1)', allowlist)).toBe(true)
    expect(isDangerousProtocol('  javascript:alert(1)', allowlist)).toBe(true)
    expect(isDangerousProtocol('java\nscript:alert(1)', allowlist)).toBe(true)
    expect(isDangerousProtocol('java\rscript:alert(1)', allowlist)).toBe(true)
  })

  it('treats scheme-like URL-ctor failures as dangerous, not safe', () => {
    // `new URL('http://[')` throws; the previous catch-all treated that as safe.
    expect(isDangerousProtocol('http://[', allowlist)).toBe(true)
    expect(isDangerousProtocol('blob:not valid', allowlist)).toBe(true)
  })

  it('allows listed protocols and relative paths', () => {
    expect(isDangerousProtocol('https://ok.example/path', allowlist)).toBe(
      false,
    )
    expect(isDangerousProtocol('http://ok.example/path', allowlist)).toBe(false)
    expect(isDangerousProtocol('mailto:a@b.example', allowlist)).toBe(false)
    expect(isDangerousProtocol('tel:+15551212', allowlist)).toBe(false)
    expect(isDangerousProtocol('/login', allowlist)).toBe(false)
    expect(isDangerousProtocol('./rel', allowlist)).toBe(false)
    expect(isDangerousProtocol('../up', allowlist)).toBe(false)
    expect(isDangerousProtocol('', allowlist)).toBe(false)
  })
})

describe('redirect Location header', () => {
  it('does not emit a raw //host Location from href', () => {
    const response = redirect({ href: '//evil.com' })
    expect(response.headers.get('Location')).toBeNull()
  })

  it('does not emit a javascript: Location from href', () => {
    const response = redirect({ href: 'javascript:alert(1)' })
    expect(response.headers.get('Location')).toBeNull()
  })

  it('strips a pre-set protocol-relative Location header', () => {
    const response = redirect({
      href: '/safe',
      headers: { Location: '//evil.com' },
    })
    expect(response.headers.get('Location')).not.toBe('//evil.com')
    expect(response.headers.get('Location')?.startsWith('//')).toBeFalsy()
  })

  it('strips a pre-set javascript: Location header', () => {
    const response = redirect({
      href: '/safe',
      headers: { Location: 'javascript:alert(1)' },
    })
    expect(response.headers.get('Location')).not.toBe('javascript:alert(1)')
  })

  it('emits Location for a same-origin path href', () => {
    const response = redirect({ href: '/login' })
    expect(response.headers.get('Location')).toBe('/login')
  })

  it('emits Location for an https href', () => {
    const response = redirect({ href: 'https://ok.example/path' })
    expect(response.headers.get('Location')).toBe('https://ok.example/path')
  })
})
