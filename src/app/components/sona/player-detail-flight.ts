import { getDockBounds } from './dock-bounds'
/** Mini-player content is anchored to the shrinking sheet's top edge. */
export function revealMiniPlayerDetails(sheet: HTMLElement, mini: HTMLElement) {
  const content = sheet.querySelector<HTMLElement>('.sona-now-content')!
  const miniBox = getDockBounds(mini)
  const nodes: HTMLElement[] = [],
    animations: Animation[] = []
  const compact = document.documentElement.dataset.sonaDock === 'compact'
  const title = mini.querySelector<HTMLElement>('.sona-mini-title')
  const buttons = [
    ...mini.querySelectorAll<HTMLElement>(
      '[data-testid="player-button-play"],[data-testid="player-button-pause"],[data-testid="player-button-next"]',
    ),
  ].filter(
    (button) => !(compact && button.dataset.testid === 'player-button-next'),
  )
  const miniOrigin = mini.getBoundingClientRect()
  const play = buttons[0]?.querySelector('svg')?.getBoundingClientRect()
  const add = (
    target: HTMLElement | SVGElement,
    text: boolean,
    next = false,
    opacity = 1,
  ) => {
    const box = target.getBoundingClientRect(),
      css = getComputedStyle(target)
    if (!(box.width && box.height)) return
    const node = document.createElement('div')
    node.setAttribute('aria-hidden', 'true')
    node.className =
      'sona-player-detail-flight ' +
      (text ? 'is-title' : next ? 'is-next' : 'is-play')
    Object.assign(node.style, {
      position: 'absolute',
      left: box.left - miniOrigin.left + 'px',
      top: box.top - miniOrigin.top + 'px',
      width: box.width + 'px',
      height: box.height + 'px',
      font: css.font,
      letterSpacing: css.letterSpacing,
      lineHeight: css.lineHeight,
      color: css.color,
      whiteSpace: 'nowrap',
      overflow: 'hidden',
    })
    if (text) {
      node.textContent =
        target.querySelector('.sona-mini-ink')?.textContent ||
        target.textContent
      node.style.width =
        Math.max(12, (play?.left ?? miniBox.right - 50) - box.left - 6) + 'px'
      node.style.maskImage =
        'linear-gradient(to right,#000 calc(100% - 20px),transparent)'
    } else {
      const icon = target.cloneNode(true) as SVGElement
      icon.removeAttribute('class')
      Object.assign(icon.style, {
        width: '100%',
        height: '100%',
        display: 'block',
        fill: css.fill,
        stroke: css.stroke,
        strokeWidth: css.strokeWidth,
      })
      node.append(icon)
    }
    content.append(node)
    nodes.push(node)
    animations.push(
      node.animate([{ opacity: 0 }, { opacity }], {
        delay: 120,
        duration: 50,
        easing: 'cubic-bezier(.22,.8,.22,1)',
        fill: 'both',
      }),
    )
  }
  if (title) add(title, true)
  for (const button of buttons) {
    const icon = button.querySelector<SVGElement>('svg')
    if (icon)
      add(
        icon,
        false,
        button.dataset.testid === 'player-button-next',
        Number(getComputedStyle(button).opacity),
      )
  }
  return {
    nodes,
    cleanup: () => {
      nodes.forEach((n) => n.remove())
      animations.forEach((a) => a.cancel())
    },
  }
}
