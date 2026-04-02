# Trucapp

Truco match scoring companion app. React 19 + Vite 7 + Tailwind 3.4 + Zustand 5 + Firebase 12.8, deployed to Vercel.

## Quick start

```bash
npm install
npm run dev     # http://localhost:5173
npm run build   # production build
npm run test    # vitest
```

## Architecture

- `src/components/` — React components (screens + UI elements)
- `src/store/` — Zustand stores (useMatchStore, useHistoryStore, usePicaPicaStore, useAuthStore, useUserStore, usePairStore)
- `src/services/` — Business logic (rivalryService)
- `src/utils/` — Pure utility functions (matchHelpers, matchIdentity, date)
- `src/types/` — TypeScript type definitions
- `src/firebase.ts` — Firebase initialization with offline persistence

## Design System

Always read DESIGN.md before making any visual or UI decisions.
All font choices, colors, spacing, and aesthetic direction are defined there.
Do not deviate without explicit user approval.

Key rules:
- Cancha Limpia Warm aesthetic: warm dark palette (#181614 bg, #f0ebe5 text)
- Team colors: #4ade80 (nosotros/green), #fbbf24 (ellos/amber)
- DM Sans is the only typeface (400, 500, 600, 700, 900 weights)
- Tally marks are the hero score display
- Dark mode only. No light mode.
- Mobile-first, max content width 420px

## Testing

```bash
npm run test          # run all tests
npm run test:watch    # watch mode
```

Framework: Vitest + @testing-library/react
Test files: colocated in `__tests__/` directories next to source

## Key patterns

- Match data flows through useMatchStore (Zustand + localStorage persist)
- Firebase Firestore for cloud persistence (offline-first with persistentLocalCache)
- Pica-pica (3v3) hand system managed by usePicaPicaStore
- Rivalry stats computed by rivalryService (pure functions, no side effects)
- All UI follows DESIGN.md Cancha Limpia Warm aesthetic

## Conventions

- Spanish for user-facing strings (Argentine Spanish)
- English for code (variable names, comments, commit messages)
- Components are PascalCase .tsx files
- Stores are camelCase use*.ts files
- Services are camelCase *Service.ts files

## Skill routing

When the user's request matches an available skill, ALWAYS invoke it using the Skill
tool as your FIRST action. Do NOT answer directly, do NOT use other tools first.
The skill has specialized workflows that produce better results than ad-hoc answers.

Key routing rules:
- Product ideas, "is this worth building", brainstorming → invoke office-hours
- Bugs, errors, "why is this broken", 500 errors → invoke investigate
- Ship, deploy, push, create PR → invoke ship
- QA, test the site, find bugs → invoke qa
- Code review, check my diff → invoke review
- Update docs after shipping → invoke document-release
- Weekly retro → invoke retro
- Design system, brand → invoke design-consultation
- Visual audit, design polish → invoke design-review
- Architecture review → invoke plan-eng-review
