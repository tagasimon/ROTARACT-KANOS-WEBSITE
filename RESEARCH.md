# Research notes and verification checklist

Public research done on 3 October 2026 to populate the starter content (`prisma/seed-data/research.json`, loaded by `prisma/seed.ts`). Nothing was invented. Every record carries its source URL. Items marked **Needs verification** or **Sources conflict** show a tag on the public site until someone from the club confirms them in **Admin → Needs review**.

## What the public record supports

- **Official listing:** Rotary International lists the club as "Kampala-North (Rotaract)", club ID 92123, Rotary District 9213 (Zone 22).
- **Charter:** chartered 1 December 2014. The district clubs list and the club's Instagram bio agree. *Verified.*
- **Size:** 102 members on the district's 2026–27 clubs list. *Verified.* This figure is shown on the site as "Members (district roll)" until real member records are entered.
- **Meetings:** Fridays at 6:00 PM, Hotel Triangle, Buganda Road. ClubRunner, Rotary-O and the RI list all agree. *Verified.* The map pin is approximate, so set exact coordinates in Settings.
- **Social handles:** X @kanosug, Instagram @kanosug, Facebook /kanosug.
- **District performance reports:**
  - August 2026: 1st among Tier 2 clubs (40+ members), score 66.
  - July 2026: 2nd among Tier 2 clubs, score 41.
- **Members on the district team:**
  - 2026–27: Projects Chair (Nahurira Victor), Deputy Public Image Chair (Mumbere Kisembo Walter) and ROLI Chair (Karen Claire Nassanga).
  - 2024–25: Pascal Ongom, Victoria Nattabi and Clare Ahebwa held district roles.
- **District leaders:**
  - Governors: Anne Nkutu (2024–25), Geoffrey Martin Kitakule (2025–26), Gerald Obai (2026–27).
  - DRRs: Emmanuel Lukeera (2023–24), Ssebukulu Simeo (2024–25), Abesage Nahabwe (2025–26), Alex Muwanguzi (2026–27).
- **Events:** the district's 2026–27 calendar is seeded, labelled as Rotaract District 9213 or Rotary District 9213 by source.

## Please confirm or correct (top priority first)

1. **Who is the 2026–27 president?** ClubRunner and Rotary-O list Ezekiel Kiggundu. The RI export in the district clubs list names Rogers Waneloba as president. ClubRunner lists Rogers Waneloba as Executive Secretary/Director. Both records are stored as *Sources conflict*.
2. **2025–26 president and board:** no public source found.
3. **Past presidents:**
   - Julius Sse, c. 2016–17. His name comes from an undated Instagram bio, and the full surname may be truncated.
   - Eric Byenkya, c. 2015–16. He is called "IPP" in a November 2016 post.
   - Karen Claire Nassanga is styled "PP", but her year is unknown, so she isn't on a year yet.
   - Every other year from 2014–15 onward is empty.
4. **Sponsoring Rotary club:** not stated anywhere public. The **Rotary Club of Kampala North** (RI 25541; Mondays, Protea Hotel Kololo) is stored as a separate organisation and *not* as the sponsor.
5. **Club email:** `kanosug@gmail.com` appears in an old Instagram bio. It's not shown on the site until confirmed. Add it in Settings if it's correct.
6. **"KANOS" nickname:** inferred from the hashtag and handle, not stated anywhere. It isn't used on the site.
7. **Projects:**
   - The Kigezi New Year's Retreat (January 2022) comes from KIU News.
   - #JRFR16 (November 2016) and #KanosNewsletter (2016) come from Instagram.
   - Each project needs its need, people, numbers and photos.
8. **Sources disagree on two district facts:**
   - The Africa Zone Institute dates.
   - The district club count (148 vs 114).

## Sources that couldn't be read

- **X:** blocked by robots.txt and rate-limited.
- **Instagram:** only the 12 most recent of 27 public posts were readable, and all are from 2016.
- **Facebook:** login wall.
- **Wayback Machine:** unreachable from the research environment.
- **District event calendars:** rendered by JavaScript, so nothing could be read.

Most recent club activity probably lives on X, Facebook and WhatsApp. Use **Admin → Import post** to bring it in.

## Not to be confused with

- **Rotary Club of Kampala North** (RI 25541): a separate Rotary club.
- **Rotaract Club of Kampala North Musical** (RI 214715, chartered 18 April 2017). DRR 2024–25 Ssebukulu Simeo came from this club.
- **Rotaract E-Club of Kampala North** (RI 8827515, chartered 6 August 2025).

## Naming

The site uses **"Rotaract Club Kampala North"** as briefed. RI's form is "Kampala-North (Rotaract)". KIU News and the district magazine use "Rotaract Club of Kampala North". You can change the display name in **Admin → Settings**.
