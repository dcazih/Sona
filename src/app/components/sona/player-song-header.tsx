import { Ellipsis } from 'lucide-react'
import { LikeButton } from '@/app/components/fullscreen/like-button'
import { ArtworkImage } from '@/app/components/artwork-image'
import { ImageLoader } from '@/app/components/image-loader'
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent } from '@/app/components/ui/dropdown-menu'
import { SongMenuOptions } from '@/app/components/song/menu-options'
import { usePlayerCurrentSong, usePlayerSonglist } from '@/store/player.store'
import { SongExplicitMark } from './song-explicit-mark'
export function PlayerSongMore(){
 const song=usePlayerCurrentSong(),{currentSongIndex}=usePlayerSonglist()
 if(!song?.id)return null
 return <DropdownMenu><DropdownMenuTrigger asChild><button type="button" className="sona-now-more" aria-label="More song options"><Ellipsis size={23}/></button></DropdownMenuTrigger><DropdownMenuContent align="end" style={{zIndex:400}}><SongMenuOptions variant="dropdown" song={song} index={currentSongIndex}/></DropdownMenuContent></DropdownMenu>
}
export function PlayerCompactHeader(){
 const song=usePlayerCurrentSong()
 return <div className="sona-queue-current-header"><div className="sona-queue-current-cover" data-sona-active-player-cover><ImageLoader id={song?.coverArt} type="song" size={800}>{src=><ArtworkImage src={src} crossOrigin="anonymous" alt={song?.title||'Album artwork'}/>}</ImageLoader></div>
 <div className="sona-queue-current-copy"><strong>{song?.title}<SongExplicitMark song={song}/></strong><small>{song?.artist}</small></div><LikeButton/><PlayerSongMore/></div>
}
