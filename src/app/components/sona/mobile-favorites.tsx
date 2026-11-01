import { ArrowDownToLine, LoaderCircle, Pause, Play, Shuffle } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'react-toastify'
import { useFavoriteSongs } from '@/app/hooks/use-favorite-songs'
import { usePlayerActions, usePlayerIsPlaying, usePlayerStore } from '@/store/player.store'
import { downloadSongArchive } from '@/utils/download-song-archive'
import { SonaMobileAlbumTracks } from './mobile-album-tracks'

export default function SonaMobileFavorites(){
  const {data,isLoading}=useFavoriteSongs()
  const songs=data?.songs||[]
  const {setSongList,togglePlayPause}=usePlayerActions()
  const playing=usePlayerIsPlaying()
  const active=usePlayerStore(state=>state.playerState.playbackContext.source?.type==='favourite')
  const [downloading,setDownloading]=useState(false)
  const album={id:'favourite',name:'Favorites',artist:'',song:songs}
  const play=(shuffle=false)=>{
    if(active&&!shuffle)togglePlayPause()
    else if(songs.length)setSongList(songs,0,shuffle,{id:'favourite',name:'Favorites',type:'favourite'})
  }
  const download=async()=>{
    setDownloading(true)
    try{await downloadSongArchive(songs,'Sona Favorites');toast.success('Favorites downloaded')}
    catch{toast.error('Unable to download favorites')}
    finally{setDownloading(false)}
  }
  return <section className="sona-section-page sona-favorites-page" aria-label="Favorites">
    <h1 className="sona-section-heading">Favorites</h1>
    <div className="sona-mobile-album-actions" aria-label="Favorites playback controls">
      <button className="sona-mobile-album-round" aria-label="Shuffle favorites" disabled={songs.length<2} onClick={()=>play(true)}><Shuffle size={22}/></button>
      <button className="sona-mobile-album-play" aria-label={active&&playing?'Pause favorites':'Play favorites'} disabled={!songs.length} onClick={()=>play()}>
        {active&&playing?<Pause size={24} fill="currentColor"/>:<Play size={24} fill="currentColor"/>}<span>{active&&playing?'Pause':'Play'}</span>
      </button>
      <button className="sona-mobile-album-round" aria-label="Download favorites" aria-busy={downloading} disabled={!songs.length||downloading} onClick={()=>void download()}><span>{downloading?<LoaderCircle size={23} className="animate-spin"/>:<ArrowDownToLine size={23}/>}</span></button>
    </div>
    {isLoading?<p className="sona-section-empty">Loading favorites…</p>:<SonaMobileAlbumTracks album={album} showHeading={false} sourceType="favourite"/>}
  </section>
}
