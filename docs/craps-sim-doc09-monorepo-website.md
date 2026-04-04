# Craps Simulator — Doc 09: Monorepo / Website

## Project Structure Decision

**This is a single application, not a monorepo.** There is one Nuxt project, one `package.json`, one deployment target. No workspace configuration, no shared packages, no multi-app architecture.

This matches the Hold'em simulator's structure. If a future "Casino Simulator Collection" umbrella project is created, each game remains its own independent repo and deployment — not a monorepo. The games share no runtime code (though they share design patterns and architectural conventions documented across their respective design suites).

---

## Repository Structure

```
craps-simulator/              ← Git root
├── app/                      ← Nuxt 4 app directory (all source code)
│   ├── app.vue
│   ├── app.config.ts
│   ├── pages/
│   ├── components/
│   ├── composables/
│   ├── stores/
│   ├── utils/
│   └── assets/
├── docs/                     ← Design documents (Markdown, not deployed)
│   ├── doc00-master-design.md
│   ├── doc01-phase1-visual-foundation.md
│   ├── doc02-phase2-dice-engine.md
│   ├── doc03-phase3-game-loop.md
│   ├── doc04-phase4-bot-systems.md
│   ├── doc05-phase5-stats-phase6-polish.md
│   ├── doc06-security.md
│   ├── doc07-llm-build-prompt.md
│   ├── doc08-competitive-landscape.md
│   ├── doc09-monorepo-website.md
│   ├── doc10-revision-gap-analysis.md
│   ├── doc11-architecture-decisions.md
│   ├── doc12-use-cases.md
│   └── reference/
│       ├── Craps_table_layout.svg
│       └── rules-reference-sources.md
├── tests/                    ← Vitest test suites
├── public/                   ← Static assets (favicon, etc.)
├── craps.config.ts           ← Master game configuration
├── nuxt.config.ts
├── package.json
├── netlify.toml
├── tsconfig.json
├── .gitignore
├── README.md
└── yarn.lock                 ← Always committed
```

The `docs/` directory is included in the repo for reference but excluded from the build output. Netlify only deploys the contents of `.output/public/`.

---

## Deployment Configuration

### Netlify

**Site name:** TBD (e.g., `craps-simulator.netlify.app` or a custom domain)

**Build settings:**
- Build command: `yarn generate`
- Publish directory: `.output/public`
- Node version: 20.x (set via `.nvmrc` or Netlify environment variable `NODE_VERSION=20`)

**`netlify.toml`:**

```toml
[build]
  command = "yarn generate"
  publish = ".output/public"
  environment = { NODE_VERSION = "20" }

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-Content-Type-Options = "nosniff"
    Referrer-Policy = "strict-origin-when-cross-origin"
    Content-Security-Policy = "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:"
```

**Deploy triggers:**
- Automatic deploy on push to `main` branch.
- Deploy previews on pull requests.
- No branch deploys beyond `main`.

### Environment Variables

**None.** The SPA has zero server-side secrets. Everything is client-side code. There are no API keys, no database URLs, no auth tokens. This is intentional and a security feature — there is nothing to leak.

If Supabase is added in a future phase, the `anon` key (which is designed for public client-side use) would be the only environment variable, and it can safely be committed to the repo or set in Netlify's environment panel.

---

## Development Workflow

### Local Development

```bash
# Clone
git clone <repo-url>
cd craps-simulator

# Install (Yarn 1.22.22)
yarn install

# Dev server (http://localhost:3000)
yarn dev

# Run tests
yarn test

# Production build (verify before deploy)
yarn generate
npx serve .output/public    # preview production build locally
```

### Git Branching

- `main` — production branch, auto-deploys to Netlify.
- `phase-N` — feature branches per phase build (e.g., `phase-1`, `phase-2`).
- PR from `phase-N` → `main` for each phase merge.
- No `develop` branch needed for a solo developer project.

### Build Verification

Before merging any phase:

```bash
yarn test                   # All Vitest tests pass
yarn generate               # Build succeeds with no errors
# Preview the build:
npx serve .output/public    # Smoke test in browser
```

---

## Custom Domain (Future)

If a custom domain is desired (e.g., `craps.example.com`):
1. Purchase domain or configure subdomain.
2. Add custom domain in Netlify site settings.
3. Netlify provisions Let's Encrypt SSL automatically.
4. Update CSP headers if the domain changes asset origins.

No DNS or SSL configuration is needed for the default `.netlify.app` subdomain.

---

## Relationship to Other Simulators

| Simulator | Repo | Deployment | Status |
|-----------|------|-----------|--------|
| Hold'em Simulator | Separate repo | Netlify (SPA) | Design complete |
| **Craps Simulator** | **Separate repo** | **Netlify (SPA)** | **Design complete, build pending** |
| Video Poker Simulator | Separate repo (future) | Netlify (SPA) | High-level design |
| Blackjack Simulator | Separate repo (future) | Netlify (SPA) | Not started |
| Roulette Simulator | Separate repo (future) | Netlify (SPA) | Not started |

Each simulator is an independent project. They share architectural conventions (Nuxt 4 SPA, Pinia single store, integer-cent arithmetic, bot comparison systems, educational stats panels) but no runtime code. A future umbrella landing page could link them together, but each game stands alone.
