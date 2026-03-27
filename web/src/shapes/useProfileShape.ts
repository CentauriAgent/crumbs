/**
 * useProfileShape — Hook to extract avatar shape from a kind 0 profile event.
 * Returns { avatarUrl, shape, displayName, nip05 }
 */
import { useMemo } from 'react'
import { isEmoji } from './ProfileShape'

interface Kind0Metadata {
  name?: string
  display_name?: string
  displayName?: string
  picture?: string
  image?: string
  banner?: string
  about?: string
  nip05?: string
  lud16?: string
  shape?: string
  [key: string]: unknown
}

export interface ProfileShapeData {
  /** Avatar image URL */
  avatarUrl: string
  /** Emoji shape (validated), or undefined for default circle */
  shape: string | undefined
  /** Display name (display_name > name > '') */
  displayName: string
  /** NIP-05 identifier */
  nip05: string | undefined
}

/** Default avatar placeholder */
const DEFAULT_AVATAR = 'data:image/svg+xml,' + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">' +
  '<rect fill="%23333" width="100" height="100"/>' +
  '<text x="50" y="55" text-anchor="middle" fill="%23888" font-size="40">?</text>' +
  '</svg>'
)

/**
 * Parse kind 0 content JSON safely.
 */
function parseKind0Content(content: string): Kind0Metadata | null {
  try {
    return JSON.parse(content) as Kind0Metadata
  } catch {
    return null
  }
}

/**
 * Extract profile shape data from a kind 0 event.
 *
 * @param event - A kind 0 event object (must have `content` string)
 */
export function useProfileShape(event: { content: string } | null | undefined): ProfileShapeData {
  return useMemo(() => {
    if (!event?.content) {
      return {
        avatarUrl: DEFAULT_AVATAR,
        shape: undefined,
        displayName: '',
        nip05: undefined,
      }
    }

    const meta = parseKind0Content(event.content)
    if (!meta) {
      return {
        avatarUrl: DEFAULT_AVATAR,
        shape: undefined,
        displayName: '',
        nip05: undefined,
      }
    }

    const avatarUrl = meta.picture || meta.image || DEFAULT_AVATAR
    const rawShape = meta.shape
    const shape = typeof rawShape === 'string' && isEmoji(rawShape) ? rawShape : undefined
    const displayName = meta.display_name || meta.displayName || meta.name || ''
    const nip05 = typeof meta.nip05 === 'string' ? meta.nip05 : undefined

    return { avatarUrl, shape, displayName, nip05 }
  }, [event?.content])
}

/**
 * Non-hook version for use outside React components.
 */
export function extractProfileShape(kind0Content: string): ProfileShapeData {
  const meta = parseKind0Content(kind0Content)
  if (!meta) {
    return { avatarUrl: DEFAULT_AVATAR, shape: undefined, displayName: '', nip05: undefined }
  }

  return {
    avatarUrl: meta.picture || meta.image || DEFAULT_AVATAR,
    shape: typeof meta.shape === 'string' && isEmoji(meta.shape) ? meta.shape : undefined,
    displayName: meta.display_name || meta.displayName || meta.name || '',
    nip05: typeof meta.nip05 === 'string' ? meta.nip05 : undefined,
  }
}
