# PROGRESS

## Current state

**Phase 1 complete.** Runnable Vite + React 18 + TypeScript project with the NEXUS design system, HashRouter shell, polished title screen, dev style guide and themed 404. No game logic yet.

### How to run

```bash
npm install          # first time only
npm run dev          # title screen at http://localhost:5173/
npm run verify       # typecheck + tests + production build
```

- Title: `/` (`#/`)
- Hub placeholder: `#/hub`
- Style guide: `#/dev/ui`
- Unknown route: themed 404

Production base path: `VITE_BASE=/nexus-idse-game/ npm run build`.

### What exists

- `package.json` — name `nexus-idse-game`; scripts `dev`, `build` (`tsc -b && vite build`), `preview`, `test` (`vitest run`), `typecheck` (`tsc -b`), `verify` (typecheck → test → build).
- `vite.config.ts` — `base = process.env.VITE_BASE ?? '/'`, React plugin, Vitest jsdom + globals + `src/test/setup.ts`.
- `tailwind.config.ts` / `postcss.config.js` / `src/index.css` — NEXUS tokens, fonts, grid/scanline utilities, palette CSS variables, cyan focus ring, reduced-motion override, subtle glitch keyframes.
- `src/main.tsx` — local Fontsource imports (Inter variable, Orbitron 600/800, JetBrains Mono 400/600). No CDN or network requests.
- `src/ui/` — `Panel`, `NeonButton`, `Badge`, `ProgressBar`, `Modal`, `Toast` + `ToastProvider`/`useToast`, `Tooltip`, `Tabs`, `Kbd`, `GridBackground`, `GlitchTitle`, `Stat`, barrel `index.ts`.
- `src/app/App.tsx` — `HashRouter` with `/`, `/hub`, `/dev/ui`, `*`; wrapped in `ToastProvider` and `ErrorBoundary`.
- `src/app/ErrorBoundary.tsx` — themed crash screen with RETURN TO HUB.
- `src/pages/Title.tsx` — NEXUS wordmark, tagline, deterministic paused-on-hidden particle canvas, NEW GAME (`btn-new-game`), disabled CONTINUE (`btn-continue`) and SETTINGS with tooltips, `Semester 5 - IDSE` footer.
- `src/pages/Hub.tsx`, `src/pages/DevUi.tsx`, `src/pages/NotFound.tsx`.
- `src/components/ParticleField.tsx` — muted canvas starfield, seeded layout, pauses when tab hidden and respects reduced motion.

### Tests

- `src/pages/__tests__/Title.test.tsx` — wordmark, tagline, NEW GAME enabled, CONTINUE disabled.
- `src/ui/__tests__/Panel.test.tsx` — eyebrow/title/action/body rendering.

Total: 2 tests in 2 files.

## Decisions

- **Vite/TypeScript versions.** The current `create-vite` template ships React 19, Vite 8 and TypeScript 7. The rules force React 18, so the project uses Vite 5.4, `@vitejs/plugin-react` 4.7, TypeScript 5.6 and Vitest 2.1 (all compatible with React 18). Dependencies remain exactly the AGENTS.md set.
- **`typecheck` = `tsc -b`.** The template's referenced configs set `noEmit`; build mode type-checks every referenced project without emitting.
- **Disabled CONTINUE.** Persistence does not exist yet, so CONTINUE is disabled and carries `No saved game` as both `title` and the component tooltip. It becomes live in the persistence phase.
- **NEW GAME** routes to the `/hub` placeholder; campaign creation arrives later.
- **Tooltip** is CSS-only (hover + focus-within) and also sets a native `title` as a fallback for disabled buttons.
- **Title animation** uses a seeded `mulberry32` field (no `Math.random`), stops on `visibilitychange`, and draws a static frame under `prefers-reduced-motion`.
- **Canvas in tests** is mocked (`getContext` returns null) and `matchMedia` is shimmed in `src/test/setup.ts`.
- **Dev routes** (`/dev/ui`) are present as required by Phase 1; they must be gated or removed in Phase 13 (`DEV_ONLY`).
- **Theme tokens** are duplicated intentionally as Tailwind colours and CSS variables so plain CSS utilities (grid, glitch, scanlines) can use them.

## API notes

- Barrel: `import { NeonButton, Panel, useToast } from '../ui'`.
- `NeonButton` accepts `variant` (`primary | ghost | danger`), `size` (`sm | md | lg`), `tooltip`, `fullWidth`, and all native button props. `data-testid` passes through.
- `Modal` props: `open`, `onClose`, `title`, `children`, `footer?`, `size?`; traps Tab, closes on Esc, restores focus and locks body scroll.
- `useToast().push({ message, tone?, duration? })`; tones `info | success | warning`; provider renders an `aria-live="polite"` stack.
- `ProgressBar` uses `role="progressbar"` with label/value.
- `App` is exported as a named component from `src/app/App.tsx`.

## Placeholders still open

- `/hub` shows a HUB placeholder panel (owned by the campaign hub phase).
- Title SETTINGS is disabled with a tooltip (settings phase).
- CONTINUE is disabled (persistence phase).

## Known issues

- Dev-only routes are not yet gated by `import.meta.env.DEV`; Phase 13 must remove/gate them.
- No README yet (final deliverable phase).
- Bundle includes Fontsource subsets for several scripts; acceptable, can be pruned later if size matters.

## Manual checks

- `npm run dev` → title screen with NEXUS wordmark, three buttons, footer.
- Resize or hide the tab → particle animation pauses.
- `#/dev/ui` → every component and the full colour palette.
- `#/does-not-exist` → themed 404 with RETURN TO TITLE.
- Tab through the title screen → visible cyan focus ring; disabled buttons expose tooltips.
