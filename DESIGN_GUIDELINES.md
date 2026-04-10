# Ingfo Design Guidelines

Design system for the **ingfo** monorepo. All apps and packages follow these conventions to maintain visual consistency. The palette draws from Claude's warm, approachable aesthetic — earthy tones, soft contrasts, and minimal ornamentation.

> **Tailwind CSS v4** — This project uses the CSS-first configuration model. All theme customizations live in CSS via `@theme`, not in a `tailwind.config.js` file.

---

## 1. Color Palette

### 1.1 Theme Setup (Tailwind v4)

Define custom colors in your global CSS file (e.g. `apps/web-extension/entrypoints/popup/style.css`):

```css
@import "tailwindcss";

@theme {
  /* --- Primary (warm sand/beige) --- */
  --color-primary-50:  #FDF8F3;
  --color-primary-100: #F9ECDF;
  --color-primary-200: #F2D7BF;
  --color-primary-300: #E8BC96;
  --color-primary-400: #D4A27F;
  --color-primary-500: #C08A64;
  --color-primary-600: #A5714F;
  --color-primary-700: #875A3D;
  --color-primary-800: #6B4730;
  --color-primary-900: #523726;
  --color-primary-950: #3A2619;

  /* --- Accent (terracotta/orange) --- */
  --color-accent-50:  #FDF2ED;
  --color-accent-100: #FAE0D4;
  --color-accent-200: #F4BDA8;
  --color-accent-300: #ED9A7C;
  --color-accent-400: #E07A5F;
  --color-accent-500: #D15F42;
  --color-accent-600: #B74832;
  --color-accent-700: #963828;
  --color-accent-800: #792F24;
  --color-accent-900: #5E2620;
  --color-accent-950: #3F1611;

  /* --- Neutral (warm grays) --- */
  --color-neutral-50:  #FAF8F6;
  --color-neutral-100: #F3F0EC;
  --color-neutral-200: #E5E0DA;
  --color-neutral-300: #D1C9C0;
  --color-neutral-400: #B5AAA0;
  --color-neutral-500: #968A7E;
  --color-neutral-600: #7A6F64;
  --color-neutral-700: #635951;
  --color-neutral-800: #4A4239;
  --color-neutral-900: #352F29;
  --color-neutral-950: #201C18;

  /* --- Semantic --- */
  --color-success-50:  #F0F9F1;
  --color-success-100: #D9F0DB;
  --color-success-500: #5D9D62;
  --color-success-700: #3D7041;

  --color-warning-50:  #FFF9EB;
  --color-warning-100: #FFEFC4;
  --color-warning-500: #D4A017;
  --color-warning-700: #9A7412;

  --color-error-50:  #FDF2F2;
  --color-error-100: #FAD9D9;
  --color-error-500: #C0392B;
  --color-error-700: #8E2B21;

  --color-info-50:  #EFF6FA;
  --color-info-100: #D4E8F2;
  --color-info-500: #4A8DAD;
  --color-info-700: #346678;

  /* --- Surface (backgrounds) --- */
  --color-surface:        #FFFBF7;
  --color-surface-raised: #FFF6EE;
  --color-surface-sunken: #F5EDE4;

  /* --- Dark mode surfaces --- */
  --color-surface-dark:        #1E1A17;
  --color-surface-raised-dark: #2A2520;
  --color-surface-sunken-dark: #141210;
}
```

### 1.2 Usage Quick-Reference

| Role | Light Mode Class | Value |
|---|---|---|
| Page background | `bg-surface` | `#FFFBF7` |
| Card / panel | `bg-surface-raised` | `#FFF6EE` |
| Inset / well | `bg-surface-sunken` | `#F5EDE4` |
| Primary button | `bg-primary-400 text-white` | `#D4A27F` |
| Primary hover | `hover:bg-primary-500` | `#C08A64` |
| CTA / destructive | `bg-accent-400 text-white` | `#E07A5F` |
| Body text | `text-neutral-900` | `#352F29` |
| Secondary text | `text-neutral-500` | `#968A7E` |
| Border | `border-neutral-200` | `#E5E0DA` |

---

## 2. Typography

Use **Inter** as the primary typeface. Fall back to the system sans-serif stack.

### 2.1 Font Family (CSS)

```css
@theme {
  --font-sans: "Inter", ui-sans-serif, system-ui, -apple-system, sans-serif;
}
```

### 2.2 Type Scale

| Name | Tailwind Class | Size | Use Case |
|---|---|---|---|
| xs | `text-xs` | 12px / 0.75rem | Captions, badges |
| sm | `text-sm` | 14px / 0.875rem | Helper text, labels |
| base | `text-base` | 16px / 1rem | Body copy |
| lg | `text-lg` | 18px / 1.125rem | Lead paragraphs |
| xl | `text-xl` | 20px / 1.25rem | Section headings (h3) |
| 2xl | `text-2xl` | 24px / 1.5rem | Page sub-headings (h2) |
| 3xl | `text-3xl` | 30px / 1.875rem | Page titles (h1) |

### 2.3 Font Weight

| Weight | Tailwind Class | Use Case |
|---|---|---|
| 400 | `font-normal` | Body text |
| 500 | `font-medium` | Labels, buttons, navigation |
| 600 | `font-semibold` | Headings, emphasis |
| 700 | `font-bold` | Hero headings (use sparingly) |

### 2.4 Line Height

- Body text: `leading-relaxed` (1.625)
- Headings: `leading-tight` (1.25)
- UI labels / buttons: `leading-none` (1) or `leading-snug` (1.375)

---

## 3. Spacing

Use Tailwind's default 4px-based spacing scale. Prefer these standard stops to maintain rhythm:

| Token | Value | Common Use |
|---|---|---|
| `1` | 4px | Inline icon gaps |
| `2` | 8px | Tight padding (badges, chips) |
| `3` | 12px | Input padding-x |
| `4` | 16px | Default component padding |
| `6` | 24px | Card padding, section gaps |
| `8` | 32px | Section spacing |
| `12` | 48px | Major layout gaps |
| `16` | 64px | Page-level vertical spacing |

**Browser extension note:** Popup width is constrained (typically 320-400px). Prefer compact spacing (`p-3`, `p-4`, `gap-2`, `gap-3`) in extension views.

---

## 4. Border Radius

```css
@theme {
  --radius-sm:  4px;   /* Badges, tags */
  --radius-md:  8px;   /* Buttons, inputs */
  --radius-lg:  12px;  /* Cards, modals */
  --radius-xl:  16px;  /* Feature panels */
  --radius-full: 9999px; /* Avatars, pills */
}
```

| Element | Class | Radius |
|---|---|---|
| Buttons | `rounded-md` | 8px |
| Inputs | `rounded-md` | 8px |
| Cards | `rounded-lg` | 12px |
| Badges / pills | `rounded-full` | 9999px |
| Avatars | `rounded-full` | 9999px |

---

## 5. Shadows

Keep shadows warm by tinting them with the neutral palette rather than pure black.

```css
@theme {
  --shadow-sm:  0 1px 2px 0 rgb(53 47 41 / 0.05);
  --shadow-md:  0 4px 6px -1px rgb(53 47 41 / 0.08), 0 2px 4px -2px rgb(53 47 41 / 0.05);
  --shadow-lg:  0 10px 15px -3px rgb(53 47 41 / 0.08), 0 4px 6px -4px rgb(53 47 41 / 0.04);
  --shadow-xl:  0 20px 25px -5px rgb(53 47 41 / 0.10), 0 8px 10px -6px rgb(53 47 41 / 0.04);
}
```

| Level | Class | Use Case |
|---|---|---|
| Subtle | `shadow-sm` | Inputs, subtle cards |
| Default | `shadow-md` | Floating cards, dropdowns |
| Elevated | `shadow-lg` | Modals, popovers |
| Prominent | `shadow-xl` | Toast notifications |

---

## 6. Breakpoints

Tailwind v4 ships with sensible defaults. For the browser extension popup, breakpoints are largely irrelevant since the viewport is fixed. If shared UI packages need responsive behavior (e.g. for an options page rendered as a full tab), use the standard set:

| Name | Min Width | Typical Use |
|---|---|---|
| `sm` | 640px | Landscape mobile |
| `md` | 768px | Tablets |
| `lg` | 1024px | Desktop |
| `xl` | 1280px | Wide desktop |

For the popup specifically, design for a **fixed width of 380px** and let height be dynamic.

---

## 7. Dark Mode

Use Tailwind's `dark:` variant with the `prefers-color-scheme` media strategy (default in v4).

### 7.1 Dark Mode Mapping

| Token | Light | Dark |
|---|---|---|
| Page bg | `surface` (#FFFBF7) | `surface-dark` (#1E1A17) |
| Card bg | `surface-raised` (#FFF6EE) | `surface-raised-dark` (#2A2520) |
| Well bg | `surface-sunken` (#F5EDE4) | `surface-sunken-dark` (#141210) |
| Body text | `neutral-900` (#352F29) | `neutral-100` (#F3F0EC) |
| Secondary text | `neutral-500` (#968A7E) | `neutral-400` (#B5AAA0) |
| Borders | `neutral-200` (#E5E0DA) | `neutral-700` (#635951) |
| Primary btn bg | `primary-400` (#D4A27F) | `primary-500` (#C08A64) |
| Accent btn bg | `accent-400` (#E07A5F) | `accent-500` (#D15F42) |

### 7.2 Usage Example

```html
<div class="bg-surface dark:bg-surface-dark">
  <div class="bg-surface-raised dark:bg-surface-raised-dark rounded-lg p-4">
    <p class="text-neutral-900 dark:text-neutral-100">Content</p>
  </div>
</div>
```

### 7.3 Principle

Dark mode is not an inversion. Warm undertones carry through: dark backgrounds remain brown-black rather than blue-black, and text uses `neutral-100` (warm off-white) rather than pure `#FFF`.

---

## 8. Component Patterns (Reference)

These are not strict rules but starting-point recipes.

### Button (Primary)

```html
<button class="bg-primary-400 hover:bg-primary-500 active:bg-primary-600
               text-white font-medium text-sm
               px-4 py-2 rounded-md shadow-sm
               transition-colors duration-150
               dark:bg-primary-500 dark:hover:bg-primary-400">
  Label
</button>
```

### Button (Accent / CTA)

```html
<button class="bg-accent-400 hover:bg-accent-500 active:bg-accent-600
               text-white font-medium text-sm
               px-4 py-2 rounded-md shadow-sm
               transition-colors duration-150
               dark:bg-accent-500 dark:hover:bg-accent-400">
  Label
</button>
```

### Card

```html
<div class="bg-surface-raised dark:bg-surface-raised-dark
            border border-neutral-200 dark:border-neutral-700
            rounded-lg shadow-sm p-4">
  <!-- content -->
</div>
```

### Input

```html
<input class="w-full bg-white dark:bg-surface-dark
              border border-neutral-300 dark:border-neutral-600
              rounded-md px-3 py-2 text-sm
              text-neutral-900 dark:text-neutral-100
              placeholder:text-neutral-400
              focus:outline-none focus:ring-2 focus:ring-primary-300
              dark:focus:ring-primary-600" />
```

---

## 9. File Organization

```
ingfo/
├── apps/
│   └── web-extension/
│       └── entrypoints/popup/
│           └── style.css          <- @import "tailwindcss" + @theme block
├── packages/
│   └── ui/                        <- (future) shared component library
│       └── src/styles/
│           └── theme.css          <- shared @theme tokens
└── DESIGN_GUIDELINES.md           <- this file
```

When a shared `packages/ui` is introduced, extract the `@theme` block into `packages/ui/src/styles/theme.css` and `@import` it from each app's entry CSS.

---

## 10. Accessibility Checklist

- All text meets **WCAG AA** contrast (4.5:1 for normal text, 3:1 for large text). The palette has been chosen with this in mind — verify with tooling when combining non-standard pairings.
- Interactive elements have visible `:focus-visible` outlines (`ring-2 ring-primary-300`).
- Color is never the sole indicator of state — pair with icons or text labels.
- Respect `prefers-reduced-motion` — wrap animations with `motion-safe:`.
- Respect `prefers-color-scheme` for dark mode.
