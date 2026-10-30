import { Music2 } from 'lucide-react'

export function AppTitle() {
  return (
    <div className="flex gap-2 items-center">
      <span className="sona-brand-mark"><Music2 size={19} strokeWidth={2.5} /></span>
      <span className="sona-brand-label">Sona</span>
    </div>
  )
}
