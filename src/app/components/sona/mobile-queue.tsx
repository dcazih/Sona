import { SongExplicitMark } from './song-explicit-mark'
import { Menu, Shuffle, Repeat, Repeat1, Infinity as InfinityIcon } from 'lucide-react'
import { type PointerEvent, type ReactNode, useLayoutEffect, useRef, useEffect } from 'react'
import { ImageLoader } from '@/app/components/image-loader'
import { ArtworkImage } from '@/app/components/artwork-image'
import { usePlayerActions, usePlayerSonglist, usePlayerStore } from '@/store/player.store'
import { useAppStore } from '@/store/app.store'
import { usePlaybackHistory } from './playback-history'
import type { ISong } from '@/types/responses/song'
import './queue-detail.css'

type Drag = {from:number;to:number;id:number;x:number;y:number;startY:number;scroll:number;ghost:HTMLElement;rows:HTMLElement[];rects:DOMRect[];frame:number}
export function SonaMobileQueue({ header, open = true }: {header?:ReactNode;open?:boolean}) {
 const {currentList,currentSongIndex}=usePlayerSonglist()
 const {setSongList,reorderQueue,toggleShuffle,toggleLoop}=usePlayerActions()
 const shuffle=usePlayerStore(s=>s.playerState.isShuffleActive),loop=usePlayerStore(s=>s.playerState.loopState)
 const profile=useAppStore(s=>s.data.url+'|'+s.data.username)
 const history=usePlaybackHistory(s=>s.profiles[profile]),clear=usePlaybackHistory(s=>s.clear)
 const autoplay=usePlaybackHistory(s=>s.autoplay),toggleAutoplay=usePlaybackHistory(s=>s.toggleAutoplay)
 const viewport=useRef<HTMLDivElement>(null),middle=useRef<HTMLDivElement>(null)
 const drag=useRef<Drag|null>(null),snap=useRef('middle'),scrollTimer=useRef(0)
 useLayoutEffect(()=>{
  if(!open)return
  const reset=()=>{if(viewport.current&&middle.current){viewport.current.scrollTop=middle.current.offsetTop;snap.current='middle'}}
  reset();const frame=requestAnimationFrame(reset);return()=>cancelAnimationFrame(frame)
 },[open])
 const cleanup=()=>{
  const held=drag.current;if(!held)return
  cancelAnimationFrame(held.frame);held.ghost.remove()
  held.rows.forEach(row=>{row.style.transform='';row.style.opacity='';row.classList.remove('is-queue-shifting')})
  viewport.current?.classList.remove('is-reordering');drag.current=null
 }
 useEffect(()=>()=>{cleanup();clearTimeout(scrollTimer.current)},[])
 function start(event:PointerEvent<HTMLButtonElement>,from:number){
  if(event.button!==0)return
  event.preventDefault();cleanup()
  const rows=[...viewport.current!.querySelectorAll<HTMLElement>('[data-sona-queue-index]')]
  const row=rows.find(node=>Number(node.dataset.sonaQueueIndex)===from)!
  const rect=row.getBoundingClientRect(),ghost=row.cloneNode(true) as HTMLElement
  ghost.className='sona-queue-row sona-queue-drag-flight'
  ghost.setAttribute('aria-hidden','true');ghost.inert=true;ghost.removeAttribute('data-sona-queue-index')
  Object.assign(ghost.style,{position:'fixed',left:rect.left+'px',top:rect.top+'px',width:rect.width+'px',height:rect.height+'px',margin:'0',pointerEvents:'none',zIndex:'1000'})
  document.body.appendChild(ghost);row.style.opacity='0'
  rows.forEach(node=>node.classList.add('is-queue-shifting'))
  const rects=rows.map(node=>node.getBoundingClientRect())
  drag.current={from,to:from,id:event.pointerId,x:event.clientX,y:event.clientY,startY:event.clientY,scroll:viewport.current!.scrollTop,ghost,rows,rects,frame:0}
  viewport.current!.classList.add('is-reordering');event.currentTarget.setPointerCapture(event.pointerId)
  const tick=()=>{
   const held=drag.current,scroller=viewport.current;if(!held||!scroller)return
   const bounds=scroller.getBoundingClientRect()
   if(held.y>bounds.bottom-35)scroller.scrollTop+=6
   else if(held.y<bounds.top+35)scroller.scrollTop-=6
   held.ghost.style.transform=`translate3d(0,${held.y-held.startY}px,0)`
   const scrollDelta=scroller.scrollTop-held.scroll
   let target=held.from,nearest=Infinity
   held.rects.forEach((rect,i)=>{const d=Math.abs(held.y-(rect.top+rect.height/2-scrollDelta));if(d<nearest){nearest=d;target=Number(held.rows[i].dataset.sonaQueueIndex)}})
   held.to=target
   const height=held.rects[0]?.height||60
   held.rows.forEach(node=>{const index=Number(node.dataset.sonaQueueIndex);node.style.transform=index!==held.from&&index>=Math.min(held.from,target)&&index<=Math.max(held.from,target)?`translateY(${target>held.from?-height:height}px)`:'translateY(0)'})
   held.frame=requestAnimationFrame(tick)
  };tick()
 }
 function move(event:PointerEvent<HTMLButtonElement>){if(drag.current?.id===event.pointerId){drag.current.y=event.clientY;event.preventDefault()}}
 function finish(event:PointerEvent<HTMLButtonElement>){
  const held=drag.current;if(!held||held.id!==event.pointerId)return
  const from=held.from,to=held.to
  cancelAnimationFrame(held.frame)
  const destination=held.rows.findIndex(row=>Number(row.dataset.sonaQueueIndex)===to)
  const y=(held.rects[destination]?.top||0)-(viewport.current!.scrollTop-held.scroll)-parseFloat(held.ghost.style.top)
  const landing=held.ghost.animate([{transform:held.ghost.style.transform},{transform:`translate3d(0,${y}px,0)`}],{duration:150,easing:'cubic-bezier(.22,.8,.22,1)',fill:'both'})
  landing.finished.then(()=>{if(drag.current!==held)return;cleanup();if(from!==to)reorderQueue(from,to)}).catch(()=>{if(drag.current===held)cleanup()})
 }
 function settle(){
  clearTimeout(scrollTimer.current)
  scrollTimer.current=window.setTimeout(()=>{
   const node=viewport.current,anchor=middle.current;if(!node||!anchor||drag.current)return
   const next=node.scrollTop<anchor.offsetTop/2?'history':node.scrollTop>anchor.offsetTop+70?'list':'middle'
   if(next==='history'&&snap.current!=='history')navigator.vibrate?.(10)
   snap.current=next;node.dataset.snap=next
  },100)
 }
 const songRow=(song:ISong,index:number,historical=false)=> <div className="sona-queue-row" data-sona-queue-index={historical?undefined:index} key={historical?song.id+':'+index:song.id+':'+index}>
  <button type="button" className="sona-queue-song" onClick={()=>historical?setSongList([song],0):setSongList(currentList,index)} aria-label={'Play '+song.title}>
   <span className="sona-queue-art"><ImageLoader id={song.coverArt} type="song" size={100}>{src=><ArtworkImage src={src} alt="" loading="lazy"/>}</ImageLoader></span>
   <span className="sona-queue-text"><strong>{song.title}<SongExplicitMark song={song}/></strong><small>{song.artist}</small></span>
  </button>
  {!historical&&<button type="button" className="sona-queue-grip" aria-label={'Drag to reorder '+song.title} onPointerDown={event=>start(event,index)} onPointerMove={move} onPointerUp={finish} onPointerCancel={cleanup}><Menu size={22}/></button>}
 </div>
 return <section className="sona-queue-screen" aria-label="Play queue"><div className="sona-queue-top-fade"/>
  <div className="sona-queue-scroller sona-queue-snap-scroller" ref={viewport} onScroll={settle}>
   <section className="sona-queue-history" aria-label="Playback history"><div className="sona-queue-history-heading"><h2>History</h2><button type="button" onClick={()=>clear(profile)}>Clear</button></div>
    <div className="sona-queue-history-list">{(history||[]).filter(row=>row.song.id!==currentList[currentSongIndex]?.id).map((row,index)=>songRow(row.song,index,true))}
    {!history?.length&&<p className="sona-queue-empty">Your played songs will appear here.</p>}</div>
   </section>
   <div className="sona-queue-middle" ref={middle}>{header}</div>
   <section className="sona-queue-upcoming"><div className="sona-queue-sticky-controls">
    <div className="sona-queue-modes"><button aria-label="Shuffle queue" aria-pressed={shuffle} onClick={toggleShuffle}><Shuffle/></button><button aria-label="Repeat queue" aria-pressed={loop!==0} onClick={toggleLoop}>{loop===2?<Repeat1/>:<Repeat/>}</button><button aria-label="Continue playing similar music" aria-pressed={autoplay} onClick={toggleAutoplay}><InfinityIcon/></button></div>
    <h2>Continue Playing</h2></div>
    {currentList.map((song,index)=>index>currentSongIndex?songRow(song,index):null)}
    {currentSongIndex>=currentList.length-1&&<p className="sona-queue-empty">No upcoming songs.</p>}
   </section>
  </div></section>
}
