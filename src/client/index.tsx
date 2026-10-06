import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type {} from '@deepseek-ai/dsh-client-ui-layout/client'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import type { Handkey } from 'handkey-client'
import { Root } from './Root.js'
import { Dock } from './Dock.js'
import { Settings } from './Settings.js'
import { getHandkey, createUiStore } from './store.js'
import { en, zh, namespace } from './locale.js'
import { styles } from './styles.js'

export const inject = ['slots', 'locale']
export function apply(ctx: Context, factory: () => Handkey = getHandkey): void {
  ctx.effect(() => ctx.locale.register(namespace, { en, zh }))
  ctx.effect(() => {
    if (typeof document === 'undefined') return () => {}
    const style = document.createElement('style'); style.dataset.plugin = 'dsh-1password-approval'; style.textContent = styles; document.head.append(style)
    return () => style.remove()
  })
  const uiStore = createUiStore()
  ctx.effect(() => () => uiStore.dispose())
  let actor: Handkey | undefined
  const handkey = () => actor ??= factory()
  const face = () => ({ handkey, ui: uiStore, language: { subscribe: (listener: () => void) => ctx.locale.subscribe(listener), getSnapshot: () => ctx.locale.getSnapshot().active || navigator.language } })
  ctx.slots.inject('settings.section', () => {
    let dispose = () => {}
    const register = () => {
      dispose()
      const label = ctx.locale.bind(namespace)('settings.title')
      dispose = ctx.slots.register({ name: 'settings.section', id: 'onepassword-approval', order: 100, label: () => label, locale: namespace, inject: face }, Settings)
    }
    register()
    const off = ctx.on('locale/change', register)
    return () => { off(); dispose() }
  })
  ctx.slots.inject('conversation.input.dock', () => ctx.slots.register({ name: 'conversation.input.dock', id: 'onepassword-approval.pending', order: 30, locale: namespace, inject: face }, Dock))
  ctx.slots.inject('shell.overlay', () => ctx.slots.register({ name: 'shell.overlay', id: 'onepassword-approval.dialog', locale: namespace, inject: face }, Root))
}
