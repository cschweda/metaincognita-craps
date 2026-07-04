import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'
import { defineVitestProject } from '@nuxt/test-utils/config'

const alias = {
  '~~': fileURLToPath(new URL('.', import.meta.url)),
  '~': fileURLToPath(new URL('./app', import.meta.url))
}

export default defineConfig({
  test: {
    projects: [
      {
        resolve: { alias },
        test: {
          name: 'unit',
          include: ['test/unit/*.{test,spec}.ts'],
          environment: 'node'
        }
      },
      await defineVitestProject({
        test: {
          name: 'nuxt',
          include: ['test/nuxt/*.{test,spec}.ts'],
          environment: 'nuxt',
          environmentOptions: {
            nuxt: {
              rootDir: fileURLToPath(new URL('.', import.meta.url)),
              domEnvironment: 'happy-dom'
            }
          }
        }
      })
    ],
    coverage: {
      provider: 'v8',
      include: ['app/engine/**', 'app/utils/**', 'app/stores/**', 'craps.config.ts'],
      thresholds: {
        'app/engine/**/*.ts': {
          statements: 90,
          branches: 80,
          functions: 90,
          lines: 90
        }
      }
    }
  }
})
