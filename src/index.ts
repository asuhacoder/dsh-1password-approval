import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-skill'
import { skillContent } from './generated/skill.js'

export const name = 'dsh-1password-approval'
export const inject = ['skills']
export const skillDescription = 'Load whenever a task needs a secret, credential, API key, password, OTP, or 1Password item. Use handkey to request human approval and deliver values with the least exposure.'

export function apply(ctx: Context): void {
  ctx.skills.register({
    name: 'handkey',
    description: skillDescription,
    source: 'bundled',
    content: skillContent,
  })
}
