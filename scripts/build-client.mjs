import { build } from 'esbuild'
import { readFile } from 'node:fs/promises'

const manifest = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'))
await build({
  entryPoints: ['src/client/index.tsx'],
  outfile: 'lib/client.js',
  bundle: true,
  format: 'cjs',
  platform: 'browser',
  external: ['react', 'react/jsx-runtime'],
  target: 'es2022',
  minify: false,
  sourcemap: true,
  banner: {
    js: 'window.__ModuleLoader__.load({id:' + JSON.stringify(manifest.name) +
      ',factory:(require)=>{var module={exports:{}};var exports=module.exports;',
  },
  footer: { js: 'return module.exports;}});' },
})
