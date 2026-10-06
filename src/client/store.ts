import { createHandkey } from 'handkey-client'
import type { Handkey } from 'handkey-client'
import { browserEnvironment } from 'handkey-client/dom'
import type { PropsLocale } from '@deepseek-ai/dsh-client-ui-slots'

let singleton: Handkey | undefined
export function getHandkey(): Handkey {
  return singleton ??= createHandkey(browserEnvironment({ storageKey: 'dsh-1password-approval:v1' }))
}

export type Translate = PropsLocale<'onepassword-approval'>['t']
export interface Face {
  readonly handkey: () => Handkey
  readonly language: { readonly subscribe: (listener: () => void) => () => void; readonly getSnapshot: () => string }
}
export type RootProps = PropsLocale<'onepassword-approval'> & { readonly inject: Face }
