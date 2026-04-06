# Design System — Trucapp

## Product Context
- **What this is:** Truco card game scoring app for friend groups
- **Who it's for:** Argentine card players tracking scores during game nights
- **Space/industry:** Social gaming, card game utilities
- **Project type:** Mobile-first PWA (React + Vite + Tailwind + Firebase)

## Aesthetic Direction
- **Direction:** Dark Premium / Club Social
- **Decoration level:** Intentional — glassmorphism panels with subtle blur and border, skeleton shimmer loaders
- **Mood:** A game night at a nice bar. Warm darkness, intentional color pops. Not esports-neon, not corporate-dashboard.

## Typography
- **Font family:** Outfit (sole font, loaded from Google Fonts)
- **Display/Hero:** Outfit 800-900 — geometric personality, strong presence for scores and headings
- **Body:** Outfit 400-500 — clean and readable at small sizes
- **UI/Labels:** Outfit 600-700 uppercase with tracking for section labels
- **Data/Scores:** Outfit with `font-variant-numeric: tabular-nums` — keeps score columns aligned
- **Code:** Not applicable (no code display in this product)
- **Loading:** Google Fonts CDN with `display=swap`
- **Scale:**
  - 3xl: 30px / 900 (hero scores)
  - 2xl: 24px / 800 (section headings)
  - xl: 20px / 700 (card titles)
  - lg: 16px / 600 (buttons, labels)
  - base: 14px / 400 (body text)
  - sm: 12px / 500 (secondary text)
  - xs: 11px / 700 uppercase tracking-widest (micro labels, badges)

## Color
- **Approach:** Restrained — two team colors + neutrals, color is meaningful not decorative
- **Palette:**

| Token | Hex | Usage |
|-------|-----|-------|
| `--color-bg` | #1c1c1e | Page background (charcoal) |
| `--color-surface` | #2c2c2e | Cards, panels, elevated containers |
| `--color-surface-hover` | #3a3a3c | Interactive surface hover state |
| `--color-border` | #38383a | Subtle dividers between sections |
| `--color-text-primary` | #f5f5f5 | Primary text (off-white) |
| `--color-text-secondary` | #aeaeb2 | Secondary text, descriptions |
| `--color-text-muted` | #636366 | Disabled text, placeholders |
| `--color-nosotros` | #4ade80 | Team "Nosotros" (emerald green, like the felt) |
| `--color-ellos` | #fbbf24 | Team "Ellos" (amber/gold) |
| `--color-accent` | #4ade80 | Primary CTA, active states |
| `--color-danger` | #ff453a | Destructive actions, errors |
| `--color-success` | #32d74b | Success feedback |

- **Dark mode:** This IS the dark mode. No light mode planned.
- **Team colors rule:** Green = Nosotros, Amber = Ellos. Never swap. Never use team colors for non-team UI elements.

## Spacing
- **Base unit:** 4px
- **Density:** Comfortable (mobile touch targets)
- **Scale:** 2xs(2px) xs(4px) sm(8px) md(16px) lg(24px) xl(32px) 2xl(48px) 3xl(64px)
- **Touch targets:** Minimum 44px height for interactive elements

## Layout
- **Approach:** Full-screen PWA, single-column mobile-first
- **Grid:** Single column, card-based content areas
- **Max content width:** 100vw (phone app, no max-width needed)
- **Border radius:**
  - Standard cards/panels: 16px (`--radius-lg`)
  - Pills/badges: 9999px (`--radius-full`)
  - Buttons: 12px
  - Inputs: 12px
- **Safe areas:** Always respect `env(safe-area-inset-*)` for notched devices

## Motion
- **Approach:** Intentional — animations that communicate state changes
- **Easing:** `cubic-bezier(0.16, 1, 0.3, 1)` for entrances (spring-like overshoot)
- **Duration:**
  - Micro (hover, press): 180ms
  - Short (tab switch, fade): 220ms
  - Medium (slide-up, card entrance): 500ms
  - Shimmer (loading): 1200ms infinite
- **Patterns:**
  - `card-in`: translateY + rotate + scale for card reveals
  - `card-float`: gentle hover animation for idle cards
  - `slideUp`: content entrance from below
  - `tabFadeSlide`: tab content transition
  - `shimmer`: skeleton loading state
- **Rule:** Every animation must have a purpose. No decorative motion.

## Glassmorphism
- **Panel background:** `rgba(44, 44, 46, 0.8)`
- **Backdrop filter:** `blur(20px)`
- **Border:** `1px solid rgba(255, 255, 255, 0.1)`
- **Usage:** Elevated containers that need visual depth (modals, floating panels)
- **Avoid:** Don't stack glassmorphism panels (performance + visual noise)

## Decisions Log
| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-04-06 | Initial design system created | Formalized existing visual direction from index.css via /design-consultation |
| 2026-04-06 | Removed Sora font | Loaded but never used, ~40KB wasted per page load |
| 2026-04-06 | Single-font stack (Outfit only) | Speed + cohesion over typographic contrast. Can add display face later if needed |
| 2026-04-06 | No light mode | Game app used at night. White flash during game night is a UX failure |
