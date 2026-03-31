import { useMemo } from 'react';

interface UserAvatarProps {
  src?: string;
  shape?: string;
  size?: number;
  className?: string;
}

function isEmoji(value: string): boolean {
  if (!value || value.length === 0 || value.length > 20) return false;
  return /[^\x00-\x7F]/.test(value);
}

/**
 * Generate a CSS mask from an emoji using canvas
 * Simplified version of Ditto's approach
 */
function getEmojiMaskUrl(emoji: string): string | null {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.font = '200px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(emoji, 128, 140);

    // Convert to alpha mask (white pixels, keep alpha)
    const imageData = ctx.getImageData(0, 0, 256, 256);
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
      data[i] = 255;     // R
      data[i + 1] = 255; // G
      data[i + 2] = 255; // B
      // Keep alpha
    }
    ctx.putImageData(imageData, 0, 0);

    return canvas.toDataURL('image/png');
  } catch {
    return null;
  }
}

const maskCache = new Map<string, string | null>();

export function UserAvatar({ src, shape, size = 40, className = '' }: UserAvatarProps) {
  const maskUrl = useMemo(() => {
    if (!shape || !isEmoji(shape)) return null;
    if (maskCache.has(shape)) return maskCache.get(shape)!;
    const url = getEmojiMaskUrl(shape);
    maskCache.set(shape, url);
    return url;
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
      className={`relative overflow-hidden bg-crumbs-tag ${!maskUrl ? 'rounded-full' : ''} ${className}`}
      style={{ width: size, height: size, ...style }}
    >
      {src ? (
        <img
          src={src}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
          loading="lazy"
        />
      ) : (
        <div className="absolute inset-0 bg-crumbs-tag flex items-center justify-center text-crumbs-muted">
          <span style={{ fontSize: size * 0.4 }}>?</span>
        </div>
      )}
    </div>
  );
}
