import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'

export default function Sheet({
  onClose,
  children,
}: {
  onClose: () => void
  children: ReactNode
}) {
  // body 直下に描画することで、タブバーなどより確実に前面に出す
  return createPortal(
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-handle" />
        {children}
      </div>
    </div>,
    document.body,
  )
}
