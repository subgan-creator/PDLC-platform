import type { Config } from 'tailwindcss';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const preset = require('@pdlc/ui/tailwind-preset');

export default {
  presets: [preset],
  content: ['./index.html', './src/**/*.{ts,tsx}', '../../packages/ui/src/**/*.{ts,tsx}'],
} satisfies Config;
