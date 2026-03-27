/**
 * ThemeProvider — React context that applies the active theme as CSS custom properties.
 * Anti-flicker: disables transitions during theme swap.
 * Hook: useTheme() → { theme, setTheme, availableThemes }
 */
import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react'
import type { CrumbsTheme, ThemeContextValue } from './types'
import { deriveTokensFromCore, buildThemeCss } from './derive'
import { PRESET_THEMES, DEFAULT_THEME } from './presets'

const STORAGE_KEY = 'crumbs:theme'
const STYLE_ELEMENT_ID = 'crumbs-theme-vars'

const ThemeContext = createContext<ThemeContextValue>({
  theme: DEFAULT_THEME,
  setTheme: () => {},
  availableThemes: PRESET_THEMES,
})

/** Apply theme tokens to the document by injecting/updating a <style> element */
function applyThemeToDocument(theme: CrumbsTheme, selector = ':root') {
  const tokens = deriveTokensFromCore(
    theme.colors.background,
    theme.colors.text,
    theme.colors.primary,
  )
  const css = buildThemeCss(tokens, selector)

  // Add font overrides if specified
  let fontCss = ''
  if (theme.font?.body) {
    fontCss += `${selector} { --font-body: '${theme.font.body}', system-ui, sans-serif; }\n`
  }
  if (theme.font?.title) {
    fontCss += `${selector} { --font-title: '${theme.font.title}', system-ui, sans-serif; }\n`
  }

  let el = document.getElementById(STYLE_ELEMENT_ID) as HTMLStyleElement | null
  if (!el) {
    el = document.createElement('style')
    el.id = STYLE_ELEMENT_ID
    document.head.appendChild(el)
  }
  el.textContent = css + '\n' + fontCss
}

/** Anti-flicker: briefly disable all CSS transitions */
function suppressTransitions(): () => void {
  const el = document.createElement('style')
  el.textContent = '*, *::before, *::after { transition: none !important; }'
  document.head.appendChild(el)
  return () => {
    requestAnimationFrame(() => el.remove())
  }
}

/** Load saved theme ID from localStorage */
function loadSavedThemeId(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

/** Save theme ID to localStorage */
function saveThemeId(id: string) {
  try {
    localStorage.setItem(STORAGE_KEY, id)
  } catch {}
}

interface ThemeProviderProps {
  children: React.ReactNode
  /** Additional themes beyond presets (e.g. from Nostr) */
  extraThemes?: CrumbsTheme[]
  /** Override default theme */
  defaultTheme?: CrumbsTheme
}

export function ThemeProvider({ children, extraThemes = [], defaultTheme }: ThemeProviderProps) {
  const allThemes = [...PRESET_THEMES, ...extraThemes]
  const initialDefault = defaultTheme || DEFAULT_THEME

  const [theme, setThemeState] = useState<CrumbsTheme>(() => {
    const savedId = loadSavedThemeId()
    if (savedId) {
      const found = allThemes.find(t => t.id === savedId)
      if (found) return found
    }
    return initialDefault
  })

  const isFirstRender = useRef(true)

  // Apply theme on mount and changes
  useEffect(() => {
    if (isFirstRender.current) {
      // First render: apply without transition suppression
      applyThemeToDocument(theme)
      isFirstRender.current = false
    } else {
      // Subsequent changes: suppress transitions to avoid flicker
      const restore = suppressTransitions()
      applyThemeToDocument(theme)
      restore()
    }
  }, [theme])

  const setTheme = useCallback((newTheme: CrumbsTheme) => {
    setThemeState(newTheme)
    saveThemeId(newTheme.id)
  }, [])

  const value: ThemeContextValue = {
    theme,
    setTheme,
    availableThemes: allThemes,
  }

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  )
}

/** Hook to access and change the current theme */
export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext)
}

/**
 * Apply a scoped theme to a specific DOM element (for profile pages).
 * Returns a cleanup function.
 */
export function applyScopedTheme(theme: CrumbsTheme, elementId: string): () => void {
  const selector = `#${elementId}`
  const tokens = deriveTokensFromCore(
    theme.colors.background,
    theme.colors.text,
    theme.colors.primary,
  )
  const css = buildThemeCss(tokens, selector)

  const el = document.createElement('style')
  el.id = `crumbs-scoped-theme-${elementId}`
  el.textContent = css
  document.head.appendChild(el)

  return () => el.remove()
}
