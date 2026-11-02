export function PlayingBars({ size = 20 }: { size?: number }) {
  return <span className="sona-playing-bars" style={{ width: size, height: size }} aria-label="Playing" role="img">
    <i /><i /><i /><i />
  </span>
}
