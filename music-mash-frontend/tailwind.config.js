/**
 * MusicMash design tokens (docs/MUSICMASH_DESIGN_SYSTEM.md), derived from docs/DESIGN.md.
 *
 * The theme REPLACES Tailwind's defaults for colours, radii, shadows and background images
 * instead of extending them, so off-system styles (purple accents, rounded-2xl, glow shadows,
 * gradients) cannot creep back in: those classes simply do not exist.
 *
 * Spacing keeps Tailwind's 4px scale, which already matches every DESIGN.md spacing token:
 * 1=4px 2=8px 3=12px 4=16px 5=20px 6=24px 8=32px 10=40px 12=48px 16=64px 24=96px; 45=180px added.
 */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    colors: {
      transparent: 'transparent',
      current: 'currentColor',
      black: '#000000',
      obsidian: '#121212',     // page background (surface 0)
      graphite: '#303030',     // inputs, panels (surface 1)
      'mid-gray': '#666666',   // hover tier, dividers (surface 2)
      fog: '#999999',          // muted text, ghost buttons
      silver: '#cccccc',       // hairlines on light surfaces
      bone: '#f2f2f2',         // the single light band
      white: '#ffffff',        // primary text and primary buttons
      signal: '#699fff',       // links, focus accents, the live dot. Never a button fill.
      // Status colours are DATA (pitch-chart bands, problem sections), not decoration.
      status: {
        good: '#0ca30c',
        warning: '#fab219',
        critical: '#d03b3b',
      },
    },
    fontFamily: {
      sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace'],
    },
    fontSize: {
      caption: ['12px', { lineHeight: '1.41' }],
      'body-sm': ['14px', { lineHeight: '1.43' }],
      body: ['17px', { lineHeight: '1.41' }],
      subheading: ['22px', { lineHeight: '1.27' }],
      'heading-sm': ['28px', { lineHeight: '1.29' }],
      heading: ['36px', { lineHeight: '1.33' }],
      display: ['60px', { lineHeight: '1' }],
    },
    fontWeight: {
      thin: '100',      // display (60px) only
      normal: '400',
      semibold: '600',
      bold: '700',      // button labels, strong CTAs
    },
    borderRadius: {
      none: '0px',      // cards
      DEFAULT: '4px',   // buttons, inputs, badges, images
      full: '9999px',   // only for dots and avatars, never for buttons
    },
    boxShadow: {
      none: 'none',
      subtle: 'rgba(18, 18, 18, 0.1) 0px 0px 0px 1px inset',
    },
    backgroundImage: {},  // no gradients; the hero scrim is a dedicated CSS class
    extend: {
      spacing: { 45: '180px' },
      maxWidth: { page: '1200px' },
      aspectRatio: { cover: '1 / 1' },
      transitionTimingFunction: { out: 'cubic-bezier(0.22, 1, 0.36, 1)' },
    },
  },
  corePlugins: {
    backdropBlur: false,      // no glassmorphism
    backdropFilter: false,
  },
  plugins: [],
}
