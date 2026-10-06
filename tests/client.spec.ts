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
type PillProps = { t: (key: LocaleKey, params?: Record<string, unknown>) => string; inject: Face }

function loadModule(source: string): unknown[] {
  const modules: unknown[] = []
  runInNewContext(source, { window: { __ModuleLoader__: { load(value: unknown) { modules.push(value) } } } })
  return modules
}

function requireRuntime(name: string): unknown {
  if (name === 'react') return React
  if (name === 'react/jsx-runtime') return jsxRuntime
  throw new Error(`Unexpected require: ${name}`)
}

describe('built client factory', () => {
  it('loads once, registers owned resources, and renders the translated pill', async () => {
    const source = await readFile(new URL('../lib/client.js', import.meta.url), 'utf8')
    const modules = loadModule(source)
    expect(modules).toHaveLength(1)
    const module = modules[0]
    if (!module || typeof module !== 'object' || !('id' in module) || !('factory' in module) || typeof module.factory !== 'function') throw new Error('Invalid module registration')
    expect(module.id).toBe('dsh-1password-approval')
    const exports: unknown = module.factory(requireRuntime)
    if (!exports || typeof exports !== 'object' || !('inject' in exports) || !('apply' in exports) || typeof exports.apply !== 'function') throw new Error('Invalid plugin exports')
    expect(exports.inject).toEqual(['slots', 'locale'])
    const locales: { name: string; dictionaries: { en: Dictionary; zh: Dictionary } }[] = []
    const entries: { options: { name: string; id: string; locale: string }; component: ComponentType<PillProps> }[] = []
    const injected: string[] = []
    const effects: (() => void)[] = []
    let disposedLocale = false
    let disposedSlot = false
    exports.apply({
      effect(callback: () => () => void) { effects.push(callback()) },
      locale: {
        register(name: string, dictionaries: { en: Dictionary; zh: Dictionary }) {
          locales.push({ name, dictionaries })
          return () => { disposedLocale = true }
        },
      },
      slots: {
        inject(name: string, callback: () => () => void) { injected.push(name); effects.push(callback()) },
        register(options: { name: string; id: string; locale: string }, component: ComponentType<PillProps>) {
          entries.push({ options, component })
          return () => { disposedSlot = true }
        },
      },
    })
    expect(locales).toEqual([{ name: namespace, dictionaries: { en, zh } }])
    expect(injected).toEqual(['shell.overlay'])
    expect(entries).toHaveLength(1)
    const entry = entries[0]
    if (!entry) throw new Error('Missing overlay entry')
    expect(entry.options).toMatchObject({ name: 'shell.overlay', id: 'onepassword-approval.pill', locale: namespace })
    const markup = renderToStaticMarkup(createElement(entry.component, { t: key => en[key], inject: { handkey: () => createHandkey(), language: { subscribe: () => () => {}, getSnapshot: () => 'en' } } }))
    expect(markup).toContain(en['pill.register'])
    expect(markup).toContain('pointer-events: auto')
    expect(markup).toContain('position: fixed')
    effects.reverse().forEach(dispose => dispose())
    expect(disposedLocale).toBe(true)
    expect(disposedSlot).toBe(true)
  })
})
