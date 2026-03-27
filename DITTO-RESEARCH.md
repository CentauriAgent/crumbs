# Ditto Themes & Profile Shapes — Implementation Research

> Researched from the [Ditto source code](https://gitlab.com/soapbox-pub/ditto) (main branch) and
> [Ditto Nostr Reference](https://about.ditto.pub/reference) on 2026-03-26.

---

## Table of Contents

1. [Theme System Overview](#1-theme-system-overview)
2. [Nostr Event Kinds for Themes](#2-nostr-event-kinds-for-themes)
3. [Theme Data Model (TypeScript)](#3-theme-data-model-typescript)
4. [Built-in Theme Presets (All 23)](#4-built-in-theme-presets-all-23)
5. [CSS Custom Properties / Token Derivation](#5-css-custom-properties--token-derivation)
6. [How Themes Are Stored & Synced](#6-how-themes-are-stored--synced)
7. [Font System](#7-font-system)
8. [Background System](#8-background-system)
9. [Profile Shapes (Avatar Emoji Masks)](#9-profile-shapes-avatar-emoji-masks)
10. [Implementation Guide for React Apps](#10-implementation-guide-for-react-apps)

---

## 1. Theme System Overview

Ditto's theme system has **three layers** (highest priority first):

1. **User settings** stored in `localStorage` (and synced to NIP-78 encrypted events)
2. **Build config** from `ditto.json`
3. **Hardcoded defaults**

Theme modes: `"light"` | `"dark"` | `"system"` | `"custom"`

- `light` / `dark` → use the built-in light/dark color palettes
- `system` → resolves to light/dark based on `prefers-color-scheme`
- `custom` → uses a `ThemeConfig` object with 3 core colors + optional fonts/backgrounds

### Key Architectural Choices

- **Only 3 core colors** define the entire theme: `background`, `text`, `primary`
- All 19 CSS tokens (card, muted, border, etc.) are **automatically derived** from those 3 colors
- Colors are stored as **HSL strings** internally: `"228 20% 10%"` (no `hsl()` wrapper)
- Colors are stored as **hex strings** in Nostr events: `"#1a1a2e"`
- Conversion happens via `hslStringToHex()` / `hexToHslString()` at publish/parse time

---

## 2. Nostr Event Kinds for Themes

### Kind 36767 — Theme Definition (Addressable)

Shareable, named theme definitions. Users can publish multiple (different `d` tags).

```json
{
  "kind": 36767,
  "content": "",
  "tags": [
    ["d", "mk-dark-theme"],
    ["c", "#1a1a2e", "background"],
    ["c", "#e0e0e0", "text"],
    ["c", "#6c3ce0", "primary"],
    ["f", "Inter", "https://example.com/inter.woff2", "body"],
    ["f", "Playfair Display", "https://example.com/playfair.woff2", "title"],
    ["bg", "url https://example.com/bg.jpg", "mode cover", "m image/jpeg", "dim 1920x1080"],
    ["title", "MK Dark Theme"],
    ["description", "A sleek dark theme with purple and blue accents"],
    ["alt", "Custom theme: MK Dark Theme"],
    ["t", "theme"]
  ]
}
```

**Tag reference:**

| Tag | Required | Description |
|-----|----------|-------------|
| `d` | Yes | Unique identifier (slug) |
| `c` | Yes (×3) | Hex color with role: `background`, `text`, `primary` |
| `f` | No | Font: `[family, url, role]` where role = `"body"` or `"title"` |
| `bg` | No | Background: imeta-style variadic (`url`, `mode`, `m`, `dim`, `blurhash`) |
| `title` | Yes | Human-readable name |
| `description` | No | Brief description |
| `alt` | Yes | NIP-31 fallback |
| `t` | Yes | Set to `"theme"` for discoverability |

### Kind 16767 — Active Profile Theme (Replaceable)

The user's currently active theme. Only one exists per user. Clients query this when visiting a profile.

```json
{
  "kind": 16767,
  "content": "",
  "tags": [
    ["c", "#1a1a2e", "background"],
    ["c", "#e0e0e0", "text"],
    ["c", "#6c3ce0", "primary"],
    ["f", "Inter", "https://example.com/inter.woff2", "body"],
    ["bg", "url https://example.com/bg.jpg", "mode cover", "m image/jpeg"],
    ["title", "MK Dark Theme"],
    ["a", "36767:<source-author-pubkey>:<source-d-tag>"],
    ["alt", "Active profile theme"]
  ]
}
```

- The `a` tag references the source theme definition (for attribution: "Using MK Dark Theme by @mk")
- To **clear** the active theme: publish a kind 5 deletion targeting kind 16767, OR publish a new kind 16767 with empty tags
- To **query**: `{ kinds: [16767], authors: [<pubkey>], limit: 1 }`

### Kind 30078 — Encrypted App Settings (NIP-78)

Per-user encrypted settings stored with `d` tag = `<appId>/metadata`. Content is NIP-44 encrypted JSON.

```json
{
  "kind": 30078,
  "content": "<NIP-44 encrypted JSON>",
  "tags": [
    ["d", "ditto/metadata"],
    ["title", "Ditto Metadata"],
    ["client", "ditto.pub"]
  ]
}
```

Decrypted content includes:
```json
{
  "theme": "dark",
  "customTheme": {
    "colors": {
      "background": "228 20% 10%",
      "text": "210 40% 98%",
      "primary": "258 70% 60%"
    },
    "font": { "family": "Inter" },
    "background": { "url": "...", "mode": "cover" }
  },
  "autoShareTheme": true,
  "feedSettings": { ... },
  "contentWarningPolicy": "blur",
  ...
}
```

**Note:** In encrypted settings, colors are HSL strings. In Nostr event tags, colors are hex.

---

## 3. Theme Data Model (TypeScript)

```typescript
/** The 3 core colors. All other tokens are derived from these. */
interface CoreThemeColors {
  background: string;  // HSL: "228 20% 10%"
  text: string;        // HSL: "210 40% 98%"
  primary: string;     // HSL: "258 70% 60%"
}

interface ThemeFont {
  family: string;      // CSS font-family name
  url?: string;        // Direct URL to .woff2/.ttf/.otf
}

interface ThemeBackground {
  url: string;
  mode?: 'cover' | 'tile';
  dimensions?: string; // "1920x1080"
  mimeType?: string;   // "image/jpeg"
  blurhash?: string;
}

/** Complete theme configuration */
interface ThemeConfig {
  title?: string;
  colors: CoreThemeColors;
  font?: ThemeFont;       // body font (global)
  titleFont?: ThemeFont;  // title font (profile display name only)
  background?: ThemeBackground;
}

/** The 19 derived CSS token values */
interface ThemeTokens {
  background: string;
  foreground: string;
  card: string;
  cardForeground: string;
  popover: string;
  popoverForeground: string;
  primary: string;
  primaryForeground: string;
  secondary: string;
  secondaryForeground: string;
  muted: string;
  mutedForeground: string;
  accent: string;
  accentForeground: string;
  destructive: string;
  destructiveForeground: string;
  border: string;
  input: string;
  ring: string;
}
```

---

## 4. Built-in Theme Presets (All 23)

Ditto ships with 2 base themes + 21 custom presets. All presets set theme mode to `"custom"`.

### Base Themes

| Name | Background | Text | Primary |
|------|-----------|------|---------|
| **Light** | `270 50% 97%` | `270 25% 12%` | `270 65% 55%` |
| **Dark** | `228 20% 10%` | `210 40% 98%` | `258 70% 60%` |

### Custom Presets

| Key | Label | Emoji | Featured | Font | Has BG |
|-----|-------|-------|----------|------|--------|
| `pink` | Pink | 🌸 | ✅ | Comfortaa | ✅ |
| `toxic` | Toxic | ☢️ | — | JetBrains Mono | — |
| `sunset` | Sunset | 🌅 | — | Lora | — |
| `skater` | Skater | 🛹 | ✅ | Rubik Maps | ✅ |
| `kawaii` | Kawaii | 🌸 | ✅ | Cherry Bomb One | ✅ |
| `grunge` | Grunge | 🖤 | ✅ | Lacquer | ✅ |
| `mspaint` | MS Paint | 🖥️ | ✅ | Silkscreen | ✅ |
| `retropop` | Retro Pop | 💿 | ✅ | Bungee Shade | ✅ |
| `bubblegum` | Bubblegum | 🍬 | ✅ | Barriecito | ✅ |
| `gamer` | Gamer | ⚡ | ✅ | Press Start 2P | ✅ |
| `cottage` | Cottage | 🌿 | ✅ | Lora | ✅ (Unsplash) |
| `midnight` | Midnight | 🌃 | ✅ | Inter | ✅ (Unsplash) |
| `sky` | Sky | ☁️ | ✅ | Nunito | ✅ (Unsplash) |
| `motherboard` | Motherboard | 🪟 | ✅ | Courier Prime | ✅ (Unsplash) |
| `plush` | Plush | 🧸 | — | Comic Neue | ✅ (Unsplash) |
| `galaxy` | Galaxy | 🌌 | ✅ | DM Sans | ✅ (Unsplash) |
| `ocean` | Ocean | 🌊 | ✅ | Nunito | ✅ (Unsplash) |
| `forest` | Forest | 🌲 | ✅ | Merriweather | ✅ (Unsplash) |
| `clearsky` | Clear Sky Vibes | ✨ | ✅ | Comfortaa | ✅ (Unsplash) |
| `silenttorii` | Silent Torii | ⛩️ | ✅ | DM Sans | ✅ (Blossom) |
| `quiethorizon` | Quiet Horizon | 🌅 | ✅ | Lora | ✅ (Blossom) |
| `wherepathsmeet` | Where Paths Meet | 🌉 | ✅ | DM Sans | ✅ (Blossom) |
| `once` | Once | 🎲 | ✅ | Outfit | ✅ (picsum.photos) |

"Featured" presets appear in compact theme pickers (sidebar dropdown, mobile drawer). All presets appear in settings.

---

## 5. CSS Custom Properties / Token Derivation

### The 19 CSS Custom Properties

Ditto uses Tailwind CSS 3 + shadcn/ui. These are the CSS custom properties set on `:root`:

```css
:root {
  --background: 228 20% 10%;
  --foreground: 210 40% 98%;
  --card: 228 20% 12%;           /* derived: bg lightened 2% (dark) or same as bg (light) */
  --card-foreground: 210 40% 98%;
  --popover: 228 20% 12%;        /* same as card */
  --popover-foreground: 210 40% 98%;
  --primary: 258 70% 60%;
  --primary-foreground: 0 0% 100%;  /* auto-contrast: white on dark primary, dark on light */
  --secondary: 228 20% 18%;     /* derived: bg lightened 8% (dark) or darkened 4% (light) */
  --secondary-foreground: 210 40% 98%;
  --muted: 228 20% 18%;         /* same as secondary */
  --muted-foreground: 210 20% 68%;  /* dimmer text */
  --accent: 258 70% 60%;        /* mirrors primary */
  --accent-foreground: 0 0% 100%;
  --destructive: 0 72% 51%;
  --destructive-foreground: 0 0% 95%;
  --border: 258 28% 30%;        /* hue from primary, reduced saturation */
  --input: 258 28% 30%;         /* same as border */
  --ring: 258 70% 60%;          /* same as primary */
}
```

### Derivation Algorithm (from `colorUtils.ts`)

```typescript
function deriveTokensFromCore(background: string, text: string, primary: string): ThemeTokens {
  const dark = isDarkTheme(background);  // luminance < 0.2

  // Surface colors
  const card = dark ? lighten(background, 2) : background;
  const popover = card;
  const secondarySurface = dark ? lighten(background, 8) : darken(background, 4);
  const muted = secondarySurface;

  // Border: uses primary hue with reduced saturation
  const border = dark
    ? formatHsl(primaryHue, primarySat * 0.4, 30)
    : formatHsl(primaryHue, primarySat * 0.5, 82);

  // Muted foreground: dimmer text
  const mutedFg = dark
    ? formatHsl(textHue, max(textSat - 20, 0), max(textLightness - 30, 40))
    : formatHsl(textHue, max(textSat - 30, 0), min(textLightness + 35, 55));

  // Primary foreground: auto-contrast (white or dark)
  const primaryFg = isDarkTheme(primary) ? '0 0% 100%' : '222.2 84% 4.9%';

  // accent mirrors primary
  const accent = primary;
  const accentForeground = primaryFg;

  // Destructive: standard red
  const destructive = dark ? '0 72% 51%' : '0 84.2% 60.2%';
}
```

### How CSS Is Applied

```typescript
// 1. Build CSS from core colors
const css = buildThemeCssFromCore(colors);  // → ":root { --background: ...; ... }"

// 2. Inject into <style id="theme-vars">
let el = document.getElementById('theme-vars');
if (!el) { el = document.createElement('style'); el.id = 'theme-vars'; document.head.appendChild(el); }
el.textContent = css;

// 3. Set class on <html> for Tailwind dark mode
document.documentElement.className = resolved;  // "light" | "dark" | "custom"
```

**Anti-flicker trick:** Theme switches temporarily inject a `<style>` that disables all CSS transitions:
```javascript
const noTransition = document.createElement('style');
noTransition.textContent = '*, *::before, *::after { transition: none !important; }';
document.head.appendChild(noTransition);
// ... apply theme ...
requestAnimationFrame(() => noTransition.remove());
```

---

## 6. How Themes Are Stored & Synced

### Storage Hierarchy

1. **Local state** (React context / `localStorage`): Immediate UI updates
2. **NIP-78 encrypted event** (kind 30078): Cross-device sync, private
3. **NIP profile theme event** (kind 16767): Public, visible on profile
4. **NIP theme definitions** (kind 36767): Shareable themes

### Sync Flow

```
User picks theme
  → updateConfig() [local state, immediate]
  → syncToEncrypted() [debounced 1s, publishes NIP-78 event]
  → autoPublishTheme() [debounced 2s, publishes kind 16767 if autoShareTheme=true]
```

### Auto-Share

Users can toggle `autoShareTheme`. When enabled, any custom theme change is automatically published as their active profile theme (kind 16767) after a 2-second debounce.

---

## 7. Font System

### Font Types

- **Body font** (`font`): Applies globally to all text via `html { font-family: ... }`
- **Title font** (`titleFont`): Applies only to profile display names via `--title-font-family` CSS custom property

### Font Loading

1. Try **bundled** fontsource packages first (dynamic import)
2. Fall back to **remote URL** via `@font-face` injection

### Nostr Event Font Tags

```
["f", "Inter", "https://cdn.example.com/inter.woff2", "body"]
["f", "Playfair Display", "https://cdn.example.com/playfair.woff2", "title"]
```

- Body tag MUST be ordered before title tag
- Legacy tags without a role (3 elements) are treated as body

---

## 8. Background System

### Background Tag Format (imeta-style)

```
["bg", "url https://example.com/bg.jpg", "mode cover", "m image/jpeg", "dim 1920x1080", "blurhash LEHV6n..."]
```

| Key | Required | Description |
|-----|----------|-------------|
| `url` | Yes | URL to image/video |
| `mode` | Yes | `"cover"` or `"tile"` |
| `m` | Yes | MIME type |
| `dim` | No | `"<width>x<height>"` |
| `blurhash` | No | Progressive loading placeholder |

---

## 9. Profile Shapes (Avatar Emoji Masks)

### How It Works

Profile shapes use **emoji as CSS masks** on avatars. The `shape` field in kind 0 metadata holds any emoji.

### Kind 0 Storage

```json
{
  "kind": 0,
  "content": "{\"name\":\"alex\",\"picture\":\"https://example.com/avatar.jpg\",\"shape\":\"🔷\"}"
}
```

The `shape` field is a **string containing any emoji**. There is NO fixed list of shapes — any emoji works.

> A [NIP proposal](https://github.com/nostr-protocol/nips/pull/2268) has been submitted to standardize this field.

### Emoji Detection (`avatarShape.ts`)

```typescript
/** Check if a string is a valid emoji shape */
function isEmoji(value: string): boolean {
  if (!value || value.length === 0 || value.length > 20) return false;
  return /[^\x00-\x7F]/.test(value);  // must contain non-ASCII
}

/** Extract shape from metadata */
function getAvatarShape(metadata: { [key: string]: unknown }): string | undefined {
  const raw = metadata?.shape;
  return isValidAvatarShape(raw) ? raw : undefined;
}
```

### CSS Mask Implementation

The avatar shape is implemented via CSS `mask-image` with a dynamically generated PNG data-URL:

```typescript
// Avatar component applies mask-image style when shape is emoji
const mergedStyle = {
  WebkitMaskImage: `url(${maskDataUrl})`,
  maskImage: `url(${maskDataUrl})`,
  WebkitMaskSize: 'contain',
  maskSize: 'contain',
  WebkitMaskRepeat: 'no-repeat',
  maskRepeat: 'no-repeat',
  WebkitMaskPosition: 'center',
  maskPosition: 'center',
};
```

**No `rounded-full`** is applied when an emoji shape is active (the mask handles the shape).

### Mask Generation Algorithm (`getEmojiMaskUrl`)

This is a client-side canvas-based approach:

1. **Draw large:** Render emoji at 512px on a 768×768 scratch canvas
2. **Measure:** Scan pixels to find tight bounding box (alpha threshold > 25 to ignore shadows)
3. **Square the crop:** Expand shorter axis to make crop square (prevents stretching)
4. **Redraw:** Draw squared crop onto 256×256 output canvas
5. **Alpha mask:** Set all RGB to white (255), keep original alpha channel
6. **Export:** `canvas.toDataURL('image/png')` → cached in `Map<string, string>`

### Border Style for Emoji Shapes

Since `border-radius` doesn't work with mask shapes, borders use CSS `drop-shadow`:

```typescript
const emojiAvatarBorderStyle: React.CSSProperties = {
  filter:
    'drop-shadow(3px 0 0 hsl(var(--background)))' +
    ' drop-shadow(-3px 0 0 hsl(var(--background)))' +
    ' drop-shadow(0 3px 0 hsl(var(--background)))' +
    ' drop-shadow(0 -3px 0 hsl(var(--background)))',
};
```

This creates a solid outline that follows the mask shape.

### Common Shape Emojis (from Ditto's NIP proposal screenshot)

While any emoji works, common choices include:
- 🔷 Diamond
- ⬟ Hexagon
- ⭐ Star
- ❤️ Heart
- 🟢 Circle (colored)
- ⬜ Square
- (no shape = default circle via `rounded-full`)

---

## 10. Implementation Guide for React Apps

### Minimal Theme Implementation

```tsx
// 1. Define core types
interface CoreThemeColors {
  background: string;  // HSL: "228 20% 10%"
  text: string;
  primary: string;
}

// 2. Derive tokens (simplified version of Ditto's deriveTokensFromCore)
function deriveTokens(colors: CoreThemeColors) {
  const dark = isDarkTheme(colors.background);
  return {
    '--background': colors.background,
    '--foreground': colors.text,
    '--primary': colors.primary,
    '--primary-foreground': dark ? '0 0% 100%' : '222.2 84% 4.9%',
    '--card': dark ? lighten(colors.background, 2) : colors.background,
    '--muted': dark ? lighten(colors.background, 8) : darken(colors.background, 4),
    '--border': `${parseHsl(colors.primary).h} ${parseHsl(colors.primary).s * 0.4}% 30%`,
    // ... derive remaining tokens
  };
}

// 3. Apply theme
function applyTheme(colors: CoreThemeColors) {
  const tokens = deriveTokens(colors);
  const css = Object.entries(tokens)
    .map(([k, v]) => `${k}: ${v};`)
    .join(' ');
  
  let el = document.getElementById('theme-vars');
  if (!el) {
    el = document.createElement('style');
    el.id = 'theme-vars';
    document.head.appendChild(el);
  }
  el.textContent = `:root { ${css} }`;
}
```

### Reading Themes from Nostr

```typescript
// Query active profile theme
const filter = { kinds: [16767], authors: [pubkey], limit: 1 };
const events = await pool.querySync(relays, filter);

if (events.length > 0) {
  const event = events[0];
  const colors = parseColorTags(event.tags); // Extract c tags → CoreThemeColors
  const fonts = parseFontTags(event.tags);   // Extract f tags
  const bg = parseBackgroundTag(event.tags);  // Extract bg tag
  
  if (colors) applyTheme(colors);
}

// Parse c tags → CoreThemeColors
function parseColorTags(tags: string[][]): CoreThemeColors | null {
  const map = new Map<string, string>();
  for (const tag of tags) {
    if (tag[0] === 'c' && tag[1] && tag[2]) {
      map.set(tag[2], tag[1]);  // tag[2] = role, tag[1] = hex color
    }
  }
  const bg = map.get('background');
  const text = map.get('text');
  const primary = map.get('primary');
  if (!bg || !text || !primary) return null;
  return {
    background: hexToHslString(bg),
    text: hexToHslString(text),
    primary: hexToHslString(primary),
  };
}
```

### Writing Themes to Nostr

```typescript
// Publish active profile theme (kind 16767)
const event = {
  kind: 16767,
  content: '',
  tags: [
    ['c', hslStringToHex(colors.background), 'background'],
    ['c', hslStringToHex(colors.text), 'text'],
    ['c', hslStringToHex(colors.primary), 'primary'],
    ['alt', 'Active profile theme'],
  ],
};
// sign and publish...

// Publish theme definition (kind 36767)
const event = {
  kind: 36767,
  content: '',
  tags: [
    ['d', 'my-theme-slug'],
    ['c', hslStringToHex(colors.background), 'background'],
    ['c', hslStringToHex(colors.text), 'text'],
    ['c', hslStringToHex(colors.primary), 'primary'],
    ['title', 'My Theme'],
    ['alt', 'Custom theme: My Theme'],
    ['t', 'theme'],
  ],
};
```

### Implementing Avatar Shapes

```tsx
function ShapedAvatar({ src, shape, size = 40 }: {
  src: string;
  shape?: string;
  size?: number;
}) {
  const maskUrl = useMemo(() => {
    if (!shape || !isEmoji(shape)) return null;
    return getEmojiMaskUrl(shape);  // See algorithm above
  }, [shape]);

  const style: React.CSSProperties = maskUrl ? {
    WebkitMaskImage: `url(${maskUrl})`,
    maskImage: `url(${maskUrl})`,
    WebkitMaskSize: 'contain',
    maskSize: 'contain',
    WebkitMaskRepeat: 'no-repeat',
    maskRepeat: 'no-repeat',
    WebkitMaskPosition: 'center',
    maskPosition: 'center',
  } : {};

  return (
    <div
      className={cn(
        "relative overflow-hidden bg-muted",
        !maskUrl && "rounded-full"
      )}
      style={{ width: size, height: size, ...style }}
    >
      <img src={src} className="absolute inset-0 h-full w-full object-cover" />
    </div>
  );
}
```

### Reading Shape from Kind 0

```typescript
// Parse kind 0 metadata
const event = await fetchKind0(pubkey);
const metadata = JSON.parse(event.content);
const shape = metadata.shape;  // emoji string like "🔷", or undefined

// Validate
if (shape && isEmoji(shape)) {
  // Apply shape to avatar
}
```

### Writing Shape to Kind 0

```typescript
const metadata = JSON.parse(existingKind0.content);
metadata.shape = "🔷";  // or any emoji, or delete to reset to circle

const event = {
  kind: 0,
  content: JSON.stringify(metadata),
  tags: [['client', 'MyApp']],
};
// sign and publish...
```

---

## Key Source Files Reference

| File | Purpose |
|------|---------|
| `src/themes.ts` | Core types, all 23 presets, CSS token builder |
| `src/lib/colorUtils.ts` | HSL/hex conversion, token derivation algorithm |
| `src/lib/themeEvent.ts` | Nostr event parsing/building (kinds 36767, 16767) |
| `src/lib/avatarShape.ts` | Emoji detection, mask generation, border style |
| `src/lib/fontLoader.ts` | Font loading (bundled + remote), CSS override |
| `src/hooks/useTheme.ts` | React hook: get/set theme, sync to encrypted |
| `src/hooks/usePublishTheme.ts` | React hook: publish/delete/set-active theme events |
| `src/hooks/useEncryptedSettings.ts` | NIP-78 encrypted settings (kind 30078) |
| `src/components/ui/avatar.tsx` | Avatar component with shape mask support |

---

## Summary for Crumbs Implementation

1. **Themes** are 3 HSL colors → 19 CSS custom properties (auto-derived)
2. **Theme storage**: NIP-78 (encrypted, private) + kind 16767 (public profile) + kind 36767 (shareable definitions)
3. **Profile shapes** are emoji strings in kind 0 `shape` field → rendered as CSS `mask-image` via canvas-generated PNGs
4. **No fixed shape list** — any emoji works, detection is simple non-ASCII check
5. **Tech stack**: React 18 + Tailwind 3 + shadcn/ui (same as Crumbs can use)
6. **HSL internally, hex in events** — convert at publish/parse boundaries

---

## Ditto URL Comments — NIP-22 Interoperability

Ditto supports **kind 17** (External Content Reactions, NIP-73) and **kind 1111** (Comments, NIP-22) on external URLs. This is how Ditto users comment on web pages directly from the Ditto UI.

### How URL Comments Work (NIP-22 + NIP-73)

A comment on a URL uses kind 1111 with the URL as an `I` (uppercase) tag scoping the root:

```json
{
  "kind": 1111,
  "content": "Great article on decentralized identity!",
  "tags": [
    ["I", "https://example.com/article"],
    ["K", "web"],
    ["i", "https://example.com/article"],
    ["k", "web"]
  ]
}
```

**Tag rules (NIP-22):**
- Uppercase tags (`I`, `K`, `E`, `A`) = root scope
- Lowercase tags (`i`, `k`, `e`, `a`) = parent item (same as root for top-level comments)
- `K`/`k` = "web" when root/parent is a URL (per NIP-73)
- `I`/`i` = the full URL

### Interoperability Plan for Folkstr/our app

**When a user saves a bookmark**, we ALSO publish a kind 1111 comment on the URL with the user's description as the content. This means:

1. The bookmark appears in Ditto's URL comment thread for that page
2. Ditto users see Folkstr bookmarks in context (with tags as the content)
3. Our "who bookmarked this URL" page queries kind 1111 events with `#I` = URL — pulling in ALL Nostr comments on that URL, not just our bookmarks
4. Our app becomes a **superset** of Ditto URL comments

**Query pattern for URL page:**
```json
{"kinds": [1111], "#I": ["https://example.com/article"]}
```
This returns all comments from Ditto, our app, and any other NIP-22 client.

**Our bookmark event** emits TWO events per save:
1. Kind 30078 (our addressable bookmark record with full metadata)  
2. Kind 1111 (NIP-22 URL comment for interoperability) — content = user's description/note

The kind 1111 content could be: `"[bookmark] {title} — {description} #{tag1} #{tag2}"`

### Kind 17 — External Content Reactions (NIP-73)
Ditto also uses kind 17 for reactions (likes) on URLs. We should support this too:
- When user "likes" a bookmark without a comment, emit kind 17
- Query kind 17 events for a URL to show reaction counts on URL pages

```json
{
  "kind": 17,
  "content": "+",
  "tags": [
    ["i", "https://example.com/article", "web"],
    ["k", "web"]
  ]
}
```

### Summary
Our "who saved this?" URL page should query:
- `kinds: [30078]` with `#r` = URL → our bookmark records
- `kinds: [1111]` with `#I` = URL → all Nostr URL comments (Ditto + others)
- `kinds: [17]` with `#i` = URL → reaction counts

This makes us a **social layer on top of the entire Nostr URL comment ecosystem**, not just an isolated bookmark silo.
