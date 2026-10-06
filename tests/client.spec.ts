import { readFile } from 'node:fs/promises'
import { runInNewContext } from 'node:vm'
import { createElement } from 'react'
import { createHandkey } from 'handkey-client'
import type { Face } from '../src/client/store.js'
import type { ComponentType } from 'react'
import * as React from 'react'
import * as jsxRuntime from 'react/jsx-runtime'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { en, zh, namespace } from '../src/client/locale.js'
import type { LocaleKey } from '../src/client/locale.js'

type Dictionary = Record<string, string>
type EntryProps = { t: (key: LocaleKey, params?: Record<string, unknown>) => string; close: () => void } & Face
type Options = { name: string; id: string; locale: string; order?: number; label?: () => string; inject: () => Face }
function loadModule(source: string): unknown[] {
  const modules: unknown[] = []
  runInNewContext(source, { navigator: { userAgent: 'Safari', platform: 'MacIntel', language: 'en' }, window: { __ModuleLoader__: { load(value: unknown) { modules.push(value) } } } })
  return modules
}
function requireRuntime(name: string): unknown {
  if (name === 'react') return React
  if (name === 'react/jsx-runtime') return jsxRuntime
  throw new Error(`Unexpected require: ${name}`)
}

describe('built client factory', () => {
  it('registers three owned entries, composes spread props, and refreshes the section label on locale change', async () => {
    const modules = loadModule(await readFile(new URL('../lib/client.js', import.meta.url), 'utf8'))
    expect(modules).toHaveLength(1)
    const module = modules[0]
    if (!module || typeof module !== 'object' || !('id' in module) || !('factory' in module) || typeof module.factory !== 'function') throw new Error('Invalid module registration')
    expect(module.id).toBe('dsh-1password-approval')
    const exports: unknown = module.factory(requireRuntime)
    if (!exports || typeof exports !== 'object' || !('inject' in exports) || !('apply' in exports) || typeof exports.apply !== 'function') throw new Error('Invalid plugin exports')
    expect(exports.inject).toEqual(['slots', 'locale'])
    const locales: { name: string; dictionaries: { en: Dictionary; zh: Dictionary } }[] = []
    const entries: { options: Options; component: ComponentType<EntryProps>; disposed: boolean }[] = []
    const injected: string[] = []
    const effects: (() => void)[] = []
    let disposedLocale = false
    let language = 'en'
    let changed = () => {}
    let createdActors = 0
    exports.apply({
      effect(callback: () => () => void) { effects.push(callback()) },
      on(name: string, listener: () => void) { expect(name).toBe('locale/change'); changed = listener; return () => { changed = () => {} } },
      locale: {
        subscribe: () => () => {}, getSnapshot: () => ({ active: language }),
        bind: () => (key: LocaleKey) => language === 'zh' ? zh[key] : en[key],
        register(name: string, dictionaries: { en: Dictionary; zh: Dictionary }) { locales.push({ name, dictionaries }); return () => { disposedLocale = true } },
      },
      slots: {
        inject(name: string, callback: () => () => void) { injected.push(name); effects.push(callback()) },
        register(options: Options, component: ComponentType<EntryProps>) { const entry = { options, component, disposed: false }; entries.push(entry); return () => { entry.disposed = true } },
      },
    }, () => { createdActors++; return createHandkey() })
    expect(locales).toEqual([{ name: namespace, dictionaries: { en, zh } }])
    expect(injected).toEqual(['settings.section', 'conversation.input.dock', 'shell.overlay'])
    expect(entries.map(entry => ({ name: entry.options.name, id: entry.options.id, order: entry.options.order }))).toEqual([
      { name: 'settings.section', id: 'onepassword-approval', order: 100 },
      { name: 'conversation.input.dock', id: 'onepassword-approval.pending', order: 30 },
      { name: 'shell.overlay', id: 'onepassword-approval.dialog', order: undefined },
    ])
    for (const entry of entries) {
      const markup = renderToStaticMarkup(createElement(entry.component, { t: key => en[key], close: () => {}, ...entry.options.inject() }))
      if (entry.options.name === 'settings.section') { expect(entry.options.label?.()).toBe('Handkey'); expect(markup).toContain('Register this browser'); expect(markup).toContain('Broker URL') }
      else expect(markup).toBe('')
    }
    expect(createdActors).toBe(1)
    language = 'zh'; changed()
    expect(entries[0]?.disposed).toBe(true); expect(entries).toHaveLength(4); expect(entries[3]?.options.label?.()).toBe('Handkey')
    effects.reverse().forEach(dispose => dispose())
    expect(disposedLocale).toBe(true); expect(entries.every(entry => entry.disposed)).toBe(true)
  })
})
