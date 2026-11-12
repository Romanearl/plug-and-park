// Offline QR code: the `qrcode` package builds the module matrix, we draw it as one SVG path.

import QRCode from 'qrcode'
import { useMemo } from 'react'

const QUIET = 4 // quiet-zone modules around the code (needed by scanners)

export function QrCode({ value, size = 200, label }: { value: string; size?: number; label?: string }) {
  const { path, n } = useMemo(() => {
    const qr = QRCode.create(value, { errorCorrectionLevel: 'M' })
    const count = qr.modules.size
    let d = ''
    for (let r = 0; r < count; r++)
      for (let c = 0; c < count; c++) if (qr.modules.get(r, c)) d += `M${c + QUIET} ${r + QUIET}h1v1h-1z`
    return { path: d, n: count + QUIET * 2 }
  }, [value])
  return (
    <svg
      className="qr"
      width={size}
      height={size}
      viewBox={`0 0 ${n} ${n}`}
      shapeRendering="crispEdges"
      role="img"
      aria-label={label ?? 'QR code'}
      data-qr={value}
    >
      {/* Machine-readable: stays pure black on white (not themed) so every scanner and the QR check can read it. */}
      <rect width={n} height={n} fill="#fff" />
      <path d={path} fill="#000" />
    </svg>
  )
}
