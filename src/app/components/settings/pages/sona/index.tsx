import { RefreshCw } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'react-toastify'
import {
  Content,
  ContentItem,
  ContentItemForm,
  ContentItemTitle,
  ContentSeparator,
  Header,
  HeaderDescription,
  HeaderTitle,
  Root,
} from '@/app/components/settings/section'
import { Button } from '@/app/components/ui/button'
import { Input } from '@/app/components/ui/input'
import { NumericInput } from '@/app/components/ui/numeric-input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select'
import { Switch } from '@/app/components/ui/switch'
import { clearAllCaches } from '@/cache/clearAll'
import { useAppCaches } from '@/store/app.store'
import { AudioFormat, ReleaseSource, useSonaWebSettings } from '@/store/sona-web-settings.store'

const formats: { value: AudioFormat; label: string }[] = [
  { value: 'original', label: 'Original quality' },
  { value: 'mp3', label: 'MP3 when available' },
]

function FormatSelect({ value, onChange }: { value: AudioFormat; onChange: (value: AudioFormat) => void }) {
  return <Select value={value} onValueChange={(next) => onChange(next as AudioFormat)}><SelectTrigger className="h-8"><SelectValue /></SelectTrigger><SelectContent>{formats.map((format) => <SelectItem key={format.value} value={format.value}>{format.label}</SelectItem>)}</SelectContent></Select>
}

export function Sona() {
  const settings = useSonaWebSettings()
  const { mediaCacheEnabled, setMediaCacheEnabled } = useAppCaches()
  const [clearing, setClearing] = useState(false)
  const clearCache = async () => {
    setClearing(true)
    try { await clearAllCaches(); toast.success('Sona caches cleared.') }
    catch { toast.error('Could not clear Sona caches.') }
    finally { setClearing(false) }
  }

  return <div className="space-y-4 sona-settings-page">
    <Root>
      <Header><HeaderTitle>Sona Playback</HeaderTitle><HeaderDescription>Controls saved in this browser for your Sona account.</HeaderDescription></Header>
      <Content>
        <ContentItem><ContentItemTitle info="Uses Navidrome’s saved play queue when it is available.">Continue Across Devices</ContentItemTitle><ContentItemForm><Switch checked={settings.continueAcrossDevices} onCheckedChange={(value) => settings.set('continueAcrossDevices', value)} /></ContentItemForm></ContentItem>
        <ContentItem><ContentItemTitle info="Gapless playback keeps album tracks together when the browser supports it.">Gapless Albums</ContentItemTitle><ContentItemForm><Switch checked={settings.gaplessAlbums} onCheckedChange={(value) => settings.set('gaplessAlbums', value)} /></ContentItemForm></ContentItem>
        <ContentItem><ContentItemTitle info="Crossfade is applied between consecutive tracks. A value of zero preserves gapless playback.">Crossfade</ContentItemTitle><ContentItemForm><NumericInput value={settings.crossfadeSeconds} onChange={(value) => settings.set('crossfadeSeconds', value)} min={0} max={12} /></ContentItemForm></ContentItem>
      </Content>
      <ContentSeparator />
    </Root>
    <Root>
      <Header><HeaderTitle>Offline Cache</HeaderTitle><HeaderDescription>Keep recently played music ready for a repeat listen. ReplayGain remains in Player & Audio, where it uses Sona’s Web Audio gain stage.</HeaderDescription></Header>
      <Content>
        <ContentItem><ContentItemTitle>Cache Music While Playing</ContentItemTitle><ContentItemForm><Switch checked={mediaCacheEnabled} onCheckedChange={setMediaCacheEnabled} /></ContentItemForm></ContentItem>
        <ContentItem><ContentItemTitle>Recent Tracks to Keep</ContentItemTitle><ContentItemForm><NumericInput value={settings.cacheTracks} onChange={(value) => settings.set('cacheTracks', value)} min={1} max={25} /></ContentItemForm></ContentItem>
        <ContentItem><ContentItemTitle>Cache Format</ContentItemTitle><ContentItemForm><FormatSelect value={settings.cacheFormat} onChange={(value) => settings.set('cacheFormat', value)} /></ContentItemForm></ContentItem>
        <ContentItem><ContentItemTitle>Allow Cellular Cache</ContentItemTitle><ContentItemForm><Switch checked={settings.cellularCache} onCheckedChange={(value) => settings.set('cellularCache', value)} /></ContentItemForm></ContentItem>
        <ContentItem><ContentItemTitle>Clear Music, Artwork, and Lyrics Cache</ContentItemTitle><ContentItemForm><Button variant="destructive" size="sm" disabled={clearing} onClick={clearCache}><RefreshCw className="mr-1 h-3.5 w-3.5" />{clearing ? 'Clearing' : 'Clear cache'}</Button></ContentItemForm></ContentItem>
      </Content>
      <ContentSeparator />
    </Root>
    <Root>
      <Header><HeaderTitle>Downloads</HeaderTitle><HeaderDescription>Downloads use Navidrome’s original files unless you choose MP3 conversion.</HeaderDescription></Header>
      <Content><ContentItem><ContentItemTitle>Download Format</ContentItemTitle><ContentItemForm><FormatSelect value={settings.downloadFormat} onChange={(value) => settings.set('downloadFormat', value)} /></ContentItemForm></ContentItem></Content>
      <ContentSeparator />
    </Root>
    <Root>
      <Header><HeaderTitle>Listening & Metadata</HeaderTitle><HeaderDescription>Optional services only receive data after you add their details and play music.</HeaderDescription></Header>
      <Content>
        <ContentItem className="items-start py-1"><ContentItemTitle>ListenBrainz Username</ContentItemTitle><ContentItemForm><Input value={settings.listenBrainzUser} onChange={(event) => settings.set('listenBrainzUser', event.target.value)} placeholder="your username" /></ContentItemForm></ContentItem>
        <ContentItem className="items-start py-1"><ContentItemTitle>ListenBrainz Token</ContentItemTitle><ContentItemForm><Input type="password" value={settings.listenBrainzToken} onChange={(event) => settings.set('listenBrainzToken', event.target.value)} placeholder="personal token" /></ContentItemForm></ContentItem>
        <ContentItem className="items-start py-1"><ContentItemTitle>AudioMuse URL</ContentItemTitle><ContentItemForm><Input type="url" value={settings.audioMuseUrl} onChange={(event) => settings.set('audioMuseUrl', event.target.value)} placeholder="https://…" /></ContentItemForm></ContentItem>
        <ContentItem><ContentItemTitle>Open Releases In</ContentItemTitle><ContentItemForm><Select value={settings.openReleasesIn} onValueChange={(value) => settings.set('openReleasesIn', value as ReleaseSource)}><SelectTrigger className="h-8"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="musicbrainz">MusicBrainz</SelectItem><SelectItem value="discogs">Discogs</SelectItem></SelectContent></Select></ContentItemForm></ContentItem>
      </Content>
    </Root>
  </div>
}
