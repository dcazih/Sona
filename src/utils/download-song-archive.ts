import { getDownloadUrl } from '@/api/httpClient'
import type { ISong } from '@/types/responses/song'

const table = Uint32Array.from({length:256},(_,n)=>{
  let crc=n
  for(let bit=0;bit<8;bit++)crc=(crc&1)?0xedb88320^(crc>>>1):crc>>>1
  return crc>>>0
})
function crc32(data:Uint8Array){
  let crc=0xffffffff
  for(const byte of data)crc=table[(crc^byte)&255]^(crc>>>8)
  return (crc^0xffffffff)>>>0
}
function header(size:number){const data=new ArrayBuffer(size);return {data,view:new DataView(data)}}

/** One archive/download gesture, rather than opening a tab for every favorite. */
export async function downloadSongArchive(songs:ISong[],name:string){
  const parts:BlobPart[]=[],central:BlobPart[]=[]
  let offset=0,centralSize=0
  for(const [index,song] of songs.entries()){
    const response=await fetch(getDownloadUrl(song.id,'0','raw'))
    if(!response.ok || /json|xml|text\/html/.test(response.headers.get('content-type')||''))throw Error('Unable to download '+song.title)
    const data=await response.arrayBuffer()
    const ext=(song.suffix||'mp3').replace(/[^a-zA-Z0-9]/g,'')
    const filename=new TextEncoder().encode(`${String(index+1).padStart(3,'0')} ${song.artist} - ${song.title}.${ext}`.replace(/[\\/:*?"<>|]/g,'_'))
    const crc=crc32(new Uint8Array(data))
    const local=header(30),directory=header(46)
    local.view.setUint32(0,0x04034b50,true);local.view.setUint16(4,20,true);local.view.setUint16(6,0x800,true)
    local.view.setUint32(14,crc,true);local.view.setUint32(18,data.byteLength,true);local.view.setUint32(22,data.byteLength,true);local.view.setUint16(26,filename.length,true)
    directory.view.setUint32(0,0x02014b50,true);directory.view.setUint16(4,20,true);directory.view.setUint16(6,20,true);directory.view.setUint16(8,0x800,true)
    directory.view.setUint32(16,crc,true);directory.view.setUint32(20,data.byteLength,true);directory.view.setUint32(24,data.byteLength,true)
    directory.view.setUint16(28,filename.length,true);directory.view.setUint32(42,offset,true)
    parts.push(local.data,filename.buffer,data);central.push(directory.data,filename.buffer)
    offset+=30+filename.length+data.byteLength;centralSize+=46+filename.length
    if(offset+centralSize>0xffffffff || songs.length>65535)throw Error('Favorites archive exceeds ZIP size limit')
  }
  const end=header(22)
  end.view.setUint32(0,0x06054b50,true);end.view.setUint16(8,songs.length,true);end.view.setUint16(10,songs.length,true)
  end.view.setUint32(12,centralSize,true);end.view.setUint32(16,offset,true)
  const url=URL.createObjectURL(new Blob([...parts,...central,end.data],{type:'application/zip'}))
  const link=document.createElement('a');link.href=url;link.download=name+'.zip';document.body.appendChild(link);link.click();link.remove()
  window.setTimeout(()=>URL.revokeObjectURL(url),60000)
}
