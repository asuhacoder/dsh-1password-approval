import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const manifest = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'))
const source = await readFile(new URL('../lib/client.js', import.meta.url), 'utf8')
assert.ok(source.startsWith('window.__ModuleLoader__.load({id:' + JSON.stringify(manifest.name) + ','))
assert.doesNotMatch(source, /^\s*(?:import|export)\s/m)
assert.doesNotMatch(source, /require\s*\(\s*['"]@deepseek-ai\//)
const required = [...source.matchAll(/require\s*\(\s*['"]([^'"]+)['"]\s*\)/g)].map(match => match[1])
assert.ok(required.length > 0)
for (const name of required) assert.ok(['react', 'react/jsx-runtime'].includes(name), `Unexpected client require: ${name}`)
process.stdout.write('Client bundle contract passed. Only React runtime imports remain.\n')
