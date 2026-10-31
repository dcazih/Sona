// Deterministic native iOS PWA launch PNGs. No external dependencies.
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { deflateSync, inflateSync } from 'node:zlib'

const output = join(process.cwd(), 'public', 'pwa-startup')
mkdirSync(output, { recursive: true })
const devices = [[375,667,2],[414,736,3],[375,812,3],[360,780,3],[414,896,2],[414,896,3],[390,844,3],[428,926,3],[393,852,3],[430,932,3],[402,874,3],[440,956,3],[375,812,2],[320,568,2],[393,852,2],[420,912,3]]
const stops = [[0,[255,144,168]],[.34,[255,71,115]],[.66,[255,39,80]],[1,[255,2,46]]]
// The original Apple Music artwork is an 8-bit indexed PNG with transparency.
function decodeIndexedPng(data) {
  const signature = Buffer.from([137,80,78,71,13,10,26,10])
  if (!data.subarray(0,8).equals(signature)) throw Error('Invalid Apple Music PNG')
  let width=0,height=0,palette=null,transparency=Buffer.alloc(0)
  const compressed=[]
  for(let i=8;i<data.length;) {
    const length=data.readUInt32BE(i);i+=4
    const type=data.toString('ascii',i,i+4);i+=4
    const part=data.subarray(i,i+length);i+=length+4
    if(type==='IHDR') {
      width=part.readUInt32BE(0);height=part.readUInt32BE(4)
      if(part[8]!==8||part[9]!==3||part[12]!==0) throw Error('Expected indexed noninterlaced PNG')
    }
    if(type==='PLTE')palette=part
    if(type==='tRNS')transparency=part
    if(type==='IDAT')compressed.push(part)
    if(type==='IEND')break
  }
  if(!palette||!width||!height)throw Error('Incomplete Apple Music PNG')
  const bytes=inflateSync(Buffer.concat(compressed))
  const indices=Buffer.alloc(width*height)
  let offset=0
  const prev=Buffer.alloc(width),row=Buffer.alloc(width)
  const paeth=(a,b,v)=>{const p=a+b-v,pa=Math.abs(p-a),pb=Math.abs(p-b),pc=Math.abs(p-v);return pa<=pb&&pa<=pc?a:pb<=pc?b:v}
  for(let y=0;y<height;y++) {
    const filter=bytes[offset++]
    for(let x=0;x<width;x++) {
      const a=x?row[x-1]:0,b=prev[x],v=x?prev[x-1]:0
      const predictor=filter===0?0:filter===1?a:filter===2?b:filter===3?Math.floor((a+b)/2):filter===4?paeth(a,b,v):null
      if(predictor===null)throw Error('Unsupported PNG filter')
      row[x]=(bytes[offset++]+predictor)&255
    }
    row.copy(indices,y*width)
    row.copy(prev)
  }
  return {width,height,indices,palette,transparency}
}
const logo=decodeIndexedPng(readFileSync(join(process.cwd(),'public','apple-music-logo.png')))

const table = new Uint32Array(256)
for (let i=0;i<256;i++) {
 let x=i
 for(let j=0;j<8;j++)x=(x&1)?0xedb88320^(x>>>1):x>>>1
 table[i]=x>>>0
}
function crc32(buffer) {
 let crc=0xffffffff
 for(let i=0;i<buffer.length;i++)crc=table[(crc^buffer[i])&255]^(crc>>>8)
 return (crc^0xffffffff)>>>0
}
function chunk(type, data) {
 const label=Buffer.from(type)
 const len=Buffer.alloc(4);len.writeUInt32BE(data.length)
 const checksum=Buffer.alloc(4);checksum.writeUInt32BE(crc32(Buffer.concat([label,data])))
 return Buffer.concat([len,label,data,checksum])
}
function rgbFor(t) {
 let lo=stops[0], hi=stops.at(-1)
 for (let i=1;i<stops.length;i++)if(t<=stops[i][0]){lo=stops[i-1];hi=stops[i];break}
 const ratio=Math.max(0,Math.min(1,(t-lo[0])/(hi[0]-lo[0])))
 return [0,1,2].map(c=>Math.round(lo[1][c]*(1-ratio)+hi[1][c]*ratio))
}
// Isolate the bright note pixels from the original supplied Apple Music icon.
// A full-bleed app icon must not bake in the source image's rounded
// transparent corners or its white outer stroke (iOS rounds icons itself).
function noteAlpha(x,y) {
  if(x<30||x>164||y<22||y>166)return 0
  const index=logo.indices[y*logo.width+x]
  const green=logo.palette[index*3+1]
  const transparency=(logo.transparency[index]??255)/255
  return Math.max(0,Math.min(1,(green-107)/100))*transparency
}
function noteAt(nx,ny) {
  if(nx<0||ny<0||nx>=logo.width||ny>=logo.height)return 0
  const x=Math.floor(nx),y=Math.floor(ny)
  const u=nx-x,v=ny-y
  const a=noteAlpha(x,y),b=noteAlpha(x+1,y),c=noteAlpha(x,y+1),d=noteAlpha(x+1,y+1)
  return (a*(1-u)+b*u)*(1-v)+(c*(1-u)+d*u)*v
}

function writeSplash(logicalW, logicalH, dpr) {
 const width=logicalW*dpr,height=logicalH*dpr, rowBytes=width*4+1
 const raw=Buffer.alloc(rowBytes*height)
 const icon=Math.round(174*dpr)
 const left=Math.floor((width-icon)/2), top=Math.floor((height-icon)/2)
 for (let y=0;y<height;y++) {
   const [r,g,b]=rgbFor(y/(height-1))
   const row=y*rowBytes
   raw[row]=0
   const ny=Math.floor((y-top)*logo.height/icon)
   for(let x=0;x<width;x++){
     const off=row+1+x*4, nx=Math.floor((x-left)*logo.width/icon)
     const a=noteAt(nx,ny)
     const rr=Math.round(r*(1-a)+255*a)
     const gg=Math.round(g*(1-a)+255*a)
     const bb=Math.round(b*(1-a)+255*a)
     raw[off]=rr
     raw[off+1]=gg
     raw[off+2]=bb
     raw[off+3]=255
   }
 }
 const header=Buffer.alloc(13)
 header.writeUInt32BE(width,0);header.writeUInt32BE(height,4)
 header[8]=8;header[9]=6
 const png=Buffer.concat([
   Buffer.from([137,80,78,71,13,10,26,10]),
   chunk('IHDR',header),chunk('IDAT',deflateSync(raw,{level:9})),chunk('IEND',Buffer.alloc(0))
 ])
 const name=width+'x'+height+'.png'
 writeFileSync(join(output,name),png)
 console.log('Generated iOS startup '+name+' ('+png.length+' bytes)')
}
const emitted=new Set()
for(const [w,h,dpr] of devices){
 const name=(w*dpr)+'x'+(h*dpr)
 if(emitted.has(name))continue
 emitted.add(name)
 writeSplash(w,h,dpr)
}

// Generate matching high-resolution home-screen and browser icons from the
// same Apple Music source, avoiding stale earlier Sona branding.
// Stage 2 renders this same transparent note over the same gradient.
// Native iOS startup files use noteAt too, preventing shape/color changes.
function writeStartupNote(size=512) {
  const raw=Buffer.alloc(size*(size*4+1))
  for(let y=0;y<size;y++){
    const row=y*(size*4+1)
    raw[row]=0
    for(let x=0;x<size;x++){
      const off=row+1+x*4
      const a=noteAt((x+.5)*logo.width/size,(y+.5)*logo.height/size)
      raw[off]=255;raw[off+1]=255;raw[off+2]=255;raw[off+3]=Math.round(a*255)
    }
  }
  const header=Buffer.alloc(13)
  header.writeUInt32BE(size,0);header.writeUInt32BE(size,4)
  header[8]=8;header[9]=6
  writeFileSync(join(process.cwd(),'public','sona-startup-note-v14.png'),
    Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),
      chunk('IHDR',header),chunk('IDAT',deflateSync(raw,{level:9})),
      chunk('IEND',Buffer.alloc(0))]))
}
writeStartupNote()

function writeIcon(size) {
  const raw=Buffer.alloc(size*(size*4+1))
  for(let y=0;y<size;y++) {
    const row=y*(size*4+1)
    raw[row]=0
    const [r,g,b]=rgbFor(y/(size-1))
    const sourceY=Math.min(logo.height-1,Math.floor(y*logo.height/size))
    for(let x=0;x<size;x++){
      const sourceX=Math.min(logo.width-1,Math.floor(x*logo.width/size))
      const a=noteAlpha(sourceX,sourceY)
      const at=row+1+x*4
      raw[at]=Math.round(r*(1-a)+255*a)
      raw[at+1]=Math.round(g*(1-a)+255*a)
      raw[at+2]=Math.round(b*(1-a)+255*a)
      raw[at+3]=255
    }
  }
  const header=Buffer.alloc(13)
  header.writeUInt32BE(size,0)
  header.writeUInt32BE(size,4)
  header[8]=8;header[9]=6
  const bytes=Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),
    chunk('IHDR',header),chunk('IDAT',deflateSync(raw,{level:9})),
    chunk('IEND',Buffer.alloc(0))])
  writeFileSync(join(process.cwd(),'public','sona-icon-v13-'+size+'.png'),bytes)
}
for(const size of [16,32,180,192,512])writeIcon(size)
