# Craps Simulator — Doc 06: Security

## Threat Model

The craps simulator is a client-side SPA with no server, no authentication, no user accounts, and no real money. The attack surface is minimal — but there are still red team / blue team considerations worth documenting, especially for a tool deployed publicly on Netlify.

### Attack Surface Summary

| Asset | Exposure | Risk Level |
|-------|----------|------------|
| Server-side code | None — SPA, no backend | N/A |
| User credentials | None — no auth, no login | N/A |
| Financial data | None — simulated currency only | N/A |
| PII | Hero name in localStorage only | Negligible |
| RNG state | Client-side `Math.random()` | Low (no real stakes) |
| localStorage data | Session stats, bankroll history | Low (self-cheating only) |
| npm dependencies | Nuxt, Nuxt UI, Pinia | Medium (supply chain) |
| Netlify deployment | Static CDN, GitHub integration | Medium (account compromise) |
| DOM rendering | Hero name displayed in UI | Low (XSS vector) |

---

## Threat Analysis

### 1. RNG Integrity (Red Team: Predictable Dice)

**Threat:** `Math.random()` is not cryptographically secure. An attacker could predict PRNG state from observed outputs and predict future dice rolls.

**Assessment:** Non-issue for v1. The simulator uses no real money. `Math.random()` is statistically uniform (verified by chi-squared tests in the validation suite) and adequate for simulation. Predicting dice rolls gains the attacker nothing.

**Blue Team Response:** Document `Math.random()` as an intentional choice. If future versions add competitive features (leaderboards, tournaments), upgrade to `crypto.getRandomValues()`:

```typescript
function secureRoll(): number {
  const array = new Uint32Array(1)
  crypto.getRandomValues(array)
  return (array[0] % 6) + 1
}
```

The modulo bias is 4/4,294,967,296 ≈ 0.00000009% — irrelevant for any purpose.

### 2. localStorage Tampering (Red Team: Inflated Stats)

**Threat:** A user opens DevTools and modifies localStorage to fake bankroll, win rate, or session stats.

**Assessment:** No impact. Single-player tool, no leaderboard, no shared state. The user is only cheating themselves.

**Blue Team Response:** None needed for v1. If competitive features are added:
- Move authoritative stats to Supabase with server-side validation.
- Client-side localStorage becomes a cache, not a source of truth.
- Implement store shape validation on load — if the data shape doesn't match the expected schema, reset to defaults rather than crashing.

```typescript
function loadSession(): SessionStats | null {
  try {
    const raw = localStorage.getItem('craps-simulator-session')
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!isValidSessionShape(parsed)) {
      localStorage.removeItem('craps-simulator-session')
      return null
    }
    return parsed
  } catch {
    localStorage.removeItem('craps-simulator-session')
    return null
  }
}
```

### 3. XSS via Hero Name (Red Team: Script Injection)

**Threat:** The hero name is user-supplied and displayed in multiple UI locations. If rendered with `v-html` or interpolated without escaping, an attacker could inject scripts or event handlers.

**Blue Team Response:**
- **Never use `v-html`** for any user-supplied content. This is a hard rule with no exceptions.
- Vue's default template interpolation (`{{ heroName }}`) auto-escapes HTML. This is sufficient.
- Sanitize hero name on input — strip HTML tags, limit to 32 characters, allow only alphanumeric + spaces + basic punctuation:

```typescript
function sanitizeName(input: string): string {
  return input.replace(/<[^>]*>/g, '').trim().slice(0, 32)
}
```

- Apply sanitization in the setup page `<UInput>` handler before writing to the Pinia store.

### 4. Dependency Supply Chain (Red Team: Compromised npm Package)

**Threat:** A malicious update to Nuxt, Nuxt UI, or a transitive dependency injects code into the build.

**Blue Team Response:**
- **`pnpm-lock.yaml` pinning:** The lockfile pins exact dependency versions. Always commit `pnpm-lock.yaml`. Never run `pnpm update` without reviewing the diff.
- **Minimal dependencies.** Direct dependencies: Nuxt, Nuxt UI, Pinia (bundled with Nuxt). Fewer packages = smaller attack surface.
- **Frozen lockfile in CI:** The Netlify build runs `pnpm install --frozen-lockfile`, which refuses to install if the lockfile doesn't match `package.json`. This prevents silent dependency changes during deployment.
- **No CDN script tags.** All code is bundled at build time. Zero runtime loading of external scripts.
- **Periodic audit:** Run `pnpm audit` before each phase build. Address critical/high vulnerabilities before deploying.

### 5. Netlify Deployment Security (Red Team: Compromised Deploy)

**Threat:** An attacker gains access to the Netlify account or GitHub repo and pushes a modified build.

**Blue Team Response:**
- **GitHub branch protection.** Require PR reviews for merges to `main`.
- **Netlify deploy previews.** Every PR generates a preview deploy. Review before merge.
- **No environment variables with secrets.** The SPA has zero secrets — no API keys, no tokens, no server-side config. Everything is public client-side code. There is nothing to steal from the build environment.
- **Content Security Policy (CSP).** Restrict script/style/connect sources via `netlify.toml` headers:

```toml
[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-Content-Type-Options = "nosniff"
    Referrer-Policy = "strict-origin-when-cross-origin"
    Strict-Transport-Security = "max-age=31536000; includeSubDomains"
    Permissions-Policy = "camera=(), microphone=(), geolocation=()"
    Content-Security-Policy = "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'none'; frame-ancestors 'none'"
```

Note: `script-src` and `style-src` both carry `'unsafe-inline'`. Nuxt's SPA-mode bootstrap emits an inline `<script>` to hydrate the app shell, and a static host (no server per-request) cannot mint CSP nonces to allow that script selectively — so `'unsafe-inline'` is accepted for `script-src` and documented here rather than silently tightened and broken. (`'unsafe-inline'` for `style-src` remains required by Tailwind's runtime-injected styles.) `connect-src 'self'` is satisfiable because both icon collections (`@iconify-json/lucide`, `@iconify-json/simple-icons`) are bundled into the client build and all web fonts are self-hosted under `/_fonts/` — no runtime requests to `api.iconify.design` or `fonts.gstatic.com` are needed. `object-src 'none'`, `base-uri 'self'`, `form-action 'none'`, and `frame-ancestors 'none'` close off plugin embedding, `<base>` hijacking, form hijacking, and iframe embedding respectively. HSTS (`Strict-Transport-Security`) and `Permissions-Policy` (camera/microphone/geolocation all denied — the app uses none of them) round out the header set. The future tightening path for `script-src` is a hash-based or nonce-based CSP via the `nuxt-security` module, which can compute per-build script hashes at generate time; this was deferred to keep the static-hosting deploy simple, since the current policy still blocks arbitrary third-party script injection (the actual XSS-relevant threat — see the "No `v-html`" rule) and does not weaken `object-src`, `frame-ancestors`, or `connect-src`.

### 6. Clickjacking (Red Team: Iframe Embedding)

**Threat:** An attacker embeds the simulator in an iframe on a malicious site with misleading context (e.g., "Win real money!").

**Blue Team Response:** The `X-Frame-Options: DENY` header prevents iframe embedding entirely. This is included in the CSP header block above.

### 7. Open Redirect / URL Manipulation (Red Team: Malicious Navigation)

**Threat:** An attacker crafts a URL with unexpected routes or query parameters that manipulate the SPA.

**Assessment:** The app has exactly two routes (`/` and `/table`). Vue Router only recognizes declared routes. No query parameters are used for state initialization — all state comes from Pinia/localStorage.

**Blue Team Response:**
- Catch-all route redirects to setup:
```typescript
// app/pages/[...slug].vue → redirects to /
{ path: '/:pathMatch(.*)*', redirect: '/' }
```
- Never use URL query parameters to initialize game state.
- Never use `window.location.href` with user-supplied values.

### 8. Integer Arithmetic Overflow (Red Team: Payout Manipulation)

**Threat:** The simulator uses integer-cent arithmetic for all money calculations. If a bet amount or payout exceeds JavaScript's `Number.MAX_SAFE_INTEGER` (2^53 - 1 = 9,007,199,254,740,991 cents ≈ $90 trillion), arithmetic becomes imprecise.

**Assessment:** With a maximum table bet of $50,000 (5,000,000 cents) and maximum odds of 100×, the largest single payout is $50,000 × 100 × 2 = $10,000,000 (1,000,000,000 cents). This is 7 orders of magnitude below the safe integer limit. Overflow is physically impossible with the configured stake levels.

**Blue Team Response:** No action needed. The stake level system caps all values well within safe integer range. If custom stake levels are ever added, validate that `maxBet × maxOddsMultiple × maxPayoutRatio < Number.MAX_SAFE_INTEGER / 100`.

---

## Future Considerations (If Supabase Is Added)

If persistent roll history via Supabase is added in a future phase:

- **Row-Level Security (RLS):** Every Supabase table must have RLS enabled. Users can only read/write their own data.
- **Auth:** Use Supabase Auth with magic link or GitHub OAuth. Never store passwords.
- **API keys:** Supabase `anon` key is safe to expose in client-side code (it's designed for this). The `service_role` key must NEVER appear in client code.
- **Rate limiting:** Supabase handles this at the API level, but the client should debounce writes (save session stats at most once per 30 seconds, not after every roll).
- **Data validation:** All writes to Supabase should be validated server-side via RLS policies to prevent fabricated stats.

---

## Security Checklist — Per Phase

| Phase | Security Checks |
|-------|----------------|
| 1 | Hero name input sanitized (32 char max, no HTML tags). No `v-html` in any template. SVG zone IDs are hardcoded strings, not user-derived. |
| 2 | RNG uses `Math.random()` — documented as intentional. Integer-cent arithmetic for all money values. Payout calculator uses integer division, never floating-point. |
| 3 | localStorage writes wrapped in try/catch. Corrupted localStorage triggers graceful reset to defaults. Confirmation dialog on session-ending navigation. |
| 4 | Bot strategies are deterministic with hardcoded names — no user input affects bot behavior or identity. |
| 5 | Stats panel reads from Pinia store getters, not directly from localStorage. Store validates data shape on hydration from localStorage. |
| 6 | CSP headers added to `netlify.toml`. X-Frame-Options: DENY. X-Content-Type-Options: nosniff. Catch-all route redirect active. |

---

## Canonical Rules

These security rules apply to every phase build:

1. **No `v-html`.** Ever. For any content. Use Vue template interpolation (`{{ }}`) exclusively.
2. **No CDN scripts.** All code bundled at build time.
3. **No URL-based state.** State lives in Pinia and localStorage only.
4. **No secrets.** The SPA has zero environment variables with sensitive values.
5. **Commit `pnpm-lock.yaml`.** Build with `--frozen-lockfile`.
6. **Integer cents.** All money as integers. No floating-point currency.
7. **Sanitize input.** The hero name is the only user-supplied text. Sanitize it.
