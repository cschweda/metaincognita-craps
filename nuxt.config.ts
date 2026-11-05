export default defineNuxtConfig({

  modules: ['@pinia/nuxt', '@nuxt/eslint', '@nuxt/ui', '@nuxt/test-utils'],
  ssr: false,

  devtools: {
    enabled: true
  },

  app: {
    head: {
      title: 'Craps Simulator',
      // Static <head> — with ssr: false this is the only meta that reaches
      // link-preview crawlers (useSeoMeta in app.vue runs client-side only).
      meta: [
        { name: 'description', content: 'Browser-based casino craps training tool. Learn which bets are mathematically sound and which are sucker bets.' },
        { property: 'og:type', content: 'website' },
        { property: 'og:url', content: 'https://craps.metaincognita.com/' },
        { property: 'og:title', content: 'Craps Simulator' },
        { property: 'og:description', content: 'A full visual craps table with 44 bet types and a real-time advisor that ranks every bet by house edge and explains the math in plain English.' },
        { property: 'og:image', content: 'https://craps.metaincognita.com/og-image.png' },
        { property: 'og:image:width', content: '1200' },
        { property: 'og:image:height', content: '630' },
        { property: 'og:image:alt', content: 'Craps Simulator: two dice showing five and six on an emerald felt table, with a house-edge ladder from Odds at 0% to Any 7 at 16.67%.' },
        { name: 'twitter:card', content: 'summary_large_image' },
        { name: 'twitter:title', content: 'Craps Simulator' },
        { name: 'twitter:description', content: 'A full visual craps table with 44 bet types and a real-time advisor that ranks every bet by house edge and explains the math in plain English.' },
        { name: 'twitter:image', content: 'https://craps.metaincognita.com/og-image.png' },
        { name: 'twitter:image:alt', content: 'Craps Simulator: two dice showing five and six on an emerald felt table, with a house-edge ladder from Odds at 0% to Any 7 at 16.67%.' }
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
