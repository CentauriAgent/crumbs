# Crumbs 📌

**del.icio.us reborn on Nostr** — a social bookmarking service built on open protocols.

Save, tag, and discover bookmarks. See what people in your network are bookmarking. Every URL has its own page showing who saved it.

## Features

- 🔖 Save bookmarks with tags, titles, and descriptions
- 🔒 Public and private bookmarks (NIP-44 encrypted)
- 👥 Social feed — see what your network is bookmarking
- 🏷️ Tag-based discovery (folksonomy)
- 🔗 URL pages — "who bookmarked this?"
- ☁️ Tag clouds and trending tags
- 🧩 Browser extensions (Chrome + Firefox)
- 🎨 Ditto-style themes and profile shapes
- 📡 NIP-65 relay support

## Architecture

See [DESIGN.md](./DESIGN.md) for full system architecture.

## Project Structure

```
crumbs/
├── web/          # React + Vite web application
├── extension/    # Browser extension (Manifest V3)
├── shared/       # Shared code (URL normalization, types)
├── DESIGN.md     # Architecture document
└── RESEARCH.md   # NIP research notes
```

## Tech Stack

- **Web:** React 18, TypeScript, Vite, Tailwind CSS, NDK
- **Extension:** React, nostr-tools, Manifest V3
- **Protocol:** Nostr (kind 30078 for bookmarks, NIP-51 for collections)

## Getting Started

```bash
# Web app
cd web && npm install && npm run dev

# Extension
cd extension && npm install && npm run build
# Load unpacked extension from extension/dist/
```

## License

MIT
