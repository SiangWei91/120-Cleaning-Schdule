import { useEffect, type ReactNode } from 'react'

type Props = {
  open: boolean
  title: string
  hint?: string
  onClose: () => void
  children: ReactNode
}

export function BottomSheet({ open, title, hint, onClose, children }: Props) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="scrim" onClick={onClose} role="presentation">
      <div
        className="sheet"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
      >
        <h2>{title}</h2>
        {hint && <p className="hint">{hint}</p>}
        {children}
      </div>
    </div>
  )
}
