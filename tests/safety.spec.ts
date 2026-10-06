import { readFile, readdir } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'
import ts from 'typescript'

async function sources() {
  const directory = new URL('../src/client/', import.meta.url)
  return Promise.all((await readdir(directory)).filter(name => /\.tsx?$/.test(name)).map(async name => ({ name, text: await readFile(new URL(name, directory), 'utf8') })))
}

function passwordViolations(text: string): string[] {
  const file = ts.createSourceFile('client.tsx', text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  const aliases = new Set<string>()
  const lookup = (node: ts.Node) => ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'inputElement' && node.arguments.some(arg => ts.isStringLiteral(arg) && arg.text === 'password')
  function derives(node: ts.Node): boolean {
    if (lookup(node) || ts.isIdentifier(node) && aliases.has(node.text)) return true
    if (ts.isPropertyAccessExpression(node) || ts.isElementAccessExpression(node)) return derives(node.expression)
    if (ts.isParenthesizedExpression(node) || ts.isAsExpression(node) || ts.isNonNullExpression(node)) return derives(node.expression)
    if (ts.isObjectLiteralExpression(node)) return node.properties.some(property => ts.isPropertyAssignment(property) ? derives(property.initializer) : ts.isShorthandPropertyAssignment(property) && derives(property.name))
    if (ts.isArrayLiteralExpression(node)) return node.elements.some(derives)
    return false
  }
  let changed = true
  while (changed) {
    changed = false
    const collect = (node: ts.Node) => {
      if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer && derives(node.initializer) && !aliases.has(node.name.text)) { aliases.add(node.name.text); changed = true }
      if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.EqualsToken && ts.isIdentifier(node.left) && derives(node.right) && !aliases.has(node.left.text)) { aliases.add(node.left.text); changed = true }
      ts.forEachChild(node, collect)
    }
    collect(file)
  }
  const violations: string[] = []
  const visit = (node: ts.Node) => {
    if (ts.isPropertyAccessExpression(node) && node.name.text === 'value' && derives(node.expression) || ts.isElementAccessExpression(node) && ts.isStringLiteral(node.argumentExpression) && node.argumentExpression.text === 'value' && derives(node.expression)) violations.push('password value read')
    if (ts.isCallExpression(node) && node.arguments.some(derives)) {
      const name = ts.isIdentifier(node.expression) ? node.expression.text : node.expression.getText(file)
      const approved = (name === 'takeKey' || name === 'takeRegistration') && node.arguments.every(arg => ts.isObjectLiteralExpression(arg) && arg.properties.every(property => !ts.isPropertyAssignment(property) || !derives(property.initializer) || ts.isIdentifier(property.name) && property.name.text === 'key'))
      if (!approved) violations.push(`password passed to ${name}`)
    }
    ts.forEachChild(node, visit)
  }
  visit(file)
  return violations
}

describe('credential rendering boundaries', () => {
  it('detects direct and aliased password reads and rejects other consumers', () => {
    expect(passwordViolations("inputElement(form, 'password').value")).toEqual(['password value read'])
    expect(passwordViolations("const input = inputElement(form, 'password'); const alias = input; alias.value")).toEqual(['password value read'])
    expect(passwordViolations("leak({ key: inputElement(form, 'password') })")).toEqual(['password passed to leak'])
    expect(passwordViolations("takeKey({ key: inputElement(form, 'password') })")).toEqual([])
    expect(passwordViolations("const input = inputElement(form, 'password'); const payload = { key: input }; leak(payload)")).toEqual(['password passed to leak'])
    expect(passwordViolations("inputElement(form, 'password')['value']")).toEqual(['password value read'])
    expect(passwordViolations("takeKey({ deviceId: inputElement(form, 'password') })")).toEqual(['password passed to takeKey'])
  })
  it('forbids logs, HTML injection, direct key value access, controlled key inputs, and storage outside the store', async () => {
    let credentials = 0
    for (const { name, text } of await sources()) {
      expect(text).not.toMatch(/console\s*\./)
      expect(text).not.toContain('dangerouslySetInnerHTML')
      if (name !== 'store.ts') expect(text).not.toContain('localStorage')
      expect(passwordViolations(text), name).toEqual([])
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
