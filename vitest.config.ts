import { configDefaults, defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // Vendored agent tooling (.agents/.cursor) ships bun:test suites that are not part of this package.
    exclude: [...configDefaults.exclude, '.agents/**', '.cursor/**'],
  },
})
