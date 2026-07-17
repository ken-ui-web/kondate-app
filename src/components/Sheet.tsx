import type { ReactNode } from 'react'

export default function Sheet({
  onClose,
  children,
}: {
  onClose: () => void
  children: ReactNode
}) {
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-handle" />
        {children}
      </div>
    </div>
  )
}
