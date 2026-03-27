/**
 * Token derivation from 3 core colors — based on Ditto's algorithm.
 * Converts hex → HSL internally, derives 19 CSS custom properties.
 */
import type { ThemeTokens } from './types'

// --- HSL utilities ---

interface HSL {
  h: number // 0-360
  s: number // 0-100
  l: number // 0-100
}

export function hexToHsl(hex: string): HSL {
  const rgb = hexToRgb(hex)
  const r = rgb.r / 255
  const g = rgb.g / 255
  const b = rgb.b / 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2
  let h = 0
  let s = 0

  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break
      case g: h = ((b - r) / d + 2) / 6; break
      case b: h = ((r - g) / d + 4) / 6; break
    }
  }

  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) }
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const clean = hex.replace('#', '')
  return {
    r: parseInt(clean.substring(0, 2), 16),
    g: parseInt(clean.substring(2, 4), 16),
    b: parseInt(clean.substring(4, 6), 16),
  }
}

export function hslToHex(h: number, s: number, l: number): string {
  const sn = s / 100
  const ln = l / 100
  const c = (1 - Math.abs(2 * ln - 1)) * sn
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = ln - c / 2
  let r = 0, g = 0, b = 0

  if (h < 60)      { r = c; g = x; b = 0 }
  else if (h < 120) { r = x; g = c; b = 0 }
  else if (h < 180) { r = 0; g = c; b = x }
  else if (h < 240) { r = 0; g = x; b = c }
  else if (h < 300) { r = x; g = 0; b = c }
  else              { r = c; g = 0; b = x }

  const toHex = (v: number) => Math.round((v + m) * 255).toString(16).padStart(2, '0')
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

/** Format as Ditto-style HSL string: "228 20% 10%" */
export function hslString(hsl: HSL): string {
  return `${hsl.h} ${hsl.s}% ${hsl.l}%`
}

/** Parse Ditto-style HSL string back to HSL */
export function parseHslString(str: string): HSL {
  const parts = str.replace(/%/g, '').trim().split(/\s+/)
  return { h: Number(parts[0]), s: Number(parts[1]), l: Number(parts[2]) }
}

/** Convert hex to Ditto HSL string */
export function hexToHslString(hex: string): string {
  return hslString(hexToHsl(hex))
}

/** Convert Ditto HSL string to hex */
export function hslStringToHex(str: string): string {
  const { h, s, l } = parseHslString(str)
  return hslToHex(h, s, l)
}

// --- Derivation helpers ---

function isDark(bgHex: string): boolean {
  const { l } = hexToHsl(bgHex)
  return l < 40
}

function lighten(hsl: HSL, amount: number): HSL {
  return { ...hsl, l: Math.min(100, hsl.l + amount) }
}

function darken(hsl: HSL, amount: number): HSL {
  return { ...hsl, l: Math.max(0, hsl.l - amount) }
}

function adjustSaturation(hsl: HSL, factor: number): HSL {
  return { ...hsl, s: Math.max(0, Math.min(100, Math.round(hsl.s * factor))) }
}

// --- Main derivation ---

/**
 * Derive 19 CSS custom properties from 3 core hex colors.
 * Follows Ditto's algorithm: surface, border, muted, etc. are all computed.
 */
export function deriveTokensFromCore(bgHex: string, textHex: string, primaryHex: string): ThemeTokens {
  const dark = isDark(bgHex)
  const bg = hexToHsl(bgHex)
  const text = hexToHsl(textHex)
  const primary = hexToHsl(primaryHex)

  // Surface colors
  const surface = dark ? lighten(bg, 2) : bg
  const surface2 = dark ? lighten(bg, 8) : darken(bg, 4)

  // Border: primary hue, reduced saturation
  const borderHsl: HSL = dark
    ? { h: primary.h, s: Math.round(primary.s * 0.4), l: 30 }
    : { h: primary.h, s: Math.round(primary.s * 0.5), l: 82 }

  // Muted text
  const mutedText: HSL = dark
    ? { h: text.h, s: Math.max(text.s - 20, 0), l: Math.max(text.l - 30, 40) }
    : { h: text.h, s: Math.max(text.s - 30, 0), l: Math.min(text.l + 35, 55) }

  // Primary hover
  const primaryHover = dark ? lighten(primary, 8) : darken(primary, 8)

  // Primary foreground: auto-contrast
  const primaryIsDark = primary.l < 50
  const primaryFg = primaryIsDark
    ? { h: 0, s: 0, l: 100 }
    : { h: 222, s: 84, l: 5 }

  // Secondary
  const secondary = surface2
  const secondaryFg = text

  // Destructive
  const destructive: HSL = dark
    ? { h: 0, s: 72, l: 51 }
    : { h: 0, s: 84, l: 60 }
  const destructiveFg: HSL = dark
    ? { h: 0, s: 0, l: 95 }
    : { h: 0, s: 0, l: 100 }

  return {
    '--color-bg': hslToHex(bg.h, bg.s, bg.l),
    '--color-surface': hslToHex(surface.h, surface.s, surface.l),
    '--color-surface2': hslToHex(surface2.h, surface2.s, surface2.l),
    '--color-border': hslToHex(borderHsl.h, borderHsl.s, borderHsl.l),
    '--color-text': hslToHex(text.h, text.s, text.l),
    '--color-text-muted': hslToHex(mutedText.h, mutedText.s, mutedText.l),
    '--color-primary': hslToHex(primary.h, primary.s, primary.l),
    '--color-primary-hover': hslToHex(primaryHover.h, primaryHover.s, primaryHover.l),
    '--color-primary-text': hslToHex(primaryFg.h, primaryFg.s, primaryFg.l),
    '--color-secondary': hslToHex(secondary.h, secondary.s, secondary.l),
    '--color-secondary-text': hslToHex(secondaryFg.h, secondaryFg.s, secondaryFg.l),
    '--color-accent': hslToHex(primary.h, primary.s, primary.l),
    '--color-accent-text': hslToHex(primaryFg.h, primaryFg.s, primaryFg.l),
    '--color-destructive': hslToHex(destructive.h, destructive.s, destructive.l),
    '--color-destructive-text': hslToHex(destructiveFg.h, destructiveFg.s, destructiveFg.l),
    '--color-input': hslToHex(borderHsl.h, borderHsl.s, borderHsl.l),
    '--color-ring': hslToHex(primary.h, primary.s, primary.l),
    '--color-popover': hslToHex(surface.h, surface.s, surface.l),
    '--color-popover-text': hslToHex(text.h, text.s, text.l),
  }
}

/**
 * Build a CSS string from tokens, suitable for injecting into a <style> element.
 */
export function buildThemeCss(tokens: ThemeTokens, selector = ':root'): string {
  const vars = Object.entries(tokens)
    .map(([k, v]) => `  ${k}: ${v};`)
    .join('\n')
  return `${selector} {\n${vars}\n}`
}
