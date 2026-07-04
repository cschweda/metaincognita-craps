export default defineNuxtConfig({

  modules: ['@pinia/nuxt', '@nuxt/eslint', '@nuxt/ui', '@nuxt/test-utils'],
  ssr: false,

  devtools: {
    enabled: true
  },

  app: {
    head: {
      title: 'Craps Simulator',
      meta: [
        { name: 'description', content: 'Browser-based casino craps training tool' }
      ]
    }
  },

  css: ['~/assets/css/main.css'],

  colorMode: {
    preference: 'dark',
    fallback: 'dark'
  },

  compatibilityDate: '2025-01-15',

  eslint: {
    config: {
      stylistic: {
        commaDangle: 'never',
        braceStyle: '1tbs'
      }
    }
  },

  icon: {
    provider: 'none',
    clientBundle: {
      // Nuxt UI's <USelect>/<UCombobox> use lucide:check internally for the
      // selected-item indicator; it isn't a literal string in our own
      // source, so static `scan` can't discover it — list it explicitly.
      icons: ['lucide:check'],
      scan: true
    }
  }
})
