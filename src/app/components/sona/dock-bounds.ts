/** The visible hit area of a clipped dock shell. Native bounding boxes include the texture backing. */
export function getDockBounds(element: HTMLElement) {
  const surface = element.querySelector<HTMLElement>(
    ':scope>.sona-dock-surface',
  )
  const rect = element.getBoundingClientRect()
  if (!surface)
    return Object.assign(rect, {
      layoutWidth: element.offsetWidth,
      layoutHeight: element.offsetHeight,
    })
  const win = element.ownerDocument.defaultView!
  const outerClip = win.getComputedStyle(element).clipPath
  const css = outerClip !== 'none' ? outerClip : win.getComputedStyle(surface).clipPath
  const tokens =
    css
      .slice(css.indexOf('(') + 1)
      .split('round')[0]
      .match(/calc\([^)]*\)|[-+\d.]+(?:px|%)/g) || []
  const resolve = (token: string, base: number) =>
    [...token.replace(/\s/g, '').matchAll(/([-+]?\d*\.?\d+)(%|px)/g)].reduce(
      (sum, m) => sum + Number(m[1]) * (m[2] === '%' ? base / 100 : 1),
      0,
    )
  const values = tokens.map((token, index) =>
    resolve(token, index % 2 ? element.offsetWidth : element.offsetHeight),
  )
  const top = values[0] || 0,
    right = values[1] ?? top,
    bottom = values[2] ?? top,
    left = values[3] ?? right
  const width = element.offsetWidth - left - right,
    height = element.offsetHeight - top - bottom
  const sx = rect.width / element.offsetWidth,
    sy = rect.height / element.offsetHeight
  return Object.assign(
    new DOMRect(
      rect.left + left * sx,
      rect.top + top * sy,
      width * sx,
      height * sy,
    ),
    { layoutWidth: width, layoutHeight: height },
  )
}
