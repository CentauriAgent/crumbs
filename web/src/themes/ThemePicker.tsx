/**
 * ThemePicker — Grid of theme swatches with preview + apply.
 * Compact enough for a settings dropdown.
 */
import React, { useState, useCallback } from 'react'
import { useTheme } from './ThemeProvider'
import type { CrumbsTheme } from './types'

interface ThemePickerProps {
  /** Called after theme is applied (e.g. to close dropdown) */
  onSelect?: (theme: CrumbsTheme) => void
  /** Show "Publish to Nostr" button */
  showPublish?: boolean
  /** Called when user wants to publish theme */
  onPublish?: (theme: CrumbsTheme) => void
  /** Called when user clicks "Browse Nostr themes" */
  onBrowse?: () => void
  /** Show custom color picker option */
  showCustom?: boolean
  className?: string
}

/** Single color swatch for a theme */
function ThemeSwatch({
  theme,
  isActive,
  onHover,
  onClick,
}: {
  theme: CrumbsTheme
  isActive: boolean
  onHover: (theme: CrumbsTheme | null) => void
  onClick: (theme: CrumbsTheme) => void
}) {
  return (
    <button
      type="button"
      onClick={() => onClick(theme)}
      onMouseEnter={() => onHover(theme)}
      onMouseLeave={() => onHover(null)}
      title={theme.name}
      aria-label={`Apply ${theme.name} theme`}
      aria-pressed={isActive}
      style={{
        width: 36,
        height: 36,
        borderRadius: '50%',
        border: isActive ? `2px solid ${theme.colors.primary}` : '2px solid transparent',
        background: `linear-gradient(135deg, ${theme.colors.background} 40%, ${theme.colors.primary} 60%)`,
        cursor: 'pointer',
        outline: 'none',
        transition: 'transform 100ms ease, box-shadow 100ms ease',
        transform: isActive ? 'scale(1.1)' : 'scale(1)',
        boxShadow: isActive ? `0 0 0 2px var(--color-bg), 0 0 0 4px ${theme.colors.primary}` : 'none',
      }}
    />
  )
}

/** Custom color picker mini-form */
function CustomColorPicker({
  onApply,
}: {
  onApply: (colors: { background: string; text: string; primary: string }) => void
}) {
  const [bg, setBg] = useState('#1a1510')
  const [text, setText] = useState('#E8DCC8')
  const [primary, setPrimary] = useState('#D4A853')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '8px 0' }}>
      <div style={{ fontSize: 12, color: 'var(--color-text-muted)', fontWeight: 600 }}>Custom Colors</div>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--color-text-muted)' }}>
          BG
          <input type="color" value={bg} onChange={e => setBg(e.target.value)}
            style={{ width: 28, height: 28, border: 'none', cursor: 'pointer', background: 'none' }} />
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--color-text-muted)' }}>
          Text
          <input type="color" value={text} onChange={e => setText(e.target.value)}
            style={{ width: 28, height: 28, border: 'none', cursor: 'pointer', background: 'none' }} />
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--color-text-muted)' }}>
          Accent
          <input type="color" value={primary} onChange={e => setPrimary(e.target.value)}
            style={{ width: 28, height: 28, border: 'none', cursor: 'pointer', background: 'none' }} />
        </label>
      </div>
      <button
        type="button"
        onClick={() => onApply({ background: bg, text, primary })}
        style={{
          padding: '4px 12px',
          fontSize: 12,
          borderRadius: 'var(--radius-md)',
          background: 'var(--color-primary)',
          color: 'var(--color-primary-text)',
          border: 'none',
          cursor: 'pointer',
          fontWeight: 600,
        }}
      >
        Apply Custom
      </button>
    </div>
  )
}

export function ThemePicker({
  onSelect,
  showPublish = false,
  onPublish,
  onBrowse,
  showCustom = true,
  className,
}: ThemePickerProps) {
  const { theme: activeTheme, setTheme, availableThemes } = useTheme()
  const [hoveredTheme, setHoveredTheme] = useState<CrumbsTheme | null>(null)
  const [showCustomPicker, setShowCustomPicker] = useState(false)

  const displayTheme = hoveredTheme || activeTheme

  const handleClick = useCallback(
    (theme: CrumbsTheme) => {
      setTheme(theme)
      onSelect?.(theme)
    },
    [setTheme, onSelect],
  )

  const handleCustomApply = useCallback(
    (colors: { background: string; text: string; primary: string }) => {
      const custom: CrumbsTheme = {
        id: 'custom',
        name: 'Custom',
        colors,
      }
      setTheme(custom)
      onSelect?.(custom)
    },
    [setTheme, onSelect],
  )

  return (
    <div
      className={className}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        padding: 12,
        minWidth: 200,
      }}
    >
      {/* Preview label */}
      <div style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
        {hoveredTheme ? hoveredTheme.name : `Theme: ${activeTheme.name}`}
      </div>

      {/* Swatch grid */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {availableThemes.map(t => (
          <ThemeSwatch
            key={t.id}
            theme={t}
            isActive={activeTheme.id === t.id}
            onHover={setHoveredTheme}
            onClick={handleClick}
          />
        ))}
      </div>

      {/* Custom color picker toggle */}
      {showCustom && (
        <>
          <button
            type="button"
            onClick={() => setShowCustomPicker(!showCustomPicker)}
            style={{
              fontSize: 12,
              color: 'var(--color-primary)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              textAlign: 'left',
              padding: 0,
            }}
          >
            {showCustomPicker ? '▾ Hide custom colors' : '▸ Custom colors...'}
          </button>
          {showCustomPicker && <CustomColorPicker onApply={handleCustomApply} />}
        </>
      )}

      {/* Browse Nostr themes */}
      {onBrowse && (
        <button
          type="button"
          onClick={onBrowse}
          style={{
            fontSize: 12,
            color: 'var(--color-text-muted)',
            background: 'none',
            border: `1px solid var(--color-border)`,
            borderRadius: 'var(--radius-md)',
            cursor: 'pointer',
            padding: '4px 8px',
          }}
        >
          🔍 Browse Nostr themes
        </button>
      )}

      {/* Publish button */}
      {showPublish && onPublish && (
        <button
          type="button"
          onClick={() => onPublish(activeTheme)}
          style={{
            fontSize: 12,
            color: 'var(--color-primary-text)',
            background: 'var(--color-primary)',
            border: 'none',
            borderRadius: 'var(--radius-md)',
            cursor: 'pointer',
            padding: '6px 12px',
            fontWeight: 600,
          }}
        >
          📡 Publish to Nostr
        </button>
      )}
    </div>
  )
}
