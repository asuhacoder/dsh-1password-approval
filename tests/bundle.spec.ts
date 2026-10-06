import { readFile, stat } from 'node:fs/promises'
import { satisfies } from 'semver'
import { describe, expect, it } from 'vitest'
import { parse } from 'yaml'
import manifest from '../package.json' with { type: 'json' }

const peers = ['@deepseek-ai/dsh-skill', '@deepseek-ai/dsh-client-ui-slots', '@deepseek-ai/dsh-client-ui-renderer', '@deepseek-ai/dsh-client-ui-layout', '@deepseek-ai/dsh-client-locale', '@deepseek-ai/dsh-client-ui-settings', '@deepseek-ai/dsh-client-ui-conversation']

describe('package bundle', () => {
  it('publishes both halves and display metadata', async () => {
    expect(manifest).toMatchObject({
      name: 'dsh-1password-approval', version: '0.1.0', type: 'module', license: 'MIT', author: 'Yudai Kobayashi',
      icon: './icon.svg',
      exports: {
        '.': { default: './lib/index.js' },
        './client': { default: './lib/client.js' },
        './package.json': './package.json',
        './locale/*.json': './locale/*.json',
        './icon.svg': './icon.svg',
      },
      dsh: {
        bundle: { patch: './cordis.patch.yml' },
        client: { platform: 'web', immediately: true, inject: ['@deepseek-ai/dsh-client-ui-layout', '@deepseek-ai/dsh-client-locale', '@deepseek-ai/dsh-client-ui-settings', '@deepseek-ai/dsh-client-ui-conversation'] },
      },
    })
    expect(manifest.files).toEqual(['lib/', 'cordis.patch.yml', 'locale/*.json', 'icon.svg', 'README.md', 'LICENSE'])
    expect(manifest.scripts).not.toHaveProperty('prepare')
    for (const lang of ['en', 'zh']) {
      const metadata: unknown = JSON.parse(await readFile(new URL(`../locale/${lang}.json`, import.meta.url), 'utf8'))
      expect(metadata).toMatchObject({ meta: { title: expect.any(String), description: expect.any(String) } })
    }
    expect((await stat(new URL('../icon.svg', import.meta.url))).size).toBeLessThanOrEqual(256 * 1024)
  })

  it('inserts only the host plugin', async () => {
    const source = await readFile(new URL('../cordis.patch.yml', import.meta.url), 'utf8')
    expect(parse(source)).toEqual([{ insert: [{ id: 'onepassword-approval', name: 'dsh-1password-approval' }] }])
  })

  it('gates the current prerelease and pins development APIs', () => {
    expect(manifest.peerDependencies['@deepseek-ai/cordis']).toBe('^4.0.4')
    for (const [name, range] of Object.entries(manifest.peerDependencies)) {
      if (!peers.includes(name)) continue
      expect(range).toBe('>=0.2.0-rc.2 <0.3.0')
      expect(satisfies('0.2.0-rc.2', range, { includePrerelease: true })).toBe(true)
      expect(satisfies('0.3.0', range, { includePrerelease: true })).toBe(false)
    }
    expect(Object.keys(manifest.peerDependencies).filter(name => name.startsWith('@deepseek-ai/dsh-')).sort()).toEqual(peers.sort())
    for (const [name, version] of Object.entries(manifest.devDependencies)) {
      if (peers.includes(name)) expect(version).toBe('0.2.0-rc.2')
    }
  })
})
