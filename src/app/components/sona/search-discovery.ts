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
/** Versioned, locally served artist photography; attribution is shipped with the assets. */
const CATEGORY_ARTISTS: [string, string, string][] = [
  ["Charts", "Taylor Swift", "/discovery/artists-v1/charts.webp"],
  ["Hip-Hop", "Kendrick Lamar", "/discovery/artists-v1/hip-hop.webp"],
  ["R&B", "SZA", "/discovery/artists-v1/r-b.webp"],
  ["Hits", "The Weeknd", "/discovery/artists-v1/hits.webp"],
  ["Pop", "Dua Lipa", "/discovery/artists-v1/pop.webp"],
  ["Country", "Dolly Parton", "/discovery/artists-v1/country.webp"],
  ["Dance", "Calvin Harris", "/discovery/artists-v1/dance.webp"],
  ["Rock", "Dave Grohl", "/discovery/artists-v1/rock.webp"],
  ["Hip-Hop History Month", "Tupac Shakur", "/discovery/artists-v1/hip-hop-history-month.webp"],
  ["Apple Music Live", "Billie Eilish", "/discovery/artists-v1/apple-music-live.webp"],
  ["JAY-Z’s Road to Halftime", "Jay-Z", "/discovery/artists-v1/jay-z-s-road-to-halftime.webp"],
  ["Concerts", "Beyoncé", "/discovery/artists-v1/concerts.webp"],
  ["Holiday", "Mariah Carey", "/discovery/artists-v1/holiday.webp"],
  ["Apple Music Radio", "Zane Lowe", "/discovery/artists-v1/apple-music-radio.webp"],
  ["Latin", "Bad Bunny", "/discovery/artists-v1/latin.webp"],
  ["Urbano Latino", "Rauw Alejandro", "/discovery/artists-v1/urbano-latino.webp"],
  ["Pop Latino", "Shakira", "/discovery/artists-v1/pop-latino.webp"],
  ["K-Pop", "Lisa (rapper)", "/discovery/artists-v1/k-pop.webp"],
  ["Classic Rock", "Freddie Mercury", "/discovery/artists-v1/classic-rock.webp"],
  ["Hard Rock", "Slash (musician)", "/discovery/artists-v1/hard-rock.webp"],
  ["Punk", "Billie Joe Armstrong", "/discovery/artists-v1/punk.webp"],
  ["Metal", "James Hetfield", "/discovery/artists-v1/metal.webp"],
  ["Oldies", "Elvis Presley", "/discovery/artists-v1/oldies.webp"],
  ["Americana", "Chris Stapleton", "/discovery/artists-v1/americana.webp"],
  ["Música Mexicana", "Peso Pluma", "/discovery/artists-v1/m-sica-mexicana.webp"],
  ["Alternative", "Hayley Williams", "/discovery/artists-v1/alternative.webp"],
  ["Acoustic", "Ed Sheeran", "/discovery/artists-v1/acoustic.webp"],
  ["Afrobeats", "Burna Boy", "/discovery/artists-v1/afrobeats.webp"],
  ["Reggae", "Bob Marley", "/discovery/artists-v1/reggae.webp"],
  ["Worldwide", "Angélique Kidjo", "/discovery/artists-v1/worldwide.webp"],
  ["Kids", "Raffi", "/discovery/artists-v1/kids.webp"],
  ["Family", "Laurie Berkner", "/discovery/artists-v1/family.webp"],
  ["Electronic", "Skrillex", "/discovery/artists-v1/electronic.webp"],
  ["DJ Mixes", "David Guetta", "/discovery/artists-v1/dj-mixes.webp"],
  ["Indie", "Kevin Parker", "/discovery/artists-v1/indie.webp"],
  ["Christian", "Lauren Daigle", "/discovery/artists-v1/christian.webp"],
  ["Gospel", "Kirk Franklin", "/discovery/artists-v1/gospel.webp"],
  ["Jazz", "Miles Davis", "/discovery/artists-v1/jazz.webp"],
  ["Blues", "B. B. King", "/discovery/artists-v1/blues.webp"],
  ["Music Videos", "Lady Gaga", "/discovery/artists-v1/music-videos.webp"],
  ["Soul/Funk", "Stevie Wonder", "/discovery/artists-v1/soul-funk.webp"],
  ["Classical", "Yo-Yo Ma", "/discovery/artists-v1/classical.webp"],
  ["Film, TV & Stage", "Lin-Manuel Miranda", "/discovery/artists-v1/film-tv-stage.webp"],
  ["Anime", "LiSA (Japanese musician, born 1987)", "/discovery/artists-v1/anime.webp"],
  ["Alpha Women", "Rihanna", "/discovery/artists-v1/alpha-women.webp"],
  ["Essentials", "Prince (musician)", "/discovery/artists-v1/essentials.webp"],
  ["Decades", "Michael Jackson", "/discovery/artists-v1/decades.webp"],
  ["Behind the Songs", "Jack Antonoff", "/discovery/artists-v1/behind-the-songs.webp"],
  ["Sports", "Eminem", "/discovery/artists-v1/sports.webp"],
  ["Fitness", "Megan Thee Stallion", "/discovery/artists-v1/fitness.webp"],
  ["Chill", "Frank Ocean", "/discovery/artists-v1/chill.webp"],
  ["Sleep", "Laufey (musician)", "/discovery/artists-v1/sleep.webp"],
  ["Feel Good", "Lizzo", "/discovery/artists-v1/feel-good.webp"],
]
export const DISCOVER_PHOTOS: Record<string,string> = Object.fromEntries(
  CATEGORY_ARTISTS.map(([title, , src]) => [normalizeGenre(title), src]),
)
export const DISCOVER_ARTISTS: Record<string,string> = Object.fromEntries(
  CATEGORY_ARTISTS.map(([title, artist]) => [normalizeGenre(title), artist]),
)
export const DISCOVER_FOCAL_POINTS: Record<string,string> = Object.fromEntries([
  ["Pop", "center 28%"],
  ["Country", "center 40%"],
  ["Hip-Hop History Month", "center 50%"],
  ["Concerts", "center 20%"],
  ["Holiday", "center 25%"],
  ["Latin", "center 45%"],
  ["Urbano Latino", "center 35%"],
  ["K-Pop", "center 28%"],
  ["Acoustic", "center 35%"],
  ["DJ Mixes", "center 35%"],
  ["Gospel", "center 20%"],
  ["Decades", "center 40%"],
  ["Sports", "center 40%"],
  ["Chill", "center 25%"],
].map(([title, point]) => [normalizeGenre(title), point]))
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
/** Editorial categories can use popular-genre artwork, but must never outrank
 * the actual genres being listened to simply because of broad fallback aliases. */
const EDITORIAL_OVERVIEW_IDS = new Set([
  'charts', 'hits', 'hip hop history month', 'apple music live',
  'jay z s road to halftime', 'concerts', 'apple music radio',
  'music videos', 'alpha women', 'essentials', 'decades',
  'behind the songs', 'sports',
])

/** One continuous order: favorites, adjacent discoveries, editorial remainder.
 * Ranking is fixed for the local calendar day and scoped to login/server. */
export function rankDiscoverOnceDaily(
 profile:string, frequent:Albums[], recent:Albums[], genres:Genre[],
) {
 const cacheKey='sona-discover-daily-v4:'+profile
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
  EDITORIAL_OVERVIEW_IDS.has(category.id) ? 0 :
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
 const availableGenreKeys=new Set(genres.map(g=>normalizeGenre(g.value)))
 const rest=SONA_DISCOVER_CATEGORIES.filter(c=>!direct.includes(c)&&!exploration.includes(c))
  .sort((a,b)=>Number(b.aliases.some(alias=>availableGenreKeys.has(alias)))-
    Number(a.aliases.some(alias=>availableGenreKeys.has(alias))))
 const result=[...direct,...exploration,...rest]
 // Do not freeze an empty/unauthenticated state; it must become personal once data arrives.
 if(frequent.length||recent.length||Object.keys(getGenrePlays(profile)).length){
  try {localStorage.setItem(cacheKey,JSON.stringify({day,order:result.map(c=>c.id)}))}catch{}
 }
 return result
}
