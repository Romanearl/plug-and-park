import { cx } from '../lib/util'

/**
 * "Plug &" / "Park" stacked in serif, navy on a sky-blue square. Our own mark — not a copy of any logo.
 * The final logo is being designed separately: swap it in here (and in scripts/make-icons.mjs for the icons).
 */
export function Wordmark({ size = 'md', className }: { size?: 'sm' | 'md' | 'lg'; className?: string }) {
  return (
    <span className={cx('wordmark', size, className)} role="img" aria-label="Plug & Park">
      <span aria-hidden>Plug &amp;</span>
      <span aria-hidden>Park</span>
    </span>
  )
}
