import type { Albums } from '@/types/responses/album'
import type { Genre } from '@/types/responses/genre'
import type { ISong } from '@/types/responses/song'

export type CategoryPhoto = 'urban'|'singer'|'rock'|'dj'|'vinyl'|'jazz'|'piano'|'acoustic'|'orchestra'|'ocean'|'live'|'country'|'calm'
export interface SonaDiscoverCategory {
  title: string
  id: string
  color: string
  photo: CategoryPhoto
  aliases: string[]
  related: string[]
  query: string
}
/** Stable, free-to-use photographic backups. Actual frequently played artwork
 * from the user's Navidrome library takes precedence when relevant. */
export const DISCOVER_PHOTOS: Record<CategoryPhoto,string> = {
  urban:'https://images.unsplash.com/photo-1612233965238-898fac5e45f4?w=550&h=320&fit=crop&auto=format&q=78',
  singer:'https://images.unsplash.com/photo-1641907067574-ce3056926093?w=550&h=320&fit=crop&auto=format&q=78',
  rock:'https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?w=550&h=320&fit=crop&auto=format&q=78',
  dj:'https://images.unsplash.com/photo-1496337589254-7e19d01cec44?w=550&h=320&fit=crop&auto=format&q=78',
  vinyl:'https://images.unsplash.com/photo-1647796310365-8741019c7ca9?w=550&h=320&fit=crop&auto=format&q=78',
  jazz:'https://images.unsplash.com/photo-1707944494732-e706d511456d?w=550&h=320&fit=crop&auto=format&q=78',
  piano:'https://images.unsplash.com/photo-1632008341003-5c6767c7d237?w=550&h=320&fit=crop&auto=format&q=78',
  acoustic:'https://images.unsplash.com/photo-1771254240340-ae73c5a378ff?w=550&h=320&fit=crop&auto=format&q=78',
  orchestra:'https://images.unsplash.com/photo-1764805354851-7933a7116129?w=550&h=320&fit=crop&auto=format&q=78',
  ocean:'https://images.unsplash.com/photo-1557322964-9ff4a6b15352?w=550&h=320&fit=crop&auto=format&q=78',
  live:'https://images.unsplash.com/photo-1767376133639-d76d3189a1f7?w=550&h=320&fit=crop&auto=format&q=78',
  country:'https://images.unsplash.com/photo-1770224654899-1ecf1efec4cc?w=550&h=320&fit=crop&auto=format&q=78',
  calm:'https://images.unsplash.com/photo-1486869801134-25b6bc85fc0d?w=550&h=320&fit=crop&auto=format&q=78',
}
type Row = [string,string,CategoryPhoto,string,string?,string?]
/* Category set and saturated card colors follow the supplied reference grid.
 * Aliases use actual Navidrome genres when available; editorial shelves use
 * a related local genre or fall back to a library search. */
const ROWS:Row[] = [
 ['Charts','#93951b','live','pop,hip hop,rap,r&b','hits,pop','popular'],
 ['Hip-Hop','#5684ec','urban','hip hop,hip-hop,hip hop/rap,rap,trap','r&b,jazz,afrobeats','hip hop'],
 ['R&B','#a08adf','singer','r&b,r&b/soul,rnb,rhythm and blues,neo soul','soul/funk,jazz,hip-hop','r&b'],
 ['Hits','#ffc500','singer','pop,hip hop,rap,dance','charts,pop','hits'],
 ['Pop','#e66789','singer','pop,pop rock,dance pop','indie,dance','pop'],
 ['Country','#df8e2d','country','country,alt country,country rock','americana,acoustic','country'],
 ['Dance','#45bd8d','dj','dance,edm,house,electronic,dance pop','dj mixes,electronic','dance'],
 ['Rock','#f66546','rock','rock,rock & roll,alternative rock','classic rock,metal','rock'],
 ['Hip-Hop History Month','#577ef1','urban','hip hop,rap,old school hip hop','hip-hop,oldies','classic rap'],
 ['Apple Music Live','#8b8b92','live','live,concert,live recording','concerts,charts','live'],
 ["JAY-Z’s Road to Halftime",'#4d4d53','urban','hip hop,rap','hip-hop,essentials','jay z'],
 ['Concerts','#a9324d','live','live,concert,live recording','music videos,rock','concert'],
 ['Holiday','#b10a2f','orchestra','holiday,christmas,seasonal','classical,oldies','holiday'],
 ['Apple Music Radio','#fa124b','singer','radio,pop,hip hop','hits,charts','radio'],
 ['Latin','#ff407f','singer','latin,latin pop,latin urban','urbano latino,pop latino','latin'],
 ['Urbano Latino','#e64f79','urban','reggaeton,latin urban,urbano latino,latin trap','latin,dance','reggaeton'],
 ['Pop Latino','#ec528a','singer','latin pop,pop latino','latin,pop','latin pop'],
 ['K-Pop','#d54585','singer','k-pop,kpop,korean pop','pop,dance','kpop'],
 ['Classic Rock','#ee693f','rock','classic rock,oldies rock,rock','hard rock,oldies','classic rock'],
 ['Hard Rock','#f15b3b','rock','hard rock,metal,heavy rock','metal,punk','hard rock'],
 ['Punk','#ed602f','rock','punk,punk rock,post punk','alternative,metal','punk'],
 ['Metal','#ec4560','rock','metal,heavy metal,death metal','hard rock,punk','metal'],
 ['Oldies','#f9ae06','vinyl','oldies,50s,60s,70s','classic rock,decades','oldies'],
 ['Americana','#cd842c','country','americana,folk,alt country','acoustic,country','americana'],
 ['Música Mexicana','#dba524','country','regional mexican,mexican,corridos,musica mexicana','latin,urbano latino','música mexicana'],
 ['Alternative','#c8c323','rock','alternative,alternative rock,indie rock','indie,rock','alternative'],
 ['Acoustic','#becd02','acoustic','acoustic,folk,singer songwriter','americana,chill','acoustic'],
 ['Afrobeats','#96c400','singer','afrobeats,afrobeat,afropop,african','reggae,hip-hop','afrobeats'],
 ['Reggae','#68c425','urban','reggae,dancehall,dub','worldwide,afrobeats','reggae'],
 ['Worldwide','#069f49','singer','world,world music,international','afrobeats,latin','world music'],
 ['Kids','#2bc550','singer','kids,children,children music','family,feel good','kids music'],
 ['Family','#19aa60','acoustic','family,kids,children','kids,feel good','family music'],
 ['Electronic','#09ad83','dj','electronic,electronica,techno,house','dance,dj mixes','electronic'],
 ['DJ Mixes','#fa0950','dj','dj,house,techno,edm,mix','dance,electronic','dj mix'],
 ['Indie','#02b59f','singer','indie,indie rock,indie pop','alternative,acoustic','indie'],
 ['Christian','#04b8bf','acoustic','christian,christian rock,worship','gospel,acoustic','christian'],
 ['Gospel','#09b4bc','singer','gospel,christian,worship','soul/funk,jazz','gospel'],
 ['Jazz','#12b1c5','jazz','jazz,smooth jazz,bebop','blues,soul/funk','jazz'],
 ['Blues','#3a9ee0','rock','blues,blues rock','jazz,classic rock','blues'],
 ['Music Videos','#505ce6','live','video,music video,live concert','concerts,hits','music video'],
 ['Soul/Funk','#8983ec','singer','soul,funk,soul/funk,neo soul','r&b,jazz','soul'],
 ['Classical','#ba6ad8','piano','classical,orchestral,instrumental,opera','film tv & stage,oldies','classical'],
 ['Film, TV & Stage','#ac70dc','orchestra','soundtrack,film score,film,score,musical','classical,anime','soundtrack'],
 ['Anime','#a569e8','singer','anime,j-pop,japanese,anime ost','k-pop,film tv & stage','anime'],
 ['Alpha Women','#b13ddc','singer','female vocalists,pop,r&b','pop,r&b','female singers'],
 ['Essentials','#944b91','urban','hip hop,pop,rock,r&b','charts,hits','essentials'],
 ['Decades','#af7e2b','vinyl','oldies,50s,60s,70s,80s,90s','oldies,classic rock','decades'],
 ['Behind the Songs','#ada912','dj','instrumental,production,score','acoustic,film tv & stage','songwriting'],
 ['Sports','#5f8d13','live','sports,soundtrack,hip hop','fitness,hits','sports'],
 ['Fitness','#bad912','live','workout,fitness,edm,dance','dance,electronic','workout'],
 ['Chill','#16a8b5','ocean','chill,chillout,ambient,downtempo,lofi','sleep,indie','chill'],
 ['Sleep','#8138b2','calm','sleep,ambient,meditation,relaxation','chill,classical','sleep'],
 ['Feel Good','#ed9832','singer','happy,pop,dance,disco','pop,soul/funk','feel good'],
]
export const SONA_DISCOVER_CATEGORIES:SonaDiscoverCategory[]=ROWS.map(([title,color,photo,aliases,related,query])=>({
  title,id:normalizeGenre(title),color,photo,
  aliases:aliases.split(',').map(normalizeGenre),related:(related||'').split(',').filter(Boolean).map(normalizeGenre),
  query:query||title,
}))
export function normalizeGenre(value:string) {
 return (value||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'')
  .toLowerCase().replace(/&/g,' and ').replace(/[^a-z0-9]+/g,' ').trim()
}
export function matchingGenre(category:SonaDiscoverCategory,available:Genre[]) {
 const names=new Set(category.aliases)
 const exact=available.find(g=>names.has(normalizeGenre(g.value)))
 if(exact)return exact.value
 return available.find(g=>category.aliases.some(a=>
   a.length>3&&(normalizeGenre(g.value).startsWith(a+' ')||a.startsWith(normalizeGenre(g.value)+' '))
 ))?.value
}
export function categoryPhoto(category:SonaDiscoverCategory,albums:Albums[],used:Set<string>) {
 const matches=albums.filter(a=>a.coverArt && category.aliases.some(alias=>normalizeGenre(a.genre||'')===alias))
 const candidate=matches.find(album=>!used.has(album.coverArt))
 if(candidate){used.add(candidate.coverArt);return candidate.coverArt}
 // A few editorial shelves use the most-played albums, not unrelated metadata.
 if(['charts','hits','essentials'].includes(category.id)){
  const top=albums.find(a=>a.coverArt&&!used.has(a.coverArt))
  if(top){used.add(top.coverArt);return top.coverArt}
 }
 return undefined
}
export type GenrePlay = { count:number;latest:number }
function profileStorageKey(profile:string){return 'sona-genre-play-history-v2:'+profile}
export function getGenrePlays(profile:string):Record<string,GenrePlay>{
 try {return JSON.parse(localStorage.getItem(profileStorageKey(profile))||'{}')||{}}catch{return {}}
}
export function recordGenreListen(profile:string,song:ISong) {
 if(!song.genre&&!song.genres?.length)return
 const key=normalizeGenre(song.genre||song.genres[0]?.name||'')
 if(!key)return
 const data=getGenrePlays(profile)
 const previous=data[key]||{count:0,latest:0}
 data[key]={count:Math.min(2000,previous.count+1),latest:Date.now()}
 try {localStorage.setItem(profileStorageKey(profile),JSON.stringify(data))}catch{}
}
function localDay(){
 const now=new Date()
 return [now.getFullYear(),String(now.getMonth()+1).padStart(2,'0'),String(now.getDate()).padStart(2,'0')].join('-')
}
/** One continuous order: favorites, adjacent discoveries, editorial remainder.
 * Ranking is fixed for the local calendar day and scoped to login/server. */
export function rankDiscoverOnceDaily(
 profile:string, frequent:Albums[], recent:Albums[], genres:Genre[],
) {
 const cacheKey='sona-discover-daily-v3:'+profile
 const day=localDay()
 try {
  const saved=JSON.parse(localStorage.getItem(cacheKey)||'null')
  if(saved?.day===day && Array.isArray(saved.order) && saved.order.length===SONA_DISCOVER_CATEGORIES.length){
   const byId=new Map(SONA_DISCOVER_CATEGORIES.map(c=>[c.id,c]))
   const stable=saved.order.map((id:string)=>byId.get(id)).filter(Boolean) as SonaDiscoverCategory[]
   if(stable.length===SONA_DISCOVER_CATEGORIES.length)return stable
  }
 }catch{}
 const weights=new Map<string,number>()
 const add=(genre:string,score:number)=>{
   const key=normalizeGenre(genre)
   if(key)weights.set(key,(weights.get(key)||0)+score)
 }
 for(const [genre,entry] of Object.entries(getGenrePlays(profile))){
   const ageDays=(Date.now()-entry.latest)/86400000
   add(genre,Math.log1p(entry.count)*Math.exp(-Math.max(0,ageDays)/35)*6)
 }
 frequent.forEach((album,i)=>{
   if(album.genre)add(album.genre,1.5*(1-i/Math.max(1,frequent.length))+Math.log1p(album.playCount||0)*.15)
 })
 recent.forEach((album,i)=>{if(album.genre)add(album.genre,.6*(1-i/Math.max(1,recent.length)))})
 const directScore=(category:SonaDiscoverCategory)=>
  category.aliases.reduce((max,g)=>Math.max(max,weights.get(g)||0),0)
 const direct=SONA_DISCOVER_CATEGORIES.filter(c=>directScore(c)>0.1)
  .sort((a,b)=>directScore(b)-directScore(a))
 const related=new Map<string,number>()
 for(const parent of direct.slice(0,8)){
   for(const key of parent.related){
     related.set(key,Math.max(related.get(key)||0,directScore(parent)))
   }
 }
 const exploration=SONA_DISCOVER_CATEGORIES.filter(c=>!direct.includes(c) && (related.get(c.id)||0)>0)
  .sort((a,b)=>(related.get(b.id)||0)-(related.get(a.id)||0))
 const rest=SONA_DISCOVER_CATEGORIES.filter(c=>!direct.includes(c)&&!exploration.includes(c))
 const result=[...direct,...exploration,...rest]
 // Do not freeze an empty/unauthenticated state; it must become personal once data arrives.
 if(frequent.length||recent.length||Object.keys(getGenrePlays(profile)).length){
  try {localStorage.setItem(cacheKey,JSON.stringify({day,order:result.map(c=>c.id)}))}catch{}
 }
 return result
}
