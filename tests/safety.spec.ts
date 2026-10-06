import { readFile, readdir } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'
import ts from 'typescript'

async function sources() {
  const directory = new URL('../src/client/', import.meta.url)
  return Promise.all((await readdir(directory)).filter(name => /\.tsx?$/.test(name)).map(async name => ({ name, text: await readFile(new URL(name, directory), 'utf8') })))
}

describe('credential rendering boundaries', () => {
  it('forbids logs, HTML injection, direct key value access, controlled key inputs, and storage outside the store', async () => {
    let credentials = 0
    for (const { name, text } of await sources()) {
      expect(text).not.toMatch(/console\s*\./)
      expect(text).not.toContain('dangerouslySetInnerHTML')
      if (name !== 'store.ts') expect(text).not.toContain('localStorage')
      expect(text).not.toMatch(/(?:password|key)\s*\.\s*value/)
      const file = ts.createSourceFile(name, text, ts.ScriptTarget.Latest, true, name.endsWith('tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS)
      const visit = (node: ts.Node) => {
        if (ts.isJsxSelfClosingElement(node) || ts.isJsxOpeningElement(node)) {
          if (node.getText(file).includes('CREDENTIAL_ATTRIBUTES.key')) {
            credentials++
            for (const attribute of node.attributes.properties) {
              if (ts.isJsxAttribute(attribute)) expect(attribute.name.getText(file)).not.toMatch(/^(onChange|onInput|defaultValue|value|ref)$/)
            }
          }
        }
        ts.forEachChild(node, visit)
      }
      visit(file)
    }
    expect(credentials).toBe(3)
  })
})
