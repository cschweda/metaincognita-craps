import { describe, it, expect } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import AppHubLink from '../../app/components/AppHubLink.vue'
import DefaultLayout from '../../app/layouts/default.vue'

// The hub exit is suite chrome (guidelines §5): the same gold wordmark in every
// Metaincognita game, on every route, leaving the SPA for the floor at
// metaincognita.com. Every assertion below is a rule, not a preference.
const HUB_URL = 'https://metaincognita.com'
const WORDMARK = 'METAINCOGNITA'

describe('AppHubLink (the hub exit)', () => {
  it('is a real anchor to the hub, not a router link', async () => {
    const hub = await mountSuspended(AppHubLink)

    expect(hub.element.tagName).toBe('A')
    expect(hub.element.getAttribute('href')).toBe(HUB_URL)
    // A NuxtLink/RouterLink would keep the player inside the SPA. This link leaves it.
    expect(hub.findComponent({ name: 'RouterLink' }).exists()).toBe(false)
    expect(hub.findComponent({ name: 'NuxtLink' }).exists()).toBe(false)
  })

  it('exits in the same tab — no target', async () => {
    const hub = await mountSuspended(AppHubLink)

    // An exit, not a side trip: target="_blank" would leave the simulator
    // running in the tab behind it.
    expect(hub.element.hasAttribute('target')).toBe(false)
  })

  it('has an accessible name containing the visible wordmark (WCAG 2.5.3)', async () => {
    const hub = await mountSuspended(AppHubLink)

    // Label in Name: the accessible name must contain the visible label
    // verbatim. "Meta Incognita" reads fine and fails the rule on the space.
    expect(hub.text()).toContain(WORDMARK)
    expect(hub.attributes('aria-label')).toContain(WORDMARK)
  })
})

describe('the hub exit is never gated', () => {
  const routes = [
    ['/', 'the simulator index (setup)'],
    ['/table', 'the table — deep in the game'],
    ['/analysis', 'a sub-page']
  ] as const

  it.each(routes)('renders far left in the top bar on %s (%s)', async (path) => {
    const layout = await mountSuspended(DefaultLayout, { route: path })

    // First <a> of the first <nav>: the far-left slot of the top status bar.
    const topBar = layout.findAll('nav')[0]!
    const hub = topBar.get('a')

    expect(hub.attributes('href')).toBe(HUB_URL)
    expect(hub.attributes('target')).toBeUndefined()
    expect(hub.text()).toContain(WORDMARK)
  })

  it('is an extra control beside Back, not a replacement for it', async () => {
    const layout = await mountSuspended(DefaultLayout, { route: '/table' })

    // Back still destroys the session and still confirms first (untouched).
    // The hub exit destroys nothing and never asks. Both are present.
    expect(layout.findAll('nav')[0]!.get('a').attributes('href')).toBe(HUB_URL)
    expect(layout.findAll('button').filter(b => b.text().includes('Back'))).toHaveLength(1)
  })
})
