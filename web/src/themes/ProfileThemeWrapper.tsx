/**
 * ProfileThemeWrapper — Wraps profile page content with a user's kind 16767 theme.
 * Applies scoped CSS (not global) so only the profile section is themed.
 */
import React, { useEffect, useState, useId } from 'react'
import type NDK from '@nostr-dev-kit/ndk'
import type { CrumbsTheme } from './types'
import { readActiveTheme } from './nostr'
import { deriveTokensFromCore, buildThemeCss } from './derive'

interface ProfileThemeWrapperProps {
  /** Hex pubkey of the profile being viewed */
  pubkey: string
  /** NDK instance for fetching theme */
  ndk: NDK
  children: React.ReactNode
  /** Optional: show attribution "Using [Theme] theme" */
  showAttribution?: boolean
  className?: string
}

export function ProfileThemeWrapper({
  pubkey,
  ndk,
  children,
  showAttribution = true,
  className,
}: ProfileThemeWrapperProps) {
  const [profileTheme, setProfileTheme] = useState<CrumbsTheme | null>(null)
  const [loading, setLoading] = useState(true)
  const scopeId = `profile-theme-${pubkey.slice(0, 12)}`

  useEffect(() => {
    let cancelled = false

    async function fetchTheme() {
      setLoading(true)
      try {
        const theme = await readActiveTheme(pubkey, ndk)
        if (!cancelled) setProfileTheme(theme)
      } catch (err) {
        console.warn('Failed to fetch profile theme:', err)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchTheme()
    return () => { cancelled = true }
  }, [pubkey, ndk])

  // Build scoped CSS when theme is loaded
  const scopedCss = profileTheme
    ? buildThemeCss(
        deriveTokensFromCore(
          profileTheme.colors.background,
          profileTheme.colors.text,
          profileTheme.colors.primary,
        ),
        `#${scopeId}`,
      )
    : null

  return (
    <>
      {/* Inject scoped styles */}
      {scopedCss && <style dangerouslySetInnerHTML={{ __html: scopedCss }} />}

      <div
        id={scopeId}
        data-theme-scope=""
        className={className}
        style={profileTheme ? {
          backgroundColor: 'var(--color-bg)',
          color: 'var(--color-text)',
          borderRadius: 'var(--radius-lg)',
          padding: 16,
        } : undefined}
      >
        {/* Theme attribution */}
        {showAttribution && profileTheme && (
          <div
            style={{
              fontSize: 11,
              color: 'var(--color-text-muted)',
              marginBottom: 8,
              opacity: 0.7,
            }}
          >
            🎨 Using <strong>{profileTheme.name}</strong> theme
            {profileTheme.sourceRef && ' (shared)'}
          </div>
        )}

        {children}
      </div>
    </>
  )
}
