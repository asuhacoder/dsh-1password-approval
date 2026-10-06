import { readFile } from 'node:fs/promises'
import { Context } from '@deepseek-ai/cordis'
import { SkillRegistry } from '@deepseek-ai/dsh-skill'
import { describe, expect, it } from 'vitest'
import * as plugin from '../src/index.js'
import { skillContent } from '../src/generated/skill.js'

const markdown = () => readFile(new URL('../skill/handkey.md', import.meta.url), 'utf8')

describe('host skill', () => {
  it('embeds the exact current Markdown', async () => {
    expect(skillContent).toBe(await markdown())
    expect(plugin.skillDescription.length).toBeLessThanOrEqual(300)
  })

  it('registers and disposes through the real registry', async () => {
    const ctx = new Context()
    const registry = await ctx.plugin(SkillRegistry)
    try {
      const fiber = await ctx.plugin(plugin)
      expect(await ctx.skills.list()).toEqual([
        expect.objectContaining({ name: 'handkey', source: 'bundled', description: plugin.skillDescription }),
      ])
      expect((await ctx.skills.get('handkey'))?.content).toBe(await markdown())
      await fiber.dispose()
      expect(await ctx.skills.list()).toEqual([])
      expect(await ctx.skills.get('handkey')).toBeUndefined()
    } finally {
      await registry.dispose()
    }
  })
})
