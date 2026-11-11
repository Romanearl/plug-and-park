// One small notice when the browser blocks storage (or it's full): the demo keeps working in memory.
import { useState } from 'react'
import { useStorageBroken } from '../lib/store'
import { Icon } from './Icon'

export function StorageNotice() {
  const broken = useStorageBroken()
  const [hidden, setHidden] = useState(false)
  if (!broken || hidden) return null
  return (
    <div className="storage-notice" role="status">
      <Icon name="info" size={18} />
      <span style={{ flex: 1 }}>Storage is blocked — the demo runs in memory until you close this tab.</span>
      <button className="icon-btn" style={{ width: 36, height: 36 }} onClick={() => setHidden(true)} aria-label="Dismiss">
        <Icon name="close" size={16} />
      </button>
    </div>
  )
}
