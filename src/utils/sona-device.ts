export type SonaDeviceClass = 'phone'|'tablet'|'desktop'
export type SonaDeviceInfo = {
  kind:SonaDeviceClass
  touch:boolean
  coarsePointer:boolean
  confidence:'strong'|'estimated'
}
/** Browser identity is not perfect. Combine user-agent clues with touch,
 * pointer accuracy and screen size; prefer CSS layouts for responsive UI. */
export function getSonaDeviceInfo():SonaDeviceInfo {
 const ua=navigator.userAgent||''
 const platform=navigator.platform||''
 const touch=(navigator.maxTouchPoints||0)>0
 const coarsePointer=matchMedia('(pointer:coarse)').matches
 const shortSide=Math.min(screen.width,screen.height)
 const desktopLikeIpad=platform==='MacIntel' && navigator.maxTouchPoints>1
 const tabletUA=/iPad|Tablet|Kindle|Silk/i.test(ua) ||
   (/Android/i.test(ua)&&!/Mobile/i.test(ua))
 const phoneUA=/iPhone|iPod|Windows Phone|Android.*Mobile/i.test(ua)
 if(desktopLikeIpad||tabletUA)
  return {kind:'tablet',touch,coarsePointer,confidence:'strong'}
 if(phoneUA)
  return {kind:'phone',touch,coarsePointer,confidence:'strong'}
 if(coarsePointer&&touch){
  return {kind:shortSide<650?'phone':'tablet',touch,coarsePointer,confidence:'estimated'}
 }
 return {kind:'desktop',touch,coarsePointer,confidence:'estimated'}
}
export function installSonaDeviceHint(){
 const update=()=>{
  const info=getSonaDeviceInfo()
  document.documentElement.dataset.sonaDevice=info.kind
  document.documentElement.dataset.sonaPointer=info.coarsePointer?'coarse':'fine'
 }
 update()
 window.addEventListener('resize',update,{passive:true})
 window.addEventListener('orientationchange',update,{passive:true})
}
