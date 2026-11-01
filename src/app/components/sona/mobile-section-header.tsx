import { useEffect, useRef, useState } from 'react'
import { Check, ChevronLeft, Ellipsis, Grid2X2, List, ListFilter, Plus, Star, ArrowDownToLine } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { usePlaylists } from '@/store/playlists.store'

type Menu = 'sort' | 'more' | null
type View = 'grid' | 'list'
type Sort = 'title' | 'date-added' | 'last-played' | 'updated' | 'playlist-type'
type Filter = 'all' | 'favorites' | 'downloads'
export type SectionSettings = { view: View; sort: Sort; filter: Filter }
export const defaultSettings: SectionSettings = { view:'list', sort:'title', filter:'all' }
export function getSectionSettings(path: string): SectionSettings {
 const initial = { ...defaultSettings, view: /^\\/library\\/genres\\/[^/]+$/.test(path) ? 'grid' as const : 'list' as const }
 try {
  const parsed = JSON.parse(localStorage.getItem('sona-section-settings:'+path) || 'null')
  return { ...initial, ...parsed }
 } catch { return initial }
}
export function sectionAction(type: string, value?: string) {
 window.dispatchEvent(new CustomEvent('sona:section-action',{ detail:{type,value} }))
}
export function useSectionSettings(path: string) {
 const [settings,setSettings] = useState<SectionSettings>(() => getSectionSettings(path))
 useEffect(() => {
  const handler = (event: Event) => {
   const { type, value } = (event as CustomEvent<{type:string;value?:string}>).detail
   if (type === 'setting' && value) setSettings(getSectionSettings(path))
  }
  window.addEventListener('sona:section-action',handler)
  return () => window.removeEventListener('sona:section-action',handler)
 },[path])
 return settings
}
export default function SonaSectionHeader() {
 const { pathname }=useLocation()
 const navigate=useNavigate()
 const isArtists=pathname==='/library/artists'
 const isPlaylists=pathname==='/library/playlists'
 const isPlaylistDetail=/^\/library\/playlists\/[^/]+$/.test(pathname)
 const isSongs=pathname==='/library/songs'
 const isGenreDetail=/^\/library\/genres\/[^/]+$/.test(pathname)
 const isGenreList=pathname==='/library/genres'
 const isDownloads=pathname==='/library/downloads'
 const isArtistsDetail=/^\/library\/artists\/[^/]+$/.test(pathname)
 const showSort=isPlaylists||isSongs||isGenreDetail
 const showMore=isPlaylists||isPlaylistDetail||isSongs||isGenreDetail
 const [open,setOpen]=useState<Menu>(null)
 const [closing,setClosing]=useState(false)
 const closeTimer=useRef<number|null>(null)
 const [artistFiltered,setArtistFiltered]=useState(false)
 const [settings,setSettings]=useState<SectionSettings>(()=>getSectionSettings(pathname))
 const ref=useRef<HTMLDivElement>(null)
 const {setPlaylistDialogState}=usePlaylists()
 useEffect(()=>{
  if(closeTimer.current!==null)window.clearTimeout(closeTimer.current)
  setClosing(false);setOpen(null);setSettings(getSectionSettings(pathname));setArtistFiltered(false)
 },[pathname])
 useEffect(()=>()=>{if(closeTimer.current!==null)window.clearTimeout(closeTimer.current)},[])
 function closeMenu(){
  if(!open)return
  if(closeTimer.current!==null)window.clearTimeout(closeTimer.current)
  setClosing(true)
  closeTimer.current=window.setTimeout(()=>{setOpen(null);setClosing(false);closeTimer.current=null},170)
 }
 function toggleMenu(menu: Exclude<Menu,null>){
  if(open===menu){closeMenu();return}
  if(closeTimer.current!==null)window.clearTimeout(closeTimer.current)
  setClosing(false);setOpen(menu)
 }
 useEffect(()=>{
  if(!open)return
  const outside=(event:PointerEvent)=>{if(!ref.current?.contains(event.target as Node))closeMenu()}
  const escape=(event:KeyboardEvent)=>{if(event.key==='Escape')closeMenu()}
  document.addEventListener('pointerdown',outside)
  document.addEventListener('keydown',escape)
  return()=>{document.removeEventListener('pointerdown',outside);document.removeEventListener('keydown',escape)}
 },[open])
 function change<K extends keyof SectionSettings>(key:K,value:SectionSettings[K]) {
  const next={...settings,[key]:value}
  setSettings(next)
  try { localStorage.setItem('sona-section-settings:'+pathname,JSON.stringify(next)) }catch{}
  sectionAction('setting',key)
  closeMenu()
 }
 const options= open==='sort' ? (
  <>
   <button className="sona-section-menu-line" onClick={()=>change('view','grid')}><span className="sona-menu-tick">{settings.view==='grid'&&<Check size={17}/>}</span><Grid2X2 size={19}/>Grid</button>
   <button className="sona-section-menu-line" onClick={()=>change('view','list')}><span className="sona-menu-tick">{settings.view==='list'&&<Check size={17}/>}</span><List size={19}/>List</button>
   <span className="sona-section-menu-divider"/>
   {([['title','Title'],['date-added','Date Added'],['last-played','Last Played Date'],['updated','Updated Date'],...(isPlaylists?[['playlist-type','Playlist Type'] as const]:[])] as const).map(([value,label])=>
    <button key={value} className="sona-section-menu-line" onClick={()=>change('sort',value)}>
      <span className="sona-menu-tick">{settings.sort===value&&<Check size={17}/>}</span>{label}
    </button>)}
  </>
 ) : (
  isPlaylistDetail ? <>
   <button className="sona-section-menu-line" onClick={()=>{sectionAction('playlist-play-next');closeMenu()}}>Play Next</button>
   <button className="sona-section-menu-line" onClick={()=>{sectionAction('playlist-download');closeMenu()}}><ArrowDownToLine size={18}/>Download</button>
  </> : <>
   {([['all','All '+(isPlaylists?'Playlists':isGenreDetail?'Albums':'Songs')],['favorites','Favorites'],['downloads','Downloads']] as const).map(([value,label])=>
    <button key={value} className="sona-section-menu-line" onClick={()=>change('filter',value)}>
     <span className="sona-menu-tick">{settings.filter===value&&<Check size={18}/>}</span>
     {value==='favorites'?<Star size={18}/>:value==='downloads'?<ArrowDownToLine size={18}/>:null}{label}
    </button>)}
  </>
 )
 const showControls=isArtists||isPlaylists||isPlaylistDetail||isSongs||isGenreDetail||isGenreList||isDownloads||isArtistsDetail
 if(!showControls)return null
 return <div className="sona-section-toolbar md:hidden" ref={ref}>
  <button type="button" className="sona-section-back" aria-label="Back to Library" onClick={()=>navigate(-1)}><ChevronLeft size={28} strokeWidth={2.7}/></button>
  <div className="sona-section-tools">
   {isPlaylists&&<button className="sona-section-tool" aria-label="New playlist" onClick={()=>setPlaylistDialogState(true)}><Plus size={26}/></button>}
   {isArtists&&<button className={'sona-section-tool'+(artistFiltered?' is-selected':'')} aria-label="Filter artists" aria-pressed={artistFiltered} onClick={()=>{setArtistFiltered(v=>!v);sectionAction('artist-filter')}}><ListFilter size={24}/></button>}
   {showSort&&<button className={'sona-section-tool'+(open==='sort'?' is-selected':'')} aria-label="Sort and view options" aria-expanded={open==='sort'} onClick={()=>toggleMenu('sort')}><ListFilter size={24}/></button>}
   {showMore&&<button className={'sona-section-tool'+(open==='more'?' is-selected':'')} aria-label="More options" aria-expanded={open==='more'} onClick={()=>toggleMenu('more')}><Ellipsis size={25}/></button>}
   {open&&<div className={'sona-section-menu'+(closing?' is-leaving':'')} role="menu">{options}</div>}
  </div>
 </div>
}
