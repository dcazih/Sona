import { getDockBounds } from './dock-bounds'

/** Shared title/play elements stay opaque until the sheet has landed over the mini player. */
export function flyPlayerDetails(
  sheet: HTMLElement,
  mini: HTMLElement,
  duration: number,
  easing: string,
  origins?: { title?: DOMRect; play?: DOMRect },
) {
  const nodes: HTMLElement[] = [],
    animations: Animation[] = [],
    restore: (() => void)[] = []
  const title = sheet.querySelector<HTMLElement>('.sona-now-song-info h2')
  const miniTitle = mini.querySelector<HTMLElement>('.sona-mini-title')
  const play = sheet.querySelector<SVGSVGElement>(
    '.sona-transport-toggle .is-visible svg',
  )
  const miniPlay = mini.querySelector<SVGSVGElement>(
    '[data-testid="player-button-play"] svg,[data-testid="player-button-pause"] svg',
  )
  const miniBox = getDockBounds(mini)
  const make = (source: Element, target: Element, text: boolean) => {
    const a = (text ? origins?.title : origins?.play) || source.getBoundingClientRect(),
      b = target.getBoundingClientRect()
    if (!(a.width && a.height && b.width && b.height)) return
    const css = getComputedStyle(source),
      end = getComputedStyle(target)
    const ghost = document.createElement('div')
    ghost.setAttribute('aria-hidden', 'true')
    ghost.className =
      'sona-player-detail-flight' + (text ? ' is-title' : ' is-play')
    const scale = text
      ? parseFloat(end.fontSize) / parseFloat(css.fontSize)
      : b.width / a.width
    const targetWidth = text
      ? Math.max(
          12,
          Math.min(
            b.width,
            (miniPlay?.getBoundingClientRect().left ?? miniBox.right - 50) -
              b.left -
              8,
          ),
        )
      : b.width
    Object.assign(ghost.style, {
      width: a.width + 'px',
      height: a.height + 'px',
      font: css.font,
      letterSpacing: css.letterSpacing,
      color: css.color,
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      lineHeight: css.lineHeight,
    })
    if (text) ghost.textContent = source.textContent
    else {
      const icon = source.cloneNode(true) as SVGSVGElement
      icon.removeAttribute('class')
      Object.assign(icon.style, {
        width: '100%',
        height: '100%',
        display: 'block',
        color: css.color,
      })
      ghost.append(icon)
    }
    document.body.append(ghost)
    nodes.push(ghost)
    const html = source as HTMLElement,
      old = html.style.visibility
    html.style.visibility = 'hidden'
    restore.push(() => {
      html.style.visibility = old
    })
    animations.push(
      ghost.animate(
        [
          {
            transform: `translate3d(${a.left}px,${a.top}px,0) scale(1)`,
            clipPath: 'inset(0px)',
            fontWeight: css.fontWeight,
          },
          {
            transform: `translate3d(${b.left}px,${b.top + b.height / 2 - (a.height * scale) / 2}px,0) scale(${scale})`,
            clipPath: `inset(0px ${Math.max(0, a.width - targetWidth / scale)}px 0px 0px)`,
            fontWeight: end.fontWeight,
          },
        ],
        { duration, easing, fill: 'both' },
      ),
    )
  }
  if (title && miniTitle) make(title, miniTitle, true)
  if (play && miniPlay) make(play, miniPlay, false)
  return {
    nodes,
    cleanup: () => {
      nodes.forEach((n) => n.remove())
      animations.forEach((a) => a.cancel())
      restore.forEach((fn) => fn())
    },
  }
}
