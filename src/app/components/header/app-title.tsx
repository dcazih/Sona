import { SonaMark } from '@/app/components/header/sona-mark'

export function AppTitle() {
  return (
    <div className="sona-app-brand flex gap-2 items-center">
      <span className="sona-brand-mark"><SonaMark size={32} /></span>
      <span className="sona-brand-label">Sona</span>
    </div>
  )
}
