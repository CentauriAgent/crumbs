/**
 * ProfileShape — Avatar component with emoji-based CSS mask shapes.
 *
 * If no shape: renders normal circular avatar.
 * If shape (emoji): uses canvas to render emoji → generate alpha mask → CSS mask-image.
 * Border uses drop-shadow to follow mask contour.
 * Masks are cached in memory.
 */
import React, { useMemo, useEffect, useState } from 'react'

// --- Emoji mask cache ---
const maskCache = new Map<string, string>()

/**
 * Check if a string is a valid emoji shape.
 * Must be non-empty, ≤20 chars, and contain non-ASCII characters.
 */
export function isEmoji(value: string): boolean {
  if (!value || value.length === 0 || value.length > 20) return false
  return /[^\x00-\x7F]/.test(value)
}

/**
 * Generate a PNG data URL mask from an emoji.
 * Algorithm (from Ditto):
 * 1. Draw emoji at 512px on 768×768 scratch canvas
 * 2. Scan pixels to find tight bounding box (alpha > 25)
 * 3. Square the crop (expand shorter axis)
 * 4. Redraw at 256×256
 * 5. Convert all RGB to white, keep alpha → alpha mask
 * 6. Export as PNG data URL
 */
function generateEmojiMask(emoji: string): string {
  // Check cache
  const cached = maskCache.get(emoji)
  if (cached) return cached

  const SCRATCH_SIZE = 768
  const EMOJI_SIZE = 512
  const OUTPUT_SIZE = 256
  const ALPHA_THRESHOLD = 25

  // Step 1: Draw emoji on scratch canvas
  const scratch = document.createElement('canvas')
  scratch.width = SCRATCH_SIZE
  scratch.height = SCRATCH_SIZE
  const ctx = scratch.getContext('2d')!
  ctx.clearRect(0, 0, SCRATCH_SIZE, SCRATCH_SIZE)
  ctx.font = `${EMOJI_SIZE}px serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(emoji, SCRATCH_SIZE / 2, SCRATCH_SIZE / 2)

  // Step 2: Find bounding box
  const imageData = ctx.getImageData(0, 0, SCRATCH_SIZE, SCRATCH_SIZE)
  const { data } = imageData
  let minX = SCRATCH_SIZE, minY = SCRATCH_SIZE, maxX = 0, maxY = 0

  for (let y = 0; y < SCRATCH_SIZE; y++) {
    for (let x = 0; x < SCRATCH_SIZE; x++) {
      const alpha = data[(y * SCRATCH_SIZE + x) * 4 + 3]
      if (alpha > ALPHA_THRESHOLD) {
        if (x < minX) minX = x
        if (x > maxX) maxX = x
        if (y < minY) minY = y
        if (y > maxY) maxY = y
      }
    }
  }

  // Fallback if nothing found (emoji didn't render)
  if (maxX <= minX || maxY <= minY) {
    // Return a circle mask as fallback
    const fallback = document.createElement('canvas')
    fallback.width = OUTPUT_SIZE
    fallback.height = OUTPUT_SIZE
    const fCtx = fallback.getContext('2d')!
    fCtx.beginPath()
    fCtx.arc(OUTPUT_SIZE / 2, OUTPUT_SIZE / 2, OUTPUT_SIZE / 2, 0, Math.PI * 2)
    fCtx.fillStyle = 'white'
    fCtx.fill()
    const url = fallback.toDataURL('image/png')
    maskCache.set(emoji, url)
    return url
  }

  // Step 3: Square the crop
  let cropW = maxX - minX
  let cropH = maxY - minY
  const cropSize = Math.max(cropW, cropH)

  // Center the crop
  const cropCenterX = (minX + maxX) / 2
  const cropCenterY = (minY + maxY) / 2
  const cropX = Math.max(0, Math.round(cropCenterX - cropSize / 2))
  const cropY = Math.max(0, Math.round(cropCenterY - cropSize / 2))
  const finalCropSize = Math.min(cropSize, SCRATCH_SIZE - cropX, SCRATCH_SIZE - cropY)

  // Step 4: Redraw at output size
  const output = document.createElement('canvas')
  output.width = OUTPUT_SIZE
  output.height = OUTPUT_SIZE
  const outCtx = output.getContext('2d')!
  outCtx.drawImage(scratch, cropX, cropY, finalCropSize, finalCropSize, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE)

  // Step 5: Convert to alpha mask (all RGB → white, keep alpha)
  const outData = outCtx.getImageData(0, 0, OUTPUT_SIZE, OUTPUT_SIZE)
  const pixels = outData.data
  for (let i = 0; i < pixels.length; i += 4) {
    pixels[i] = 255     // R
    pixels[i + 1] = 255 // G
    pixels[i + 2] = 255 // B
    // alpha stays as-is
  }
  outCtx.putImageData(outData, 0, 0)

  // Step 6: Export
  const url = output.toDataURL('image/png')
  maskCache.set(emoji, url)
  return url
}

// --- Border style for emoji shapes (drop-shadow follows mask) ---

const emojiAvatarBorderStyle: React.CSSProperties = {
  filter:
    'drop-shadow(2px 0 0 var(--color-border))' +
    ' drop-shadow(-2px 0 0 var(--color-border))' +
    ' drop-shadow(0 2px 0 var(--color-border))' +
    ' drop-shadow(0 -2px 0 var(--color-border))',
}

// --- Component ---

export interface ProfileShapeProps {
  /** Avatar image URL */
  src: string
  /** Emoji shape from kind 0 (e.g. "🔷", "⭐", "🌙") */
  shape?: string
  /** Size in pixels (default 48) */
  size?: number
  /** Additional CSS class */
  className?: string
  /** Show border */
  showBorder?: boolean
  /** Alt text */
  alt?: string
}

export function ProfileShape({
  src,
  shape,
  size = 48,
  className,
  showBorder = false,
  alt = 'Avatar',
}: ProfileShapeProps) {
  const [maskUrl, setMaskUrl] = useState<string | null>(null)

  // Generate mask asynchronously (canvas ops) on mount/shape change
  useEffect(() => {
    if (shape && isEmoji(shape)) {
      // Generate in next microtask to avoid blocking render
      const url = generateEmojiMask(shape)
      setMaskUrl(url)
    } else {
      setMaskUrl(null)
    }
  }, [shape])

  const hasMask = !!maskUrl

  const containerStyle: React.CSSProperties = {
    width: size,
    height: size,
    position: 'relative',
    overflow: 'hidden',
    flexShrink: 0,
    ...(hasMask
      ? {
          WebkitMaskImage: `url(${maskUrl})`,
          maskImage: `url(${maskUrl})`,
          WebkitMaskSize: 'contain',
          maskSize: 'contain',
          WebkitMaskRepeat: 'no-repeat',
          maskRepeat: 'no-repeat',
          WebkitMaskPosition: 'center',
          maskPosition: 'center',
        }
      : {
          borderRadius: '50%',
        }),
  }

  const wrapperStyle: React.CSSProperties = {
    display: 'inline-block',
    ...(showBorder && hasMask ? emojiAvatarBorderStyle : {}),
  }

  return (
    <div style={wrapperStyle} className={className}>
      <div style={containerStyle}>
        <img
          src={src}
          alt={alt}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            display: 'block',
          }}
          loading="lazy"
        />
      </div>
    </div>
  )
}

/** Pre-warm the mask cache for an emoji (call early if you know the shape) */
export function preloadMask(emoji: string): void {
  if (emoji && isEmoji(emoji) && !maskCache.has(emoji)) {
    generateEmojiMask(emoji)
  }
}

/** Clear the mask cache */
export function clearMaskCache(): void {
  maskCache.clear()
}
