# Sona search relevance verification — 2026-11-02

## Actual endpoint trace

Sona Music uses Music Profiles `GET /v1/sona/search` and `/v1/sona/songs` through `/sona-api/sona/*`, merged with local Navidrome matches. `src/service/search.ts` serves Library search; that service was not changed. The prior Music Profiles endpoints used broad Dropped Needle artist/album results and word-based recording searches, then expanded artist discographies aggressively.

## Real metadata checks

These are returned results from the candidate backend on the NAS, using the existing linked requester account and real MusicBrainz/Dropped Needle metadata. No downloads were submitted. Request endpoint compatibility was exercised with only its final submission boundary mocked. Distinct returned songs also passed the existing requester's actual recording/release-pair verifier.

| Query | Intent | Artists / Albums / Songs | Returned primary match | Request identity check |
|---|---|---|---|---|
| miceal jackson | artist | 1 / 1 / 3 | Michael Jackson — Michael Jackson | Passed |
| Michael Jackson | artist | 1 / 1 / 3 | Michael Jackson — Michael Jackson | Passed |
| Billie Jean | song | 0 / 0 / 1 | Billie Jean — Michael Jackson | Passed |
| Thriller | album | 0 / 1 / 1 | Thriller — Michael Jackson | Passed |
| MF DOOM Madvillainy | album | 0 / 1 / 0 | Madvillainy — Madvillain | Passed |
| Jay-Z Reasonable Doubt | album | 0 / 1 / 0 | Reasonable Doubt — Jaÿ‐Z | Passed |
| MIKE Pompeii | album | 0 / 1 / 0 | POMPEII // UTILITY — Earl Sweatshirt, MIKE & SURF GANG | Passed |

For the two Michael Jackson artist queries, the previews are Thriller (album) and Billie Jean, Beat It, Thriller (songs). Billie Jean returns one song; Thriller returns the album and song. The three artist/album queries return only their intended album. The canonical JAY-Z credit is rendered by MusicBrainz as Jaÿ‐Z. POMPEII // UTILITY is credited to Earl Sweatshirt, MIKE & SURF GANG.

Before the fix, the same seven queries returned 20 artists and roughly 34–51 albums each, including unrelated shared-word hits. Billie Jean and Thriller were mistaken for minor artist identities. The misspelled Michael Jackson query returned unrelated Jackson artists/albums.

## Logic and boundaries

- Conservative full-name corrections, verified aliases and actual collaboration credits; artist/song/album intent orders existing sections.
- Bounded candidates and visible previews; release-group/recording identity and normalized edition deduplication; no padding.
- Only selected candidates pass through the requester's existing album/recording metadata rules. Unresolved candidates are omitted, not advertised as requestable.
- A bounded cached public catalog hint supplies names to disambiguate popular title/artist collisions. It is not an identity or availability authority; returned IDs and credits are MusicBrainz/requester verified.
- Existing 320 ms client debounce and ten-minute result caching retained. Both Music Profiles endpoints share an in-flight query and result cache, plus existing durable MusicBrainz metadata caching. Cold metadata resolution can still take several seconds; warm-cache timings do not establish cold latency improvement.
- Library service, Library result counts (35 artists / 35 albums / 60 songs), search layout and interaction styling unchanged. Sona's local candidate fetch is limited to 8 per section and relevant merged output is capped at 5 (artists 3).

Metadata identity verification is not a guarantee of downloadable source availability. Acquisition was not tested or triggered.
