/**
 * Shared Tailwind preset. Design tokens are expressed as CSS variables in
 * ./src/styles/tokens.css and mapped here so both packages/ui and apps/web
 * compile against the same scale. Values are placeholders — a real brand
 * pass swaps the token file, not every component.
 */
// @ts-check

/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['class'],
  theme: {
    extend: {
      colors: {
        bg: 'rgb(var(--pdlc-color-bg) / <alpha-value>)',
        fg: 'rgb(var(--pdlc-color-fg) / <alpha-value>)',
        muted: 'rgb(var(--pdlc-color-muted) / <alpha-value>)',
        border: 'rgb(var(--pdlc-color-border) / <alpha-value>)',
        primary: 'rgb(var(--pdlc-color-primary) / <alpha-value>)',
        'primary-fg': 'rgb(var(--pdlc-color-primary-fg) / <alpha-value>)',
        danger: 'rgb(var(--pdlc-color-danger) / <alpha-value>)',
        focus: 'rgb(var(--pdlc-color-focus) / <alpha-value>)',
      },
      borderRadius: {
        sm: 'var(--pdlc-radius-sm)',
        md: 'var(--pdlc-radius-md)',
        lg: 'var(--pdlc-radius-lg)',
      },
      spacing: {
        1: 'var(--pdlc-space-1)',
        2: 'var(--pdlc-space-2)',
        3: 'var(--pdlc-space-3)',
        4: 'var(--pdlc-space-4)',
        6: 'var(--pdlc-space-6)',
        8: 'var(--pdlc-space-8)',
      },
    },
  },
  plugins: [],
};
