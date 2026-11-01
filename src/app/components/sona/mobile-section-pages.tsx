import { SonaNoteGlyph } from '@/app/components/header/sona-note-glyph'
import { createPortal } from 'react-dom'
import { SongExplicitMark } from './song-explicit-mark'
import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowDownToLine, Check, ChevronRight, Disc3, Ellipsis, ListMusic, Mic2, Play, Search, Shuffle, Star, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'react-toastify'
import { ArtworkImage } from '@/app/components/artwork-image'
import { ImageLoader } from '@/app/components/image-loader'
import { useOptions } from '@/app/hooks/use-options'
import { useAlbumsListModel } from '@/app/pages/albums/list.model'
import { ROUTES } from '@/routes/routesList'
import { songsSearch } from '@/queries/songs'
import { subsonic } from '@/service/subsonic'
import { usePlayerActions } from '@/store/player.store'
import type { Albums } from '@/types/responses/album'
import type { ISimilarArtist } from '@/types/responses/artist'
import type { Playlist } from '@/types/responses/playlist'
import type { ISong } from '@/types/responses/song'
import { queryKeys } from '@/utils/queryKeys'
import { openSonaAlbumFromCover } from './album-morph'
import { useSectionSettings } from './mobile-section-header'

function useSectionAction(action: (type: string, value?: string) => void) {
 const callback = useRef(action)
 callback.current = action
 useEffect(() => {
  const listener = (event: Event) => {
   const info = (event as CustomEvent<{type:string;value?:string}>).detail
   if (info) callback.current(info.type,info.value)
  }
  window.addEventListener('sona:section-action',listener)
  return () => window.removeEventListener('sona:section-action',listener)
 },[])
}
function Empty({message}:{message:string}){
 return <p className="sona-section-empty">{message}</p>
}
function SectionTitle({children}:{children:string}){
 return <h1 className="sona-section-heading">{children}</h1>
}
function SectionArt({id,name,kind='album',circle=false}:{id?:string;name:string;kind?:'artist'|'album';circle?:boolean}){
 return <span className={'sona-section-art'+(circle?' is-circle':'')}>
  <ImageLoader id={id} type={kind} size={300}>
   {src=><ArtworkImage src={src} alt={name} loading="lazy"/>}
  </ImageLoader>
 </span>
}
function alphabetGroup(text:string){
 const letter=text.trim().charAt(0).toUpperCase()
 return /^[A-Z]$/.test(letter)?letter:'#'
}
const ALPHABET='ABCDEFGHIJKLMNOPQRSTUVWXYZ#'.split('')
export function AlphabetRail({letters,prefix}:{letters:string[];prefix:string}){
 const [focused,setFocused]=useState('')
 const held=useRef(false)
 const choose=(index:number,drag=false)=>{
   const letter=ALPHABET[Math.max(0,Math.min(ALPHABET.length-1,index))]
   const target=letters.includes(letter)?letter:
     ALPHABET.slice(index+1).find(item=>letters.includes(item)) ??
     [...ALPHABET.slice(0,index)].reverse().find(item=>letters.includes(item))
   if(!target)return
   setFocused(target)
   const element=document.getElementById(prefix+target)
   const viewport=document.getElementById('scroll-viewport')
   if(!element||!viewport)return
   const headerBottom=document.querySelector('.sona-header')?.getBoundingClientRect().bottom || 64
   const top=viewport.scrollTop+element.getBoundingClientRect().top-Math.max(viewport.getBoundingClientRect().top,headerBottom)-24
   viewport.scrollTo({top:Math.max(0,top),behavior:drag?'instant':'smooth'})
 }
 const selectAt=(y:number,rail:HTMLElement)=>{
   const bounds=rail.getBoundingClientRect()
   choose(Math.floor((y-bounds.top)/bounds.height*ALPHABET.length),true)
 }
 return createPortal(<aside className="sona-section-alphabet" aria-label="Jump to letter"
   onPointerDown={event=>{held.current=true;event.currentTarget.setPointerCapture(event.pointerId);selectAt(event.clientY,event.currentTarget);event.preventDefault()}}
   onPointerMove={event=>{if(held.current){selectAt(event.clientY,event.currentTarget);event.preventDefault()}}}
   onPointerUp={()=>{held.current=false}} onPointerCancel={()=>{held.current=false}}>
  {ALPHABET.map((letter,index)=>
   <button key={letter} type="button" aria-label={'Jump to '+(letter==='#'?'other':letter)}
     aria-pressed={focused===letter} data-has-matches={letters.includes(letter)}
     onClick={event=>{if(event.detail===0)choose(index)}}>{letter}</button>)}
 </aside>,document.body)
}
export function SectionActionButtons({onPlay,onShuffle}:{onPlay:()=>void;onShuffle:()=>void}){
 return <div className="sona-section-play-actions">
  <button type="button" onClick={onPlay}><Play fill="currentColor" size={17}/>Play</button>
  <button type="button" onClick={onShuffle}><Shuffle size={18}/>Shuffle</button>
 </div>
}
export function SonaArtistsList(){
 const navigate=useNavigate()
 const {data:artists=[],isLoading}=useQuery({queryKey:[queryKeys.artist.all],queryFn:subsonic.artists.getAll})
 const [filter,setFilter]=useState(false)
 const [term,setTerm]=useState('')
 useSectionAction(type=>{if(type==='artist-filter')setFilter(v=>!v)})
 const filtered=useMemo(()=>[...artists].filter(a=>!filter||Boolean(a.starred))
   .filter(a=>a.name.toLowerCase().includes(term.toLowerCase()))
   .sort((a,b)=>a.name.localeCompare(b.name,undefined,{sensitivity:'base'})),[artists,filter,term])
 const groups=useMemo(()=>{
  const result=new Map<string,ISimilarArtist[]>()
  for(const a of filtered){const key=alphabetGroup(a.name);result.set(key,[...(result.get(key)||[]),a])}
  return [...result.entries()]
 },[filtered])
 return <section className="sona-section-page sona-artists-list">
  <SectionTitle>Artists</SectionTitle>
  {filter&&<div className="sona-section-filter-search"><Search size={18}/>
   <input type="search" value={term} onChange={e=>setTerm(e.target.value)} placeholder="Search" aria-label="Search favorite artists" autoFocus={false}/>
   {term&&<button aria-label="Clear" onClick={()=>setTerm('')}><X size={17}/></button>}</div>}
  {isLoading?<Empty message="Loading artists…"/>:groups.length===0?
    <Empty message={filter?'No favorite artists':'No artists found'}/>:
    <div className="sona-section-indexed">
     <div>{groups.map(([letter,items])=><div key={letter} id={'sona-artist-letter-'+letter} className="sona-section-group">
      {!filter&&<h2>{letter}</h2>}
      {items.map(a=><button className="sona-section-artist-row" key={a.id} onClick={()=>navigate(ROUTES.ARTIST.PAGE(a.id))}>
       {a.starred&&<Star className="sona-section-favorite-mark" size={13} fill="currentColor"/>}
       <SectionArt id={a.coverArt} name={a.name} kind="artist" circle/>
       <span className="sona-section-row-main">{a.name}</span><ChevronRight size={23} className="sona-section-chevron"/>
      </button>)}
     </div>)}</div>
     {!filter&&<AlphabetRail letters={groups.map(([letter])=>letter)} prefix="sona-artist-letter-"/>}
    </div>}
 </section>
}

export function SonaGenresList(){
 const {data:genres=[],isLoading}=useQuery({queryKey:[queryKeys.genre.all],queryFn:subsonic.genres.get})
 const filtered=useMemo(()=>[...genres].sort((a,b)=>a.value.localeCompare(b.value)),[genres])
 return <section className="sona-section-page sona-genres-list"><SectionTitle>Genres</SectionTitle>
  {isLoading?<Empty message="Loading genres…"/>:
    <div className="sona-section-simple-list">{filtered.map(g=><Link key={g.value} to={ROUTES.GENRE.PAGE(g.value)}>
      <span>{g.value}</span><ChevronRight size={23} className="sona-section-chevron"/>
    </Link>)}</div>}
 </section>
}
function AlbumTile({album}:{album:Albums}){
 const navigate=useNavigate()
 return <Link className="sona-section-album-tile" data-sona-album-id={album.id}
   to={ROUTES.ALBUM.PAGE(album.id)} onClick={event=>{
     if(event.defaultPrevented||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return
     event.preventDefault()
     openSonaAlbumFromCover(event,navigate,album.id)
   }}>
   <SectionArt id={album.coverArt} name={album.name}/>
   <strong>{album.name}</strong><span>{album.artist}</span>
  </Link>
}

export function SonaAlbumsList(){
 const {pathname,search}=useLocation()
 const sectionTitle=new URLSearchParams(search).get('section')
 const settingsPath=pathname+(sectionTitle?search:'')
 const settings=useSectionSettings(settingsPath)
 const {isLoading,albums}=useAlbumsListModel()
 const filtered=useMemo(()=>{
   let next=[...albums]
   if(settings.filter==='favorites')next=next.filter(album=>Boolean(album.starred))
   if(settings.filter==='downloads')next=[]
   if(settings.sort==='title')next.sort((a,b)=>a.name.localeCompare(b.name))
   if(settings.sort==='date-added'||settings.sort==='updated')next.sort((a,b)=>(b.created||'').localeCompare(a.created||''))
   if(settings.sort==='last-played')next.sort((a,b)=>(b.played||'').localeCompare(a.played||''))
   return next
 },[albums,settings])
 return <section className="sona-section-page sona-albums-list" aria-label={sectionTitle||"Albums"}>
   <SectionTitle>{sectionTitle||"Albums"}</SectionTitle>
   {isLoading?<Empty message="Loading albums…"/>:
    filtered.length===0?<Empty message="Nothing here."/>:
    settings.view==='list'?
      <div className="sona-section-album-list">{filtered.map(a=><AlbumTile key={a.id} album={a}/>)}</div>:
      <div className="sona-section-album-grid">{filtered.map(a=><AlbumTile key={a.id} album={a}/>)}</div>}
 </section>
}

export function SonaGenreDetail(){
 const {genreName=''}=useParams<{genreName:string}>()
 const genre=genreName
 const {pathname}=useLocation()
 const {data,isLoading}=useQuery({
  queryKey:[queryKeys.genre.albums,genre],
  queryFn:()=>subsonic.albums.getAlbumList({type:'byGenre',genre,size:500}),
  enabled:Boolean(genre)
 })
 const settings=useSectionSettings(pathname)
 const {setSongList}=usePlayerActions()
 const albums=useMemo(()=>{
  let list=[...(data?.list||[])]
  if(settings.filter==='favorites')list=list.filter(a=>Boolean(a.starred))
  if(settings.filter==='downloads')list=[]
  if(settings.sort==='title')list.sort((a,b)=>a.name.localeCompare(b.name))
  if(settings.sort==='date-added'||settings.sort==='updated')list.sort((a,b)=>(b.created||'').localeCompare(a.created||''))
  if(settings.sort==='last-played')list.sort((a,b)=>(b.played||'').localeCompare(a.played||''))
  return list
 },[data,settings])
 async function play(shuffle:boolean){
  try {
   const tracks=await subsonic.genres.getSongsByGenre({genre})
   if(tracks?.length)setSongList(tracks,0,shuffle,{id:genre,name:genre,type:'songs'})
   else toast.info('No songs in this genre')
  }catch{toast.error('Unable to play genre')}
 }
 return <section className="sona-section-page sona-genre-detail">
  <SectionTitle>{genre}</SectionTitle>
  <SectionActionButtons onPlay={()=>void play(false)} onShuffle={()=>void play(true)}/>
  {isLoading?<Empty message="Loading albums…"/>:settings.filter==='downloads'?
    <Empty message="No downloaded albums tracked here"/>:
    albums.length===0?<Empty message="No albums"/>:
    settings.view==='grid'?<div className="sona-section-album-grid">{albums.map(a=><AlbumTile key={a.id} album={a}/>)}</div>:
    <div className="sona-section-album-list">{albums.map(a=><AlbumTile key={a.id} album={a}/>)}</div>}
 </section>
}

function playlistFavorites(){
 try {return new Set<string>(JSON.parse(localStorage.getItem('sona-playlist-favorites')||'[]'))}
 catch{return new Set<string>()}
}
function trackedDownloads(){
 try {return new Set<string>(JSON.parse(localStorage.getItem('sona-playlist-download-requests')||'[]'))}
 catch{return new Set<string>()}
}
function saveSet(key:string,values:Set<string>){
 try {localStorage.setItem(key,JSON.stringify([...values]))}catch{}
}
function playlistSort(list:Playlist[],sort:string){
 const next=[...list]
 if(sort==='title')return next.sort((a,b)=>a.name.localeCompare(b.name))
 if(sort==='date-added')return next.sort((a,b)=>(b.created||'').localeCompare(a.created||''))
 if(sort==='updated'||sort==='last-played')return next.sort((a,b)=>(b.changed||'').localeCompare(a.changed||''))
 if(sort==='playlist-type')return next.sort((a,b)=>Number(b.public)-Number(a.public)||a.name.localeCompare(b.name))
 return next
}
export function SonaPlaylistsList(){
 const {pathname}=useLocation()
 const navigate=useNavigate()
 const settings=useSectionSettings(pathname)
 const {data:playlists=[],isLoading}=useQuery({queryKey:[queryKeys.playlist.all],queryFn:subsonic.playlists.getAll})
 const [favoriteIds,setFavoriteIds]=useState(playlistFavorites)
 useEffect(()=>{
  if(!playlists.length) return
  try {
   if(localStorage.getItem('sona-playlist-favorites') !== null)return
   const initial=new Set(playlists.filter(p=>/favorite/i.test(p.name)).map(p=>p.id))
   saveSet('sona-playlist-favorites',initial);setFavoriteIds(initial)
  } catch {}
 },[playlists])
 const downloaded=trackedDownloads()
 const toggleFavorite=(id:string)=>{
  const next=new Set(favoriteIds)
  if(next.has(id))next.delete(id);else next.add(id)
  setFavoriteIds(next);saveSet('sona-playlist-favorites',next)
 }
 const shown=useMemo(()=>playlistSort(playlists.filter(p=>
  settings.filter==='all'||(settings.filter==='favorites'&&favoriteIds.has(p.id))||
  (settings.filter==='downloads'&&downloaded.has(p.id))
 ),settings.sort),[playlists,settings,favoriteIds])
 return <section className="sona-section-page sona-playlists-list">
  <SectionTitle>Playlists</SectionTitle>
  {isLoading?<Empty message="Loading playlists…"/>:shown.length===0?<Empty message="No playlists in this category"/>:
  settings.view==='grid'?<div className="sona-section-playlist-grid">{shown.map(p=>
   <Link className="sona-section-playlist-tile" to={ROUTES.PLAYLIST.PAGE(p.id)} key={p.id}><SectionArt id={p.coverArt} name={p.name}/><span>{p.name}</span></Link>)}</div>:
   <div className="sona-section-playlist-list">{shown.map(p=>
    <div className="sona-section-playlist-row" key={p.id}>
     <button type="button" className={'sona-section-star-toggle'+(favoriteIds.has(p.id)?' is-starred':'')}
      aria-label={(favoriteIds.has(p.id)?'Unfavorite ':'Favorite ')+p.name} onClick={()=>toggleFavorite(p.id)}>
      <Star size={14} fill={favoriteIds.has(p.id)?'currentColor':'none'}/>
     </button>
     <button type="button" className="sona-section-playlist-target" onClick={()=>navigate(ROUTES.PLAYLIST.PAGE(p.id))}>
      <SectionArt id={p.coverArt} name={p.name}/>
      <span>{p.name}</span><ChevronRight size={23} className="sona-section-chevron"/>
     </button>
    </div>)}</div>}
 </section>
}
export function SonaPlaylistDetail(){
 const {playlistId=''}=useParams<{playlistId:string}>()
 const {data:playlist,isLoading}=useQuery({
  queryKey:[queryKeys.playlist.single,playlistId],
  queryFn:()=>subsonic.playlists.getOne(playlistId),
  enabled:Boolean(playlistId)
 })
 const {setSongList,setNextOnQueue}=usePlayerActions()
 const options=useOptions()
 const [downloaded,setDownloaded]=useState(false)
 const songs=playlist?.entry||[]
 useSectionAction((type)=>{
  if(!playlist)return
  if(type==='playlist-play-next')setNextOnQueue(songs)
  if(type==='playlist-download')doDownload()
 })
 function doDownload(){
  if(!playlist)return
  options.startDownload(playlist.id)
  const current=trackedDownloads()
  current.add(playlist.id)
  saveSet('sona-playlist-download-requests',current)
  setDownloaded(true)
 }
 function play(shuffle:boolean){
  if(!playlist||songs.length===0)return
  setSongList(songs,0,shuffle,{id:playlist.id,name:playlist.name,type:'playlist'})
 }
 if(isLoading)return <section className="sona-section-page"><Empty message="Loading playlist…"/></section>
 if(!playlist)return <section className="sona-section-page"><Empty message="Playlist unavailable"/></section>
 return <section className="sona-section-page sona-section-playlist-detail">
  <div className="sona-section-playlist-hero">
   <div className="sona-section-playlist-hero-art"><SectionArt id={playlist.coverArt} name={playlist.name}/></div>
   <h1>{playlist.name}</h1><p>{playlist.owner}</p>
   <div className="sona-section-playlist-actions">
    <button type="button" aria-label="Shuffle playlist" onClick={()=>play(true)}><Shuffle size={22}/></button>
    <button type="button" className="sona-section-playlist-play" onClick={()=>play(false)}><Play fill="currentColor" size={19}/>Play</button>
    <button type="button" aria-label="Download playlist" onClick={doDownload}>
     {downloaded?<Check size={22}/>:<ArrowDownToLine size={22}/>}
    </button>
   </div>
  </div>
  <SonaSongRows songs={songs} onPlay={index=>playSongAt(index)} compact/>
 </section>
 function playSongAt(index:number){
  if(!playlist)return
  setSongList(songs,index,false,{id:playlist.id,name:playlist.name,type:'playlist'})
 }
}
export function SonaSongRows({songs,onPlay,alphabet=false}:{songs:ISong[];onPlay:(index:number)=>void;compact?:boolean;alphabet?:boolean}){
 const [moreId,setMoreId]=useState<string|null>(null)
 const {setNextOnQueue,setLastOnQueue}=usePlayerActions()
 const options=useOptions()
 const queryClient=useQueryClient()
 const ref=useRef<HTMLDivElement>(null)
 const indices=useMemo(()=>{
  const result=new Map<string,number[]>()
  songs.forEach((song,index)=>{const key=alphabet?alphabetGroup(song.artist||song.title):'';result.set(key,[...(result.get(key)||[]),index])})
  return [...result.entries()]
 },[songs,alphabet])
 useEffect(()=>{
  if(!moreId)return
  const outside=(e:PointerEvent)=>{if(ref.current&&!ref.current.contains(e.target as Node))setMoreId(null)}
  document.addEventListener('pointerdown',outside)
  return()=>document.removeEventListener('pointerdown',outside)
 },[moreId])
 async function starSong(song:ISong){
  try {await subsonic.star.handleStarItem({id:song.id,starred:Boolean(song.starred)})
   await queryClient.invalidateQueries({queryKey:[queryKeys.song.all]})
   toast.success(song.starred?'Removed favorite':'Added favorite')
  }catch{toast.error('Could not update favorite')}
  setMoreId(null)
 }
 return <div className="sona-section-song-indexed" ref={ref}>
  <div>{indices.map(([letter,list])=><div key={letter} className="sona-section-song-group" id={'sona-song-letter-'+(letter||'_')}>
   {alphabet&&<h2>{letter}</h2>}
   {list.map(index=>{const song=songs[index];return <div className="sona-section-song-row" key={song.id+':'+index}>
    <button type="button" className="sona-section-song-target" onClick={()=>onPlay(index)}>
      <SectionArt id={song.coverArt} name={song.title}/>
      <span className="sona-section-song-label"><strong>{song.title}<SongExplicitMark song={song}/></strong><small>{song.artist||'Unknown Artist'}</small></span>
    </button>
    <button type="button" className="sona-section-song-more" aria-label={'Options for '+song.title} onClick={()=>setMoreId(current=>current===song.id?null:song.id)}><Ellipsis size={24}/></button>
    {moreId===song.id&&<div className="sona-section-song-menu">
      <button onClick={()=>{setNextOnQueue([song]);setMoreId(null)}}>Play Next</button>
      <button onClick={()=>{setLastOnQueue([song]);setMoreId(null)}}>Add to Queue</button>
      <button onClick={()=>void starSong(song)}>{song.starred?'Unfavorite':'Favorite'}</button>
      <button onClick={()=>{options.startDownload(song.id);setMoreId(null)}}>Download</button>
      <button onClick={()=>{options.openSongInfo(song.id);setMoreId(null)}}>Song Info</button>
    </div>}
   </div>})}
  </div>)}</div>
  {alphabet&&<AlphabetRail letters={indices.map(([letter])=>letter)} prefix="sona-song-letter-"/>}
 </div>
}
export function SonaSongsList(){
 const {pathname}=useLocation()
 const settings=useSectionSettings(pathname)
 const {setSongList}=usePlayerActions()
 const sentinel=useRef<HTMLDivElement>(null)
 const {data,isLoading,fetchNextPage,hasNextPage,isFetchingNextPage}=useInfiniteQuery({
  queryKey:[queryKeys.song.all,'sona-section'],
  queryFn:({pageParam})=>songsSearch({query:'',songCount:100,songOffset:pageParam}),
  initialPageParam:0,
  getNextPageParam:last=>last.nextOffset
 })
 useEffect(()=>{
  const node=sentinel.current
  if(!node||!hasNextPage)return
  const observer=new IntersectionObserver(entries=>{if(entries[0]?.isIntersecting&&!isFetchingNextPage)void fetchNextPage()},{rootMargin:'400px'})
  observer.observe(node)
  return()=>observer.disconnect()
 },[fetchNextPage,hasNextPage,isFetchingNextPage])
 const songs=useMemo(()=>{
  let list=[...(data?.pages.flatMap(page=>page.songs)||[])]
  if(settings.filter==='favorites')list=list.filter(song=>Boolean(song.starred))
  if(settings.filter==='downloads')list=[]
  if(settings.sort==='title')list.sort((a,b)=>(a.artist||'').localeCompare(b.artist||'')||a.title.localeCompare(b.title))
  if(settings.sort==='date-added'||settings.sort==='updated')list.sort((a,b)=>(b.created||'').localeCompare(a.created||''))
  if(settings.sort==='last-played')list.sort((a,b)=>(b.played||'').localeCompare(a.played||''))
  return list
 },[data,settings])
 function play(index:number,shuffle=false){
  setSongList(songs,index,shuffle,{type:'songs',id:'songs',name:'Songs'})
 }
 return <section className="sona-section-page sona-songs-list">
  <SectionTitle>Songs</SectionTitle>
  <SectionActionButtons onPlay={()=>play(0)} onShuffle={()=>play(0,true)}/>
  {isLoading?<Empty message="Loading songs…"/>:songs.length===0?
   <Empty message="No songs in this category"/>:
   settings.view==='grid'?<div className="sona-section-song-grid">{songs.map((song,index)=>
    <button type="button" key={song.id+':'+index} onClick={()=>play(index)}>
     <SectionArt id={song.coverArt} name={song.title}/><strong>{song.title}<SongExplicitMark song={song}/></strong><span>{song.artist}</span>
    </button>)}</div>:
   <SonaSongRows songs={songs} onPlay={play} alphabet/>}
  <div ref={sentinel} className="sona-section-load-more">{isFetchingNextPage?'Loading more…':''}</div>
 </section>
}
export function SonaDownloadsList(){
 const links=[
  {name:'Playlists',icon:ListMusic,to:'/library/playlists'},
  {name:'Artists',icon:Mic2,to:'/library/artists'},
  {name:'Albums',icon:Disc3,to:'/library/albums'},
  {name:'Songs',icon:SonaNoteGlyph,to:'/library/songs'},
 ]
 return <section className="sona-section-page sona-downloads-list" aria-label="Downloads">
  <div className="sona-section-download-links">{links.map(({name,icon:Icon,to})=>
   <Link to={to} key={name}><Icon size={24} color="#fa4268" strokeWidth={1.8}/><span>{name}</span><ChevronRight size={23} className="sona-section-chevron"/></Link>)}
  </div>
 </section>
}
