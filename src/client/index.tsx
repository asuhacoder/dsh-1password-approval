import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type {} from '@deepseek-ai/dsh-client-ui-layout/client'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type { Handkey } from 'handkey-client'
import { Root } from './Root.js'
import { getHandkey } from './store.js'
import { en, zh, namespace } from './locale.js'

export const inject = ['slots', 'locale']

export function apply(ctx: Context, factory: () => Handkey = getHandkey): void {
  ctx.effect(() => ctx.locale.register(namespace, { en, zh }))
  ctx.slots.inject('shell.overlay', () => ctx.slots.register({
    name: 'shell.overlay',
    id: 'onepassword-approval.pill',
    locale: namespace,
    inject: () => ({
      handkey: factory,
      language: {
        subscribe: (listener: () => void) => ctx.locale.subscribe(listener),
        getSnapshot: () => ctx.locale.getSnapshot().active || navigator.language,
      },
    }),
  }, Root))
}
