# Crumbs — Architecture & Design Document

> del.icio.us reborn on Nostr. A social bookmarking service built on open protocols.

**Author:** Centauri (Architect)  
**Date:** 2026-03-26  
**Status:** v1.0 — Initial Architecture

---

## Table of Contents

1. [Philosophy & Design Principles](#1-philosophy--design-principles)
2. [Nostr Data Model](#2-nostr-data-model)
3. [Web Application Architecture](#3-web-application-architecture)
4. [Browser Extension Architecture](#4-browser-extension-architecture)
5. [Theme & Profile System](#5-theme--profile-system)
6. [Relay Strategy & Query Patterns](#6-relay-strategy--query-patterns)
7. [Tech Stack](#7-tech-stack)
8. [Project Structure](#8-project-structure)
9. [Security Considerations](#9-security-considerations)
10. [Future Considerations](#10-future-considerations)

---

## 1. Philosophy & Design Principles

### Core Beliefs

1. **Nostr-native, not Nostr-adjacent.** Every bookmark is a Nostr event. No proprietary backend. No database. Relays are the database.
2. **Folksonomy over taxonomy.** Tags are freeform, user-defined. The community's collective tagging creates emergent organization — just like del.icio.us.
3. **URLs are first-class citizens.** Any URL has its own page showing who bookmarked it. This is the social discovery engine.
4. **Private by choice, public by default.** Public bookmarks drive the social graph. Private bookmarks use NIP-44 encryption and are invisible to everyone else.
5. **Build for the relay ecosystem.** Use NIP-65 relay lists. Publish to user's write relays. Query user's write relays for their data. Don't centralize.
6. **Ship fast, iterate.** React + Vite, no SSR complexity. SPA with client-side relay queries. A small team can build this in weeks.

### What Makes This Different from NIP-51 Bookmarks?

NIP-51 defines kind 10003 (bookmark list) and kind 30003 (bookmark sets) — but these are designed for bookmarking **Nostr events** (`e` and `a` tags). They're lists, not individual bookmark objects.

Crumbs needs:
- Individual bookmark events (so we can query "who bookmarked this URL?")
- Rich metadata per bookmark (title, description, tags)
- Tag-based querying across all users
- URL-based aggregation pages

NIP-51 lists are great for organizing, but we need **individual bookmark events** as the atomic unit. We use a custom parameterized replaceable event kind for this.

---

## 2. Nostr Data Model

### 2.1 Individual Bookmark — Kind `30078` (App-Specific Data)

We use **kind 30078** (application-specific data, parameterized replaceable) with a well-known `d` tag scheme. This is the standard kind for app-specific data per NIP-78, which is exactly what Crumbs bookmarks are.

**Why kind 30078?**
- It's the designated kind for application-specific data
- Parameterized replaceable (one event per `d`-tag per user — perfect for one-bookmark-per-URL)
- No need to register a custom kind
- Other apps can safely ignore events with `d` tags they don't recognize

**Schema:**

```json
{
  "kind": 30078,
  "content": "Optional user description / notes about this bookmark",
  "tags": [
    ["d", "crumbs:<sha256-of-normalized-url>"],
    ["r", "https://example.com/article"],
    ["title", "Example Article Title"],
    ["t", "nostr"],
    ["t", "bitcoin"],
    ["t", "decentralization"],
    ["L", "social.crumbs.bookmark"],
    ["l", "public", "social.crumbs.bookmark"],
    ["client", "crumbs"]
  ],
  "created_at": 1711500000,
  "pubkey": "<author-hex-pubkey>"
}
```

**Tag Breakdown:**

| Tag | Purpose | Notes |
|-----|---------|-------|
| `d` | Replaceable identifier | `crumbs:<sha256(normalized_url)>` — ensures one bookmark per URL per user |
| `r` | The bookmarked URL | Raw URL, used for querying "who bookmarked this?" |
| `title` | Page title | Extracted from `<title>` or user-provided |
| `t` | User tags (folksonomy) | Lowercase, one per tag. These power tag-based discovery |
| `L` | Label namespace (NIP-32) | `social.crumbs.bookmark` identifies this as a Crumbs bookmark |
| `l` | Label value (NIP-32) | `public` or `private` visibility marker |
| `client` | Client identifier | `crumbs` — for filtering |

**URL Normalization Rules:**
1. Lowercase the scheme and host
2. Remove trailing slash
3. Remove `www.` prefix
4. Remove fragment (`#...`)
5. Sort query parameters alphabetically
6. Remove tracking params (`utm_*`, `fbclid`, `ref`, etc.)

**Example:** `https://www.Example.com/path/?b=2&a=1#section` → `https://example.com/path/?a=1&b=2`

The SHA-256 of the normalized URL becomes the `d`-tag suffix, ensuring deduplication.

### 2.2 Private Bookmarks — NIP-44 Encrypted

Private bookmarks use the **same kind 30078** but with encrypted content and tags.

```json
{
  "kind": 30078,
  "content": "<NIP-44 encrypted JSON>",
  "tags": [
    ["d", "crumbs:<sha256-of-normalized-url>"],
    ["L", "social.crumbs.bookmark"],
    ["l", "private", "social.crumbs.bookmark"],
    ["client", "crumbs"]
  ]
}
```

The encrypted `content` contains:

```json
{
  "url": "https://example.com/secret-article",
  "title": "Secret Article Title",
  "description": "My private notes about this",
  "tags": ["private-tag-1", "research"]
}
```

**Encryption:** NIP-44, self-encrypting (shared key derived from author's own pubkey + privkey). This is the same pattern NIP-51 uses for private list items.

**Key difference:** Private bookmarks expose NO queryable tags (no `r`, no `t`, no `title`). The `d`-tag still contains the URL hash (so the user can't accidentally create duplicate bookmarks), but without the URL itself, it's opaque.

### 2.3 Bookmark Collections — Kind `30003` (NIP-51 Bookmark Sets)

For users who want to organize bookmarks into named collections (like del.icio.us "bundles"), we reuse NIP-51's **kind 30003 bookmark sets**.

```json
{
  "kind": 30003,
  "content": "",
  "tags": [
    ["d", "reading-list"],
    ["title", "Reading List"],
    ["description", "Articles I want to read later"],
    ["image", "https://example.com/icon.png"],
    ["a", "30078:<author-pubkey>:crumbs:<url-hash>"],
    ["a", "30078:<author-pubkey>:crumbs:<url-hash>"],
    ["a", "30078:<author-pubkey>:crumbs:<url-hash>"]
  ]
}
```

Collections reference individual bookmark events via `a`-tags. This keeps the two concepts cleanly separated:
- **Bookmark events** = the atomic unit (one per URL per user)
- **Bookmark sets** = organizational grouping (optional)

### 2.4 User Theme/Profile — Kind `30078` (App-Specific Data)

```json
{
  "kind": 30078,
  "content": "",
  "tags": [
    ["d", "crumbs:theme"],
    ["theme", "midnight"],
    ["profile_shape", "hexagon"],
    ["accent_color", "#8B5CF6"],
    ["client", "crumbs"]
  ]
}
```

See [Section 5](#5-theme--profile-system) for full theme system design.

### 2.5 Event Kind Summary

| Kind | Type | Purpose | Replaceable? |
|------|------|---------|-------------|
| 30078 | Param. Replaceable | Individual bookmark (`d`=`crumbs:<urlhash>`) | Yes, by d-tag |
| 30078 | Param. Replaceable | User theme prefs (`d`=`crumbs:theme`) | Yes, by d-tag |
| 30003 | Param. Replaceable | Bookmark collections (NIP-51) | Yes, by d-tag |
| 10003 | Replaceable | Global bookmark list (NIP-51) — **NOT USED** (to avoid interfering with other apps) | Yes |
| 0 | Replaceable | User profile (NIP-01, read-only) | Yes |
| 10002 | Replaceable | Relay list (NIP-65, read-only) | Yes |

---

## 3. Web Application Architecture

### 3.1 Tech Stack

| Layer | Choice | Rationale |
|-------|--------|-----------|
| Framework | **React 18+** with TypeScript | Ecosystem, hiring, component libraries |
| Build | **Vite** | Fast HMR, ESBuild, zero-config |
| Nostr | **NDK (@nostr-dev-kit/ndk)** | Best DX, built-in caching, NIP-07/NIP-46 support, relay management |
| Routing | **React Router v6** | Standard, supports nested routes |
| Styling | **Tailwind CSS** | Rapid UI development, theme system via CSS variables |
| State | **Zustand** | Minimal boilerplate, works great with NDK subscriptions |
| Icons | **Lucide React** | Clean, consistent, tree-shakeable |

### 3.2 Route Map

```
/                           → Home feed (bookmarks from followed users)
/popular                    → Trending/popular bookmarks
/recent                     → Global recent bookmarks
/u/:npub                    → User profile + their bookmarks
/u/:npub/t/:tag             → User's bookmarks filtered by tag
/u/:npub/collections        → User's bookmark collections
/t/:tag                     → Global tag page (all bookmarks with this tag)
/url/:urlhash               → URL page ("who bookmarked this?")
/save                       → Save a new bookmark (modal or page)
/settings                   → User settings (relays, theme, extensions)
/tags                       → Tag cloud / browse all tags
```

### 3.3 Component Architecture

```
src/
├── main.tsx                    # Entry point
├── App.tsx                     # Router + layout wrapper
├── index.css                   # Tailwind + CSS variables for themes
│
├── components/
│   ├── layout/
│   │   ├── Header.tsx          # Nav bar, search, user menu
│   │   ├── Sidebar.tsx         # Tag cloud, popular tags, collections
│   │   └── Footer.tsx
│   │
│   ├── bookmark/
│   │   ├── BookmarkCard.tsx    # Single bookmark display
│   │   ├── BookmarkList.tsx    # List of bookmarks (feed view)
│   │   ├── BookmarkForm.tsx    # Create/edit bookmark form
│   │   ├── BookmarkMeta.tsx    # URL metadata preview (OpenGraph)
│   │   └── TagInput.tsx        # Tag autocomplete input
│   │
│   ├── user/
│   │   ├── UserProfile.tsx     # Profile header (avatar, bio, stats)
│   │   ├── UserAvatar.tsx      # Avatar with profile shape mask
│   │   └── FollowButton.tsx
│   │
│   ├── tags/
│   │   ├── TagCloud.tsx        # Weighted tag cloud
│   │   ├── TagBadge.tsx        # Single tag pill/badge
│   │   └── TrendingTags.tsx    # Trending tags sidebar widget
│   │
│   ├── social/
│   │   ├── BookmarkerList.tsx  # "Who bookmarked this URL" list
│   │   └── ActivityFeed.tsx    # Social activity stream
│   │
│   └── common/
│       ├── LoginButton.tsx     # NIP-07 / NIP-46 auth
│       ├── RelayStatus.tsx     # Connected relays indicator
│       ├── SearchBar.tsx       # NIP-50 search
│       └── ThemeSwitcher.tsx   # Theme picker
│
├── hooks/
│   ├── useNDK.ts              # NDK instance provider
│   ├── useBookmarks.ts        # Fetch/create/delete bookmarks
│   ├── useUserBookmarks.ts    # Bookmarks by a specific user
│   ├── useUrlBookmarks.ts     # All bookmarks for a URL
│   ├── useTagBookmarks.ts     # All bookmarks with a tag
│   ├── useProfile.ts          # User profile (kind 0)
│   ├── useRelayList.ts        # NIP-65 relay list
│   ├── useTheme.ts            # Theme preferences
│   └── useCollections.ts      # Bookmark collections (kind 30003)
│
├── lib/
│   ├── ndk.ts                 # NDK singleton + configuration
│   ├── url.ts                 # URL normalization + hashing
│   ├── crypto.ts              # NIP-44 encrypt/decrypt for private bookmarks
│   ├── bookmarkEvent.ts       # Build/parse bookmark events
│   ├── themes.ts              # Theme definitions
│   └── constants.ts           # Kind numbers, default relays, etc.
│
├── stores/
│   ├── authStore.ts           # Current user, login state
│   ├── bookmarkStore.ts       # Local bookmark cache + drafts
│   └── settingsStore.ts       # User preferences (relays, theme)
│
├── pages/
│   ├── HomePage.tsx           # / — followed users' bookmarks
│   ├── PopularPage.tsx        # /popular
│   ├── RecentPage.tsx         # /recent
│   ├── UserPage.tsx           # /u/:npub
│   ├── TagPage.tsx            # /t/:tag
│   ├── UrlPage.tsx            # /url/:urlhash
│   ├── SavePage.tsx           # /save
│   ├── SettingsPage.tsx       # /settings
│   └── TagsPage.tsx           # /tags — browse all tags
│
└── types/
    ├── bookmark.ts            # Bookmark type definitions
    ├── theme.ts               # Theme types
    └── nostr.ts               # Nostr-specific types
```

### 3.4 Authentication Flow

```
1. User clicks "Login"
2. Check for NIP-07 (window.nostr):
   a. If present → getPublicKey(), sign events via window.nostr.signEvent()
   b. If not → offer NIP-46 (Nostr Connect) QR code / bunker URL
3. On auth:
   - Fetch user's kind 0 (profile)
   - Fetch user's kind 10002 (NIP-65 relay list)
   - Fetch user's kind 3 (follow list)
   - Fetch user's kind 30078 d=crumbs:theme (theme prefs)
   - Configure NDK with user's relay list
4. Store pubkey in Zustand + localStorage for session persistence
```

### 3.5 Data Flow: Saving a Bookmark

```
1. User enters URL (or it's pre-filled by extension)
2. Client fetches OpenGraph metadata (title, description, image)
   → Via a lightweight proxy or client-side fetch (CORS permitting)
3. User adds/edits title, description, tags
4. User picks visibility: public or private
5. Client normalizes URL → SHA-256 hash
6. Client builds kind 30078 event:
   - Public: tags in event tags, description in content
   - Private: encrypt metadata into content via NIP-44
7. Sign via NIP-07 or NIP-46
8. Publish to user's NIP-65 write relays + Crumbs's default relays
9. Optimistically add to local store
```

---

## 4. Browser Extension Architecture

### 4.1 Overview

Manifest V3, cross-browser (Chrome + Firefox). The extension enables one-click bookmarking of the current page.

### 4.2 Structure

```
extension/
├── manifest.json           # Manifest V3
├── popup/
│   ├── popup.html          # Extension popup UI
│   ├── popup.tsx           # React app for popup
│   └── popup.css
├── options/
│   ├── options.html        # Settings page
│   ├── options.tsx         # React app for settings
│   └── options.css
├── background/
│   └── service-worker.ts   # Background service worker
├── content/
│   └── content-script.ts   # Page metadata extraction
├── lib/
│   ├── nostr.ts            # Nostr event building + signing
│   ├── storage.ts          # chrome.storage wrapper
│   ├── url.ts              # URL normalization (shared with web)
│   └── relay.ts            # WebSocket relay management
├── assets/
│   ├── icon-16.png
│   ├── icon-32.png
│   ├── icon-48.png
│   └── icon-128.png
├── package.json
├── tsconfig.json
└── vite.config.ts          # Vite for building extension
```

### 4.3 Manifest V3

```json
{
  "manifest_version": 3,
  "name": "Crumbs — Nostr Bookmarks",
  "version": "0.1.0",
  "description": "Save and discover bookmarks on Nostr",
  "permissions": [
    "activeTab",
    "storage"
  ],
  "host_permissions": [],
  "action": {
    "default_popup": "popup/popup.html",
    "default_icon": {
      "16": "assets/icon-16.png",
      "32": "assets/icon-32.png",
      "48": "assets/icon-48.png",
      "128": "assets/icon-128.png"
    }
  },
  "options_page": "options/options.html",
  "background": {
    "service_worker": "background/service-worker.js",
    "type": "module"
  },
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["content/content-script.js"],
      "run_at": "document_idle"
    }
  ],
  "icons": {
    "16": "assets/icon-16.png",
    "48": "assets/icon-48.png",
    "128": "assets/icon-128.png"
  }
}
```

### 4.4 Extension Flow

```
1. User clicks extension icon on any page
2. Content script extracts: URL, title, meta description, OG tags
3. Popup shows:
   - URL (read-only)
   - Title (editable, pre-filled)
   - Description (editable, pre-filled from meta)
   - Tags (input with autocomplete from user's previous tags)
   - Visibility toggle (public/private)
   - "Save" button
4. On save:
   - Build kind 30078 event
   - Sign with stored nsec OR NIP-46 bunker connection
   - Publish to configured relays
   - Show success animation
   - Close popup
```

### 4.5 Authentication in Extension

Two modes (configured in Options page):

1. **nsec stored locally** (simple, less secure):
   - Encrypted in `chrome.storage.local` with user-provided password
   - Decrypted on demand for signing
   - Never leaves the extension

2. **NIP-46 Nostr Connect** (recommended):
   - Store bunker URL in options
   - Service worker maintains persistent connection to remote signer
   - Extension requests signatures via NIP-46 protocol

---

## 5. Theme & Profile System

### 5.1 Ditto-Style Themes

Themes are stored as kind 30078 events with `d`=`crumbs:theme`. This follows the same app-specific data pattern as bookmarks.

**Preset Themes:**

| Theme | Background | Text | Accent | Vibe |
|-------|-----------|------|--------|------|
| `midnight` | `#0f0f23` | `#e2e8f0` | `#8B5CF6` | Dark purple (default) |
| `ocean` | `#0c1426` | `#e2e8f0` | `#3B82F6` | Deep blue |
| `forest` | `#0f1a0f` | `#d4e8d4` | `#22C55E` | Green earth |
| `sunset` | `#1a0f0f` | `#f0e2e2` | `#F97316` | Warm orange |
| `snow` | `#fafafa` | `#1a1a2e` | `#6366F1` | Light mode |
| `terminal` | `#000000` | `#00FF00` | `#00FF00` | Hacker green |
| `bitcoin` | `#1a1a2e` | `#f7931a` | `#f7931a` | Orange pill |

**Implementation:** CSS custom properties on `:root`, switched via a class on `<html>`:

```css
html[data-theme="midnight"] {
  --bg-primary: #0f0f23;
  --bg-secondary: #1a1a3e;
  --text-primary: #e2e8f0;
  --text-secondary: #94a3b8;
  --accent: #8B5CF6;
  --accent-hover: #7C3AED;
  --border: #2d2d5e;
}
```

Tailwind configured to use these variables:

```js
// tailwind.config.js
theme: {
  extend: {
    colors: {
      primary: 'var(--bg-primary)',
      secondary: 'var(--bg-secondary)',
      accent: 'var(--accent)',
      // ...
    }
  }
}
```

### 5.2 Profile Shapes

Profile avatars are rendered with CSS `clip-path` for different shapes:

```typescript
const PROFILE_SHAPES = {
  circle:    'circle(50% at 50% 50%)',
  hexagon:   'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
  squircle:  'inset(0 round 25%)',
  diamond:   'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)',
  octagon:   'polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%)',
  shield:    'polygon(50% 0%, 100% 15%, 100% 65%, 50% 100%, 0% 65%, 0% 15%)',
} as const;
```

Applied via:

```tsx
<div
  className="w-24 h-24 bg-cover"
  style={{
    clipPath: PROFILE_SHAPES[shape],
    backgroundImage: `url(${avatarUrl})`
  }}
/>
```

### 5.3 Theme Event

```json
{
  "kind": 30078,
  "tags": [
    ["d", "crumbs:theme"],
    ["theme", "midnight"],
    ["profile_shape", "hexagon"],
    ["accent_color", "#8B5CF6"],
    ["client", "crumbs"]
  ],
  "content": ""
}
```

---

## 6. Relay Strategy & Query Patterns

### 6.1 Default Relays

Crumbs ships with sensible defaults but respects user NIP-65 preferences:

```typescript
const DEFAULT_RELAYS = [
  'wss://relay.damus.io',
  'wss://relay.primal.net',
  'wss://nos.lol',
  'wss://relay.nostr.band',    // Good for search (NIP-50)
  'wss://relay.ditto.pub',     // Ditto relay, NIP-50 search
];

const SEARCH_RELAYS = [
  'wss://relay.nostr.band',
  'wss://relay.ditto.pub',
];
```

### 6.2 Query Patterns

#### Fetch user's bookmarks
```json
{
  "kinds": [30078],
  "authors": ["<user-pubkey>"],
  "#L": ["social.crumbs.bookmark"]
}
```

#### Fetch bookmarks by tag (global)
```json
{
  "kinds": [30078],
  "#t": ["bitcoin"],
  "#L": ["social.crumbs.bookmark"],
  "limit": 50
}
```

#### Fetch "who bookmarked this URL?"
```json
{
  "kinds": [30078],
  "#r": ["https://example.com/article"],
  "#L": ["social.crumbs.bookmark"]
}
```

#### Search bookmarks (NIP-50)
```json
{
  "kinds": [30078],
  "search": "nostr tutorial",
  "#L": ["social.crumbs.bookmark"],
  "limit": 20
}
```

#### Fetch followed users' bookmarks (home feed)
```json
{
  "kinds": [30078],
  "authors": ["<pubkey1>", "<pubkey2>", "...followed-pubkeys"],
  "#L": ["social.crumbs.bookmark"],
  "limit": 50,
  "since": 1711000000
}
```

#### Fetch user's bookmark collections
```json
{
  "kinds": [30003],
  "authors": ["<user-pubkey>"]
}
```

### 6.3 Relay Usage Strategy

| Operation | Relays Used |
|-----------|-------------|
| Publish bookmark | User's NIP-65 write relays + 2 default relays |
| Fetch own bookmarks | User's NIP-65 write relays |
| Fetch other user's bookmarks | Their NIP-65 write relays (from their kind 10002) |
| Search (NIP-50) | SEARCH_RELAYS |
| Tag browsing | Default relays (aggregators) |
| URL page | Default relays + SEARCH_RELAYS |
| Home feed | Followed users' write relays (batched) |

### 6.4 Caching Strategy

- **NDK cache adapter:** Use `@nostr-dev-kit/ndk-cache-dexie` for IndexedDB-based local caching
- **Profile cache:** Cache kind 0 profiles for 1 hour
- **Bookmark cache:** Cache indefinitely (parameterized replaceable — latest wins)
- **Relay list cache:** Cache kind 10002 for 30 minutes
- **Draft bookmarks:** Store in `localStorage` until published

---

## 7. Tech Stack

### Web App

| Dependency | Version | Purpose |
|-----------|---------|---------|
| react | ^18.3 | UI framework |
| react-dom | ^18.3 | DOM rendering |
| react-router-dom | ^6.x | Client-side routing |
| @nostr-dev-kit/ndk | ^2.x | Nostr protocol |
| @nostr-dev-kit/ndk-cache-dexie | ^2.x | IndexedDB cache |
| zustand | ^4.x | State management |
| tailwindcss | ^3.x | Styling |
| lucide-react | latest | Icons |
| nostr-tools | ^2.x | NIP-44 encryption, utilities |

**Dev dependencies:** TypeScript, ESLint, Prettier, Vite

### Browser Extension

| Dependency | Version | Purpose |
|-----------|---------|---------|
| react | ^18.3 | Popup + Options UI |
| react-dom | ^18.3 | DOM rendering |
| nostr-tools | ^2.x | Event building, signing, NIP-44 |
| @noble/hashes | latest | SHA-256 for URL hashing |

**Build:** Vite with `@crxjs/vite-plugin` for Manifest V3 bundling.

### Why These Choices?

- **NDK over raw nostr-tools** for the web app: NDK handles relay management, NIP-65, caching, subscription deduplication. It's the right abstraction for a relay-heavy app.
- **nostr-tools for the extension**: Lightweight. Extension doesn't need NDK's relay management — it publishes to a fixed set of relays.
- **Zustand over Redux/Context**: Minimal boilerplate. Crumbs's state is simple — auth + settings + local cache.
- **Tailwind over CSS-in-JS**: Theme system maps cleanly to CSS variables. No runtime overhead.
- **Vite for both web + extension**: Same build tooling, shared TypeScript config, consistent DX.

---

## 8. Project Structure

```
crumbs/
├── DESIGN.md                   # This document
├── RESEARCH.md                 # NIP research notes (filled by researcher)
├── README.md                   # Project overview
│
├── web/                        # React web application
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   ├── index.html
│   ├── public/
│   │   └── favicon.svg
│   └── src/
│       ├── main.tsx
│       ├── App.tsx
│       ├── index.css
│       ├── components/         # (see §3.3)
│       ├── hooks/
│       ├── lib/
│       ├── stores/
│       ├── pages/
│       └── types/
│
├── extension/                  # Browser extension
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   ├── manifest.json
│   ├── popup/
│   ├── options/
│   ├── background/
│   ├── content/
│   ├── lib/
│   └── assets/
│
└── shared/                     # Shared code (URL normalization, types)
    ├── package.json
    ├── url.ts
    ├── types.ts
    └── constants.ts
```

The `shared/` package is a local dependency used by both `web/` and `extension/` via workspace references or simple path imports.

---

## 9. Security Considerations

1. **No nsec in the web app.** NIP-07 or NIP-46 only. The web app never touches private keys.
2. **Extension nsec handling:** If users store nsec in the extension, it MUST be encrypted at rest with a user password using `crypto.subtle` (AES-GCM). Decrypted only in the service worker, never in content scripts.
3. **NIP-44 for private bookmarks:** Self-encryption using the user's own keypair. Only the user can decrypt.
4. **Content script isolation:** Content script only reads page metadata (title, URL, meta tags). No DOM manipulation, no injection.
5. **CSP headers:** Extension manifest includes strict Content Security Policy.
6. **URL validation:** Sanitize and validate all URLs before creating events. No `javascript:` or `data:` URLs.

---

## 10. Future Considerations

### Phase 2
- **Import/export:** OPML, HTML bookmarks, Pocket, Instapaper, del.icio.us XML
- **Bookmark descriptions as long-form:** kind 30023 linked from bookmark for rich descriptions
- **Collaborative collections:** Shared bookmark sets using NIP-51 with multiple editors
- **RSS feeds:** Generate RSS for any user's bookmarks or tag page

### Phase 3
- **Wayback Machine integration:** Archive.org snapshots for bookmarked URLs
- **Link rot detection:** Background check if bookmarked URLs are still alive
- **Social graph recommendations:** "People who bookmark similar things to you"
- **Mobile app:** React Native or Expo, sharing the Nostr logic layer

### Protocol Evolution
- If Crumbs gains traction, propose a dedicated NIP for URL bookmarks (kind 39xx range) with community input
- Consider NIP-32 labels for richer categorization beyond tags
- Explore NIP-42 relay auth for premium/private relay features

---

## Appendix A: URL Normalization Reference

```typescript
function normalizeUrl(url: string): string {
  const parsed = new URL(url);

  // Lowercase scheme + host
  parsed.protocol = parsed.protocol.toLowerCase();
  parsed.hostname = parsed.hostname.toLowerCase();

  // Remove www prefix
  if (parsed.hostname.startsWith('www.')) {
    parsed.hostname = parsed.hostname.slice(4);
  }

  // Remove fragment
  parsed.hash = '';

  // Remove tracking params
  const TRACKING_PARAMS = ['utm_source', 'utm_medium', 'utm_campaign',
    'utm_term', 'utm_content', 'fbclid', 'gclid', 'ref', 'source'];
  for (const param of TRACKING_PARAMS) {
    parsed.searchParams.delete(param);
  }

  // Sort remaining params
  parsed.searchParams.sort();

  // Remove trailing slash (but keep root /)
  let result = parsed.toString();
  if (result.endsWith('/') && parsed.pathname !== '/') {
    result = result.slice(0, -1);
  }

  return result;
}

async function hashUrl(url: string): Promise<string> {
  const normalized = normalizeUrl(url);
  const encoded = new TextEncoder().encode(normalized);
  const hash = await crypto.subtle.digest('SHA-256', encoded);
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}
```

## Appendix B: Key NIP References

| NIP | Used For |
|-----|----------|
| NIP-01 | Basic event structure, filters |
| NIP-07 | Browser extension signing (window.nostr) |
| NIP-19 | bech32 encoding (npub, nevent, naddr for shareable links) |
| NIP-32 | Labels (namespace `social.crumbs.bookmark` for discoverability) |
| NIP-44 | Encryption for private bookmarks |
| NIP-46 | Remote signing (Nostr Connect) |
| NIP-50 | Search queries on relays |
| NIP-51 | Bookmark sets (kind 30003) for collections |
| NIP-65 | Relay list metadata for relay routing |
| NIP-78 | App-specific data (kind 30078 — our bookmark events) |

---

## Ditto / NIP-22 Interoperability (Added post-architecture)

### Dual-event bookmark save

When a user saves a bookmark, the app publishes TWO Nostr events:

**Event 1 — Bookmark record (kind 30078):**
Full metadata: title, description, tags, private flag, etc. (see schema above)

**Event 2 — URL comment (kind 1111, NIP-22):**
```json
{
  "kind": 1111,
  "content": "{user's description or note} #{tag1} #{tag2}",
  "tags": [
    ["I", "{url}", "web"],
    ["K", "web"],
    ["i", "{url}", "web"],
    ["k", "web"],
    ["r", "{url}"]
  ]
}
```

This makes every bookmark visible in Ditto's URL comment thread. Ditto users browsing a URL see Folkstr bookmarks in context.

### URL page queries (updated)

The "who saved this URL?" page queries ALL THREE:
```
{ kinds: [30078], "#r": [url] }      // our bookmark records
{ kinds: [1111], "#I": [url] }       // Ditto + all NIP-22 URL comments
{ kinds: [17], "#i": [url] }         // NIP-73 reactions/likes on the URL
```

This makes our URL page a **universal Nostr social layer** for any URL — showing everything the Nostr network has said about that page, across all apps.

### Private bookmarks

Private bookmarks (NIP-44 encrypted kind 30078) do NOT emit a kind 1111 companion event. Privacy is preserved.

---

## Ditto / NIP-22 Interoperability (Added post-architecture)

### Dual-event bookmark save

When a user saves a bookmark, the app publishes TWO Nostr events:

**Event 1 — Bookmark record (kind 30078):** Full metadata: title, description, tags, private flag, etc.

**Event 2 — URL comment (kind 1111, NIP-22):** Content = user description + hashtags. Tags: I/K (uppercase) for root URL scope, i/k (lowercase) for parent (same as root for top-level).

This makes every public bookmark visible in Ditto URL comment threads automatically.

### URL page queries (updated)

kinds: [30078] with #r = url  -- our bookmark records
kinds: [1111] with #I = url   -- all NIP-22 URL comments (Ditto + others)
kinds: [17] with #i = url     -- NIP-73 reactions on the URL

Our URL page becomes a universal Nostr social layer for any URL.

### Private bookmarks

Private bookmarks (NIP-44 encrypted kind 30078) do NOT emit a kind 1111 companion. Privacy preserved.

---

## ⚠️ SCHEMA UPDATE — Use NIP-51 NOT kind 30078

**Decision:** Drop kind 30078 entirely. Use NIP-51 standard kinds for maximum interoperability.

### Revised data model:

**Kind 30003 (d: "crumbs") — Crumbs bookmark list (NIP-51):**
The user's Crumbs-specific bookmark list. An addressable replaceable event identified by `pubkey:30003:crumbs`.
```json
{
  "kind": 30003,
  "content": "",
  "tags": [
    ["d", "crumbs"],
    ["title", "Crumbs Bookmarks"],
    ["r", "https://example.com/article"],
    ["r", "https://another.com/page"]
  ]
}
```
Used for: "what has this user bookmarked in Crumbs?" (fetch once, efficient)

> **Note:** Kind 10003 is intentionally NOT used. It is a global NIP-51 bookmark list shared across all Nostr apps (Amethyst, Damus, etc.). Writing to it would interfere with other apps' bookmark data. Kind 30003 with `d: "crumbs"` gives Crumbs its own isolated namespace while still using standard NIP-51 machinery.

**Kind 30003 — Other bookmark sets / collections (NIP-51):**
Named collections with other `d` tag identifiers — equivalent to del.icio.us tag bundles.
```json
{
  "kind": 30003,
  "content": "",
  "tags": [
    ["d", "bitcoin-reading-list"],
    ["title", "Bitcoin Reading List"],
    ["r", "https://example.com"],
    ["r", "https://another.com"]
  ]
}
```

**Kind 1111 — Individual bookmark with metadata (NIP-22):**
Published alongside each save. Carries description, tags, and enables URL queries.
```json
{
  "kind": 1111,
  "content": "{description} #{tag1} #{tag2}",
  "tags": [
    ["I", "{url}", "web"],
    ["K", "web"],
    ["i", "{url}", "web"],
    ["k", "web"],
    ["title", "{page title}"],
    ["t", "tag1"],
    ["t", "tag2"]
  ]
}
```
Used for: "who saved this URL?" + Ditto interop + per-bookmark metadata

### Save flow:
1. Publish kind 1111 (individual bookmark with description + tags)
2. Update kind 30003 d: "crumbs" (append URL to Crumbs bookmark list, replace event)
3. Optionally update/create other kind 30003 sets (if saving to a named collection)

### Query patterns:
- User's bookmarks: `{kinds:[30003], authors:[pubkey], "#d":["crumbs"]}` → parse `r` tags
- Who saved a URL: `{kinds:[1111], "#I":["https://..."]}` + `{kinds:[17], "#i":["https://..."]}`
- Tag page: `{kinds:[1111], "#t":["bitcoin"]}` 
- Network feed: `{kinds:[1111], "#K":["web"]}` from followed pubkeys

### Private bookmarks:
- Omit kind 1111 (no public comment)
- Add URL to kind 30003 d: "crumbs" with NIP-44 encrypted content containing the metadata
