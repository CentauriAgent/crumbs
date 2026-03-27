/**
 * Crumbs Theme Types
 * Compatible with Ditto theme system (kinds 16767/36767)
 */

/** The 3 core colors that define an entire theme. All tokens derived from these. */
export interface CoreThemeColors {
  background: string // hex: "#1a1510"
  text: string       // hex: "#E8DCC8"
  primary: string    // hex: "#D4A853"
}

export interface ThemeFont {
  body?: string  // CSS font-family for body text
  title?: string // CSS font-family for profile display names
}

export interface ThemeFontWithUrl {
  family: string
  url?: string   // URL to .woff2/.ttf/.otf
  role: 'body' | 'title'
}

export interface ThemeBackground {
  type: 'color' | 'image' | 'gradient'
  value: string // hex color, image URL, or CSS gradient
  mode?: 'cover' | 'tile'
  mimeType?: string
  dimensions?: string // "1920x1080"
  blurhash?: string
}

/** Complete Crumbs theme */
export interface CrumbsTheme {
  id: string
  name: string
  colors: CoreThemeColors
  font?: ThemeFont
  background?: ThemeBackground
  isDitto?: boolean // true if loaded from Nostr kind 16767/36767
  sourceRef?: string // "36767:<pubkey>:<d-tag>" attribution reference
  description?: string
}

/** The 19 derived CSS custom properties */
export interface ThemeTokens {
  '--color-bg': string
  '--color-surface': string
  '--color-surface2': string
  '--color-border': string
  '--color-text': string
  '--color-text-muted': string
  '--color-primary': string
  '--color-primary-hover': string
  '--color-primary-text': string
  '--color-secondary': string
  '--color-secondary-text': string
  '--color-accent': string
  '--color-accent-text': string
  '--color-destructive': string
  '--color-destructive-text': string
  '--color-input': string
  '--color-ring': string
  '--color-popover': string
  '--color-popover-text': string
}

/** Theme context value exposed by useTheme() */
export interface ThemeContextValue {
  theme: CrumbsTheme
  setTheme: (theme: CrumbsTheme) => void
  availableThemes: CrumbsTheme[]
}
