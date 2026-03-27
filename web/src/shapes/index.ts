/**
 * Profile Shapes — public API
 *
 * Usage:
 *   import { ProfileShape, useProfileShape } from './shapes'
 */

export { ProfileShape, isEmoji, preloadMask, clearMaskCache } from './ProfileShape'
export type { ProfileShapeProps } from './ProfileShape'

export { useProfileShape, extractProfileShape } from './useProfileShape'
export type { ProfileShapeData } from './useProfileShape'
