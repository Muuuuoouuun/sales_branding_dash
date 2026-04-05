# DESIGN SYSTEM (Source of Truth)

This file serves as the definitive source of truth for the sales_branding_dash UI/UX, based on the **UI UX Pro Max** design intelligence methodology.

## 1. Pattern & Motivation
- **Style:** Modern Minimalist Dashboard + Soft UI
- **Industry:** B2B SaaS, CRM Dashboard, Sales Analytics
- **UX Goal:** Data-dense but incredibly clean, readable, and professional. Calm, focused environment.
- **Performance/A11y:** WCAG AA Contrast Ratios.

## 2. Color Palette (CSS Variables)

We use a clean slate/blue color palette for trust and focus, accented with standard status colors.

### Light Mode (Default)
- **Primary:** Royal Blue `#2563EB` (Trust, main actions)
- **Success (Accent):** Emerald Green `#10B981` (Goal met, positive growth)
- **Danger/Alert:** Coral Red `#EF4444` (Hot deals, critical alerts, missed targets)
- **Warning/Pending:** Amber `#F59E0B` (In progress, requires attention)
- **Backgrounds:** Warm White/Gray `#F8FAFC` (App background), `#FFFFFF` (Surface/Cards)
- **Text:** Dark Charcoal `#1E293B` (Primary reading), Slate `#64748B` (Secondary data)
- **Borders:** `#E2E8F0`

### Dark Mode
- **Primary:** Bright Blue `#3B82F6` or `#60A5FA`
- **Success (Accent):** `#34D399`
- **Danger/Alert:** `#F87171`
- **Warning/Pending:** `#FBBF24`
- **Backgrounds:** Slate Dark `#0F172A` (App background), Slate Darker `#1E293B` (Surface/Cards)
- **Text:** Slate Light `#F1F5F9` (Primary reading), Slate Muted `#94A3B8` (Secondary data)
- **Borders:** `#334155`

## 3. Typography
- **Primary Font:** `Inter`, `Roboto`, or system-ui (Standard sans-serif for UI elements).
- **Secondary/Data Font:** `Geist Mono`, `JetBrains Mono`, `Fira Code` or monospace (Use exclusively for numbers, currency, percentages, metrics).
- **Baseline Size:** 14px for data, 16px for body, 24px+ for dashboard headers.

## 4. Key Effects & Interactions
- **Transitions:** Smooth UI transitions (150ms-250ms). `transition: all 0.2s ease-in-out;`
- **Shadows (Soft UI):**
  - **Light mode card shadow:** `0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)`
  - **Dark mode card shadow:** None, use subtle borders (`1px solid #334155`) or inner glows.
- **Card Radius:** Minimum `12px` to `16px` for soft modern look.
- **Hover States:** Lighten or darken backgrounds slightly, lift cards (`transform: translateY(-2px);` with slightly stronger shadow).

## 5. Pre-Delivery Checklist
- [ ] Are all clickable elements using `cursor: pointer`?
- [ ] Do cards have consistent `12px` border-radius and soft shadows?
- [ ] Are numeric indicators using monospace font for aligned digits?
- [ ] Is there enough padding (`1.5rem` / `24px` minimum) inside widgets?
- [ ] Is dark mode contrast properly maintained without overly bright whites?

## 6. Anti-Patterns (Avoid at all costs!)
- ❌ Dark Mode Pitch Black: Never use `#000000` for backgrounds. Use `#0F172A`.
- ❌ Hard Shadows: Never use heavy, opaque shadows `rgba(0,0,0,0.5)`.
- ❌ Neon Gradients: This is a professional B2B CRM, keep it formal. Avoid pink/purple AI gradients.
- ❌ Cramped Data: Do not squeeze content. Add breathing room between widgets.
