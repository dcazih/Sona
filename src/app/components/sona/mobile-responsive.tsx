import { useEffect, useState, type ReactNode } from 'react'
export default function SonaResponsive({mobile,desktop}:{mobile:ReactNode;desktop:ReactNode}) {
 const [mobileMode,setMobileMode]=useState(()=>matchMedia('(max-width:767px)').matches)
 useEffect(()=>{
  const media=matchMedia('(max-width:767px)')
  const handler=()=>setMobileMode(media.matches)
  media.addEventListener('change',handler)
  return ()=>media.removeEventListener('change',handler)
 },[])
 return <>{mobileMode?mobile:desktop}</>
}
