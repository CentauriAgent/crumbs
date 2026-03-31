# 🍞 Crumbs — Social Bookmarking on Nostr

> **del.icio.us reborn for the decentralized web.** Save URLs, tag them, follow the trail others leave behind.

**Live Preview:** [crumbs-preview.surge.sh](https://crumbs-preview.surge.sh)

---

## What is Crumbs?

Crumbs is a social bookmarking service built entirely on [Nostr](https://nostr.com). Every bookmark is a Nostr event — your data lives on relays you choose, not in someone else's database.

**Core ideas:**
- **Folksonomy over taxonomy.** Tags are freeform, user-defined. The community's collective tagging creates emergent organization — just like the original del.icio.us.
- **URLs are first-class citizens.** Any URL has its own page showing who bookmarked it. This is the social discovery engine.
- **Nostr-native.** No proprietary backend. NIP-07 login, NIP-22 comments for Ditto interop, NIP-51 bookmark lists.
- **Private by choice.** Public bookmarks fuel discovery. Private bookmarks (NIP-44 encrypted) stay invisible.

## Features

### 🌐 Web App (`/web`)
- **Bookmark feed** — Browse recent bookmarks from across the network
- **Following feed** — See bookmarks from people you follow
- **Profile pages** — View any user's bookmark trail (`/u/:npub`)
- **Tag pages** — Browse all bookmarks with a given tag (`/t/:tag`)
- **Tag cloud** — Visual browse of all tags across the network (`/tags`)
- **URL pages** — See who else bookmarked a URL, with aggregated tags and NIP-73 reaction counts
- **Save bookmarks** — Drop a crumb with title, description, tags, public/private toggle
- **NIP-07 login** — Sign in with Alby, nos2x, or any Nostr browser extension
- **Warm, bakery-inspired theme** — Dark UI with golden accents and serif typography

### 🧩 Browser Extension (`/extension`)
- **One-click bookmarking** — Save the current page with tags and notes
- **Auto-extracts metadata** — Title, URL, meta description, OpenGraph tags
- **Manifest V3** — Chrome + Firefox compatible
- **NIP-46 or local signing** — Connect a remote signer or encrypt a local nsec

## Architecture

### Data Model (NIP-51 + NIP-22)

When you save a bookmark, Crumbs publishes **two Nostr events**:

1. **Kind 1111 (NIP-22 URL comment)** — Individual bookmark with title, description, tags. Makes bookmarks visible in Ditto URL comment threads.
2. **Kind 10003 (NIP-51 bookmark list)** — Appends the URL to your canonical bookmark list.

This dual-event approach gives us per-bookmark metadata (for tag/URL queries) while maintaining NIP-51 compatibility for interop with other Nostr clients.

### Query Patterns

| What | Filter |
|------|--------|
| User's bookmarks | `kinds:[1111], authors:[pubkey], #K:["web"]` |
| Who bookmarked a URL | `kinds:[1111], #I:["https://..."]` |
| Bookmarks by tag | `kinds:[1111], #t:["bitcoin"], #K:["web"]` |
| URL reactions | `kinds:[17], #i:["https://..."]` |
| Network feed | `kinds:[1111], #K:["web"], limit:50` |

### Ditto Interoperability

Every public bookmark automatically appears in [Ditto](https://ditto.pub) URL comment threads. The URL page queries NIP-22 comments (kind 1111) and NIP-73 reactions (kind 17), making Crumbs a **universal social layer** for any URL on Nostr.

## Tech Stack

| Layer | Choice |
|-------|--------|
| Framework | React 19 + TypeScript |
| Build | Vite 8 |
| Nostr | NDK v3 |
| Routing | React Router v7 |
| Styling | Tailwind CSS v4 |
| State | Zustand v5 |
| Icons | Lucide React |

## Project Structure

```
crumbs/
├── DESIGN.md               # Full architecture & design document
├── DITTO-RESEARCH.md        # Ditto theme system & NIP-22 research
├── README.md                # This file
├── web/                     # React web application
│   ├── src/
│   │   ├── pages/           # HomePage, UserPage, TagPage, TagsPage, UrlPage, RecentPage
│   │   ├── components/      # BookmarkCard, BookmarkList, TagBadge, UserAvatar, etc.
│   │   ├── hooks/           # useBookmarks, useProfile (Nostr data fetching)
│   │   ├── stores/          # authStore (Zustand — auth, profile, following)
│   │   ├── lib/             # NDK config, URL normalization, event builders
│   │   └── types/           # TypeScript types
│   └── dist/                # Production build
└── extension/               # Browser extension (Manifest V3)
    ├── popup/               # Extension popup UI
    ├── options/             # Settings page
    ├── background/          # Service worker
    ├── content/             # Page metadata extraction
    └── lib/                 # Nostr event building, relay management
```

## Development

```bash
# Web app
cd web
npm install
npm run dev       # Dev server at localhost:5173
npm run build     # Production build → dist/

# Extension
cd extension
npm install
npm run build     # Build extension → dist/
# Load dist/ as unpacked extension in Chrome
```

## Design Principles

1. **Nostr-native, not Nostr-adjacent.** No proprietary backend. Relays are the database.
2. **Ship fast, iterate.** SPA with client-side relay queries. Simple architecture.
3. **Build for the relay ecosystem.** Respect NIP-65 relay lists. Publish to user's write relays.
4. **Interop first.** NIP-22 + NIP-51 + NIP-73 = works with Ditto and other clients out of the box.

## Default Relays

- `wss://relay.ditto.pub`
- `wss://nos.lol`
- `wss://relay.primal.net`

## Future Ideas

- Import from Pocket, Instapaper, browser bookmarks
- Bookmark collections (kind 30003 sets)
- Wayback Machine integration
- Link rot detection
- Social graph recommendations
- Mobile app

## License

MIT

---

*Leave a trail. Discover the web. 🍞*
