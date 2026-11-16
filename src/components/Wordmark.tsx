import { cx } from '../lib/util'

/**
 * Roman's logo (white "Plug" / "Park", mint "&", navy square): the same file as the iOS app icon,
 * Claude outputs1/app-icon-navy/apple-touch-icon.png, shipped as public/icons/apple-touch-icon.png
 * by scripts/make-icons.mjs. Never draw a logo here.
 */
export const LOGO_SRC = `${import.meta.env.BASE_URL}icons/apple-touch-icon.png?v=3`

export function Wordmark({ size = 'md', className }: { size?: 'sm' | 'md' | 'lg'; className?: string }) {
  return <img className={cx('wordmark', size, className)} src={LOGO_SRC} alt="Plug & Park" draggable={false} />
}
