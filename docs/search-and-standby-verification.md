# Search and standby repair — November 3, 2026

## Search changes

The prior pipeline blocked search on release/track verification and expanded several metadata paths through the shared MusicBrainz limiter. Warm-cache checks concealed the latency and a narrow seven-query set missed real intent failures.

The revised client makes one catalog request. The server retrieves a small set of canonical MusicBrainz candidates without waiting for requester album/track checks. Only visible song cloud buttons initiate separate identity verification, remain disabled while checking, and use the existing request adapter on submission. Album rows open the existing detail workflow. No download availability is inferred from metadata.

Artist token-prefix evidence now accepts Kendrick → Kendrick Lamar when corroborated by catalog tracks. Artist, song and artist/album evidence compete before choosing the lookup path. Artist/album matching checks actual credits, aliases and collaboration relations. Audio search excludes music-video recordings; title/edition evidence deprioritizes unrelated versions. Query cancellation stops additional planning when the last waiting client disconnects. Shared provider caches and rate limits remain intact.

Real metadata checks, using an isolated copy of the NAS database and no acquisition submissions, returned:

| Query | Primary identity |
|---|---|
| Kendrick | Kendrick Lamar (artist) |
| All Caps | All Caps — Madvillain (audio recording) |
| Daft Punk | Daft Punk (artist) |
| Frank Ocean Blonde | Blonde — Frank Ocean |
| miceal jackson | Michael Jackson (artist) |
| Michael Jackson | Michael Jackson (artist) |
| Billie Jean | Billie Jean — Michael Jackson |
| Thriller | Thriller — Michael Jackson (album) |
| MF DOOM Madvillainy | Madvillainy — Madvillain |
| Jay-Z Reasonable Doubt | Reasonable Doubt — Jaÿ‐Z |
| MIKE Pompeii | POMPEII // UTILITY — Earl Sweatshirt, MIKE & SURF GANG |

Every returned song/album in this set passed separate verification and the existing request adapter with only the final submission boundary mocked. No downloads were started. Early fresh-path checks took approximately 0.5–3.5 seconds for most cases, with collaboration and cold provider work still variable; warm metadata checks are not cold benchmarks. The old deployed checks took 14.27 seconds for All Caps and 14.98 seconds for Daft Punk.

## Playback changes

- Lock-screen Play and Pause use explicit idempotent commands, invoking the native audio element in the media action callback.
- Normal playback no longer creates a Web Audio graph when ReplayGain is disabled. ReplayGain remains available when enabled; interrupted contexts are explicitly resumed without delaying the native play call.
- Playback snapshots survive ordinary PWA relaunches, are scoped by account and configured server, and last seven days. Existing session snapshots migrate on use.
- Resume seeks the actual audio element, not only the UI state. Loading/seeking events do not overwrite a restored position prematurely.
- The song stream URL remains stable when the song object changes during metadata refreshes.
- The household deployment streams audio through Sona's own origin, preserving Subsonic authentication and Range support; custom servers retain their existing route.
- The manifest has explicit app identity and scope while preserving the existing default identity.

The dedicated Sona hostname routes to Sona on the NAS. This does not prove which Home Screen installation iOS associates with an existing lock-screen session. There is no standard Media Session action for replacing the OS's installed-app launch target. Physical iPhone standby and notification launch still require device confirmation; an existing shortcut installed for the TrueNAS origin may need replacement with one installed directly from the dedicated Sona origin.

## Final regression coverage

20 backend tests and 23 browser checks passed, including explicit song/album filter intent, candidate display before verification, disabled clouds until verification succeeds, repeated lock-screen Play/Pause, restored actual audio position, and a stable audio URL across song metadata refreshes. The credited artist/album fast path resolves a direct credit in one MusicBrainz lookup rather than expanding the whole phrase as an artist first. Explicit section filters retain the small artist discography/popular-song workflow without blocking the default artist result.
