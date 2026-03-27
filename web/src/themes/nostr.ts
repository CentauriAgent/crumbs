/**
 * Nostr integration for themes — read/write kinds 16767 and 36767.
 * NDK-based. Follows Ditto's tag format exactly.
 */
import type { NDKEvent, NDKFilter, NDKUser } from '@nostr-dev-kit/ndk'
import type NDK from '@nostr-dev-kit/ndk'
import type { CrumbsTheme, ThemeFontWithUrl } from './types'
import { hexToHslString, hslStringToHex } from './derive'

const KIND_ACTIVE_THEME = 16767
const KIND_THEME_DEFINITION = 36767
const DEFAULT_RELAYS = ['wss://relay.ditto.pub', 'wss://relay.primal.net', 'wss://nos.lol']

// --- Parsing helpers ---

function parseColorTags(tags: string[][]): { background: string; text: string; primary: string } | null {
  const map = new Map<string, string>()
  for (const tag of tags) {
    if (tag[0] === 'c' && tag[1] && tag[2]) {
      map.set(tag[2], tag[1]) // role → hex color
    }
  }
  const bg = map.get('background')
  const text = map.get('text')
  const primary = map.get('primary')
  if (!bg || !text || !primary) return null
  return { background: bg, text, primary }
}

function parseFontTags(tags: string[][]): { body?: string; title?: string } {
  const fonts: { body?: string; title?: string } = {}
  for (const tag of tags) {
    if (tag[0] === 'f' && tag[1]) {
      const role = tag[3] || 'body'
      if (role === 'body') fonts.body = tag[1]
      else if (role === 'title') fonts.title = tag[1]
    }
  }
  return fonts
}

function parseBackgroundTag(tags: string[][]): CrumbsTheme['background'] | undefined {
  for (const tag of tags) {
    if (tag[0] !== 'bg') continue
    let url = ''
    let mode: 'cover' | 'tile' = 'cover'
    let mimeType: string | undefined
    let dimensions: string | undefined

    for (let i = 1; i < tag.length; i++) {
      const part = tag[i]
      if (part.startsWith('url ')) url = part.slice(4)
      else if (part.startsWith('mode ')) mode = part.slice(5) as 'cover' | 'tile'
      else if (part.startsWith('m ')) mimeType = part.slice(2)
      else if (part.startsWith('dim ')) dimensions = part.slice(4)
    }

    if (url) {
      return { type: 'image', value: url, mode, mimeType, dimensions }
    }
  }
  return undefined
}

function getTagValue(tags: string[][], name: string): string | undefined {
  const tag = tags.find(t => t[0] === name)
  return tag?.[1]
}

// --- Event → Theme ---

function eventToTheme(event: NDKEvent, id?: string): CrumbsTheme | null {
  const colors = parseColorTags(event.tags)
  if (!colors) return null

  const fonts = parseFontTags(event.tags)
  const bg = parseBackgroundTag(event.tags)
  const title = getTagValue(event.tags, 'title')
  const description = getTagValue(event.tags, 'description')
  const dTag = getTagValue(event.tags, 'd')
  const aTag = getTagValue(event.tags, 'a')

  return {
    id: id || dTag || `nostr-${event.id?.slice(0, 8)}`,
    name: title || 'Untitled Theme',
    colors: {
      background: colors.background,
      text: colors.text,
      primary: colors.primary,
    },
    font: (fonts.body || fonts.title) ? fonts : undefined,
    background: bg,
    isDitto: true,
    sourceRef: aTag || undefined,
    description,
  }
}

// --- Read operations ---

/**
 * Fetch a user's active profile theme (kind 16767).
 * Returns null if the user hasn't set one.
 */
export async function readActiveTheme(pubkey: string, ndk: NDK): Promise<CrumbsTheme | null> {
  const filter: NDKFilter = {
    kinds: [KIND_ACTIVE_THEME as number],
    authors: [pubkey],
    limit: 1,
  }

  const events = await ndk.fetchEvents(filter)
  const event = Array.from(events)[0]
  if (!event) return null

  return eventToTheme(event, `active-${pubkey.slice(0, 8)}`)
}

/**
 * Fetch a user's published theme definitions (kind 36767).
 */
export async function readThemeDefinitions(pubkey: string, ndk: NDK): Promise<CrumbsTheme[]> {
  const filter: NDKFilter = {
    kinds: [KIND_THEME_DEFINITION as number],
    authors: [pubkey],
  }

  const events = await ndk.fetchEvents(filter)
  const themes: CrumbsTheme[] = []

  for (const event of events) {
    const theme = eventToTheme(event)
    if (theme) themes.push(theme)
  }

  return themes
}

/**
 * Search for public theme definitions across the network.
 */
export async function searchThemes(ndk: NDK, limit = 50): Promise<CrumbsTheme[]> {
  const filter: NDKFilter = {
    kinds: [KIND_THEME_DEFINITION as number],
    '#t': ['theme'],
    limit,
  }

  const events = await ndk.fetchEvents(filter)
  const themes: CrumbsTheme[] = []

  for (const event of events) {
    const theme = eventToTheme(event)
    if (theme) themes.push(theme)
  }

  return themes
}

// --- Write operations ---

/**
 * Publish an active profile theme (kind 16767).
 * This is the theme other users see when visiting your profile.
 */
export async function writeActiveTheme(theme: CrumbsTheme, ndk: NDK): Promise<NDKEvent | null> {
  if (!ndk.signer) return null

  const NDKEvent = (await import('@nostr-dev-kit/ndk')).NDKEvent
  const event = new NDKEvent(ndk)
  event.kind = KIND_ACTIVE_THEME
  event.content = ''
  event.tags = [
    ['c', theme.colors.background, 'background'],
    ['c', theme.colors.text, 'text'],
    ['c', theme.colors.primary, 'primary'],
    ['alt', 'Active profile theme'],
  ]

  if (theme.name) {
    event.tags.push(['title', theme.name])
  }

  if (theme.sourceRef) {
    event.tags.push(['a', theme.sourceRef])
  }

  if (theme.font?.body) {
    event.tags.push(['f', theme.font.body, '', 'body'])
  }
  if (theme.font?.title) {
    event.tags.push(['f', theme.font.title, '', 'title'])
  }

  await event.publish()
  return event
}

/**
 * Publish a shareable theme definition (kind 36767).
 */
export async function publishThemeDefinition(theme: CrumbsTheme, ndk: NDK): Promise<NDKEvent | null> {
  if (!ndk.signer) return null

  const NDKEvent = (await import('@nostr-dev-kit/ndk')).NDKEvent
  const event = new NDKEvent(ndk)
  event.kind = KIND_THEME_DEFINITION
  event.content = ''
  event.tags = [
    ['d', theme.id],
    ['c', theme.colors.background, 'background'],
    ['c', theme.colors.text, 'text'],
    ['c', theme.colors.primary, 'primary'],
    ['title', theme.name],
    ['alt', `Custom theme: ${theme.name}`],
    ['t', 'theme'],
  ]

  if (theme.description) {
    event.tags.push(['description', theme.description])
  }

  if (theme.font?.body) {
    event.tags.push(['f', theme.font.body, '', 'body'])
  }
  if (theme.font?.title) {
    event.tags.push(['f', theme.font.title, '', 'title'])
  }

  if (theme.background?.type === 'image' && theme.background.value) {
    const bgParts = [`url ${theme.background.value}`, `mode ${theme.background.mode || 'cover'}`]
    if (theme.background.mimeType) bgParts.push(`m ${theme.background.mimeType}`)
    if (theme.background.dimensions) bgParts.push(`dim ${theme.background.dimensions}`)
    event.tags.push(['bg', ...bgParts])
  }

  await event.publish()
  return event
}
