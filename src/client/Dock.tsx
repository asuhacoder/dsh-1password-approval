import { useState, useSyncExternalStore } from 'react'
import type { InputZone } from '@deepseek-ai/dsh-client-ui-conversation/client'
import { number } from './labels.js'
import type { RootProps } from './store.js'

export function Dock({ t, handkey: factory, language: languageStore, ui }: RootProps & InputZone) {
  const [handkey] = useState(factory)
  const snapshot = useSyncExternalStore(handkey.subscribe, handkey.getSnapshot, handkey.getSnapshot)
  const state = useSyncExternalStore(ui.subscribe, ui.getSnapshot, ui.getSnapshot)
  const language = useSyncExternalStore(languageStore.subscribe, languageStore.getSnapshot, languageStore.getSnapshot)
  const run = snapshot.approval
  const ids = snapshot.kind === 'active' ? snapshot.pending.map(request => request.id) : []
  const count = ids.length
  if (!run && count === 0) {
    if (snapshot.kind === 'register' && (snapshot.reason === 'expired' || snapshot.reason === 'rejected' || snapshot.reason === 'invalid-saved-session')) return <div className="opa-root opa-dock"><p className="opa-muted">{t('settings.registerPointer')}</p></div>
    return null
  }
  return <div className="opa-root opa-dock"><button className={`opa-dock-button${ids.some(id => !state.seenIds.includes(id)) ? ' opa-accent' : ''}`} type="button" onClick={event => ui.open(ids, run !== null, event.currentTarget)}>{t(run ? 'pill.progress' : 'pill.pending', { count: number(count, language) })}</button></div>
}
