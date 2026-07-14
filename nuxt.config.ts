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
      // Nuxt UI renders some icons internally, from appConfig.ui.icons.* — they are
      // literal strings nowhere in OUR source, so static `scan` cannot discover them,
      // and with `provider: 'none'` + `connect-src 'self'` a missed icon renders as
      // nothing at all. List them explicitly:
      //   lucide:check — <USelect>/<UCombobox> selected-item indicator
      //   lucide:x     — <UModal>'s close button (the leave-confirm in default.vue,
      //                  and table.vue). It ships today only because BotConfigurator
      //                  incidentally names i-lucide-x; delete that one line and every
      //                  modal here loses its × in production. This exact bug WAS live
      //                  in flameout, which had no such lucky line.
      icons: ['lucide:check', 'lucide:x'],
      scan: true
    }
  }
})
