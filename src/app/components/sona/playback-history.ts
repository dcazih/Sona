import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ISong } from '@/types/responses/song'
type Played = {song:ISong;at:number}
export const usePlaybackHistory = create(persist<{
 profiles:Record<string,Played[]>;autoplay:boolean;
 record:(profile:string,song:ISong)=>void;clear:(profile:string)=>void;toggleAutoplay:()=>void;
}>((set)=>({profiles:{},autoplay:false,
 record:(profile,song)=>set(state=>({profiles:{...state.profiles,[profile]:[{song,at:Date.now()},...(state.profiles[profile]||[])].slice(0,200)}})),
 clear:profile=>set(state=>({profiles:{...state.profiles,[profile]:[]}})),
 toggleAutoplay:()=>set(state=>({autoplay:!state.autoplay})),
}),{name:'sona-playback-history-v1'}))
