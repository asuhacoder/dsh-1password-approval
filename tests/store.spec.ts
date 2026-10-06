// @vitest-environment jsdom
import { expect, it } from 'vitest'
import { createUiStore } from '../src/client/store.js'

it('does not focus a detached dialog opener', () => {
  const ui = createUiStore()
  const opener = document.createElement('button')
  let focused = false
  opener.focus = () => { focused = true }
  ui.open(0, false, opener)
  ui.restoreFocus()
  expect(focused).toBe(false)
  document.body.append(opener)
  ui.open(0, false, opener)
  ui.restoreFocus()
  expect(focused).toBe(true)
  opener.remove()
})
