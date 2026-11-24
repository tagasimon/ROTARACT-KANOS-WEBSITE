# Rotaract Club Kampala North: website, archive & club platform

The public face, living archive and internal tools of **Rotaract Club Kampala North** (Rotary District 9213, Uganda).

- **Public site:** a magazine-style homepage, Our Story timeline, project journeys (Need → Idea → … → Impact today, with Then → Now photos), people & skills directory, leadership by year, past presidents, a "Year That Was" page for each year, events with organizer labels, district visits with a countdown, stories (including imported social posts), photo and video archive, achievements & impact, global search, and Get Involved enquiries.
- **Members:** one-time account activation (Member ID + PIN). After that, scanning the meeting QR checks a member in instantly. My Attendance shows rate, streaks and history, privately.
- **Admin CMS:** about 25 content types with role-based access, a Needs Review queue (approve, edit, reject, merge duplicates, mark verified), Import Post → convert into a story, milestone, achievement, event, album or member spotlight, bulk photo upload with automatic optimisation, QR attendance sessions (rotating codes, check-in windows, device checks), an attendance analytics dashboard, CSV/Excel/print exports, automated event discovery, and an audit log.

Stack: Next.js 15 (App Router, server-rendered) · TypeScript · Tailwind CSS 4 · PostgreSQL + Prisma 6 · Recharts · sharp · exceljs · qrcode.

## Brand

The site follows the [Rotary Brand Center](https://brandcenter.rotary.org/) guidelines.

- **Colours:** exact masterbrand values, defined once in `src/app/globals.css`.
  - Rotary Royal Blue `#17458F` for dark surfaces and secondary buttons.
  - Rotary Gold `#F7A81B` for accents and the district band.
  - Rotaract Cranberry `#D41367` for primary actions and Rotaract identity.
  - Azure `#0067C8` for links and charts.
  - Charcoal `#54565A` for secondary text.
- **Organizer labels:** Rotaract bodies are outlined in Cranberry and Rotary bodies in Royal Blue. This club's own events have a solid Cranberry label.
- **Typefaces:** the fonts load in this order.
  - Headlines and navigation use **Frutiger** if it's installed, otherwise **Open Sans**, Rotary's official free alternative. Open Sans is self-hosted with its width axis, so labels get Open Sans Condensed.
  - Body text uses **Sentinel** if it's installed, otherwise **Georgia**.
  - If the club licenses Frutiger or Sentinel, add `@font-face` rules and they take over automatically.
- **Logo:** you can upload the club's official Rotaract signature (from the Brand Center) under **Admin → Settings**. Until then the header shows a typographic lockup in brand colours.
- **Contrast:** all text pairings meet WCAG AA. Gold appears as text only on Royal Blue (4.6:1). Pewter and Grass are never used for small text.

> Deploying? Read **[DEPLOY.md](DEPLOY.md)**. What the research found, and what still needs the club's confirmation: **[RESEARCH.md](RESEARCH.md)**.

## Local development

```bash
cp .env.example .env            # set DATABASE_URL, SESSION_SECRET, CRON_SECRET, APP_URL=http://localhost:3000
npm install
npx prisma migrate deploy        # create tables
ADMIN_EMAIL=you@example.com ADMIN_PASSWORD='change-me-123' npm run db:seed
npm run dev                      # http://localhost:3000, admin at /admin
```

Optional demo data for trying the attendance dashboard. It adds 24 obviously fake "Demo Member" records with PIN 1234 and 30 past sessions:

```bash
npm run demo            # add
npm run demo -- --clear # remove
```

Useful scripts: `npm run create-admin -- email 'password' [ROLE]`, `npm run discover` (triggers event discovery through the running app), `npm run typecheck`.

## How the pieces connect

Everything hangs off a few linked records:

```
RotaractYear ─┬─ LeadershipAssignment ── Person ── Member (private) ── AttendanceRecord
              ├─ Project ─┬─ Milestone (stage, date, people, event, documents)
              │           ├─ Metric (impactKey → club-wide totals)
              │           ├─ Partner (Organization) · Team (Person + role)
              │           └─ Media (phase: BEFORE/DURING/AFTER/CURRENT → Then → Now)
              ├─ Event (organizer: Organization) ── EventSource (every place it was seen)
              ├─ Story ← SocialPost (converted)      ├─ DistrictVisit
              ├─ Achievement · HistoryEntry (Our Story)
              └─ PhotoAlbum ── Media · Document · AttendanceSession
```

Every researched or imported record keeps its provenance: `source`, `sourceUrl`, `sourceType`, `externalId`, `discoveredAt` / `importedAt`, `lastCheckedAt`, `verification` (`VERIFIED`, `NEEDS_VERIFICATION`, `CONFLICTING`, `UNVERIFIED`), `verifiedAt` and `verifiedById`. Anything not yet verified shows a dashed "Needs verification" or "Sources conflict" tag on the public site. Records are filed into a Rotaract year (1 July – 30 June) automatically from their date.

## Before & after comparisons

Open a project in the admin area and choose **Before & after** to add a draggable comparison: upload a Before and an After photo (and optionally a During photo for three stages), with labels, dates and a caption. A project can have several, shown in the order of their **Order on the page** number. Visitors drag on the photo, use the arrow keys, or open it full screen. Projects with no comparison set up still show a slider built from photos tagged with a Then → Now phase.

## Fundraising campaigns

**Admin → Fundraising campaigns** holds appeals such as *Save Dr. Fredrick Katende*. Each has a story, a target, an optional amount raised and one official donation link. The Donate button always opens that link, and the site never collects money itself.

- **Amount raised** is typed in by an admin. Set **Amount correct as of** each time, and the page shows that date. Leave the amount empty to show the target alone.
- **Feature on the homepage** puts the campaign in a band under the hero.
- To finish a campaign, set **Campaign status** to *Goal reached* or *Closed* (the page stays up with a thank-you and no Donate button), or set **Publication** to *Archived* to take the page down.
- **Updates** (open a campaign, then *Updates*) are short dated notes shown on the campaign page.

## Roles

| Role | Can do |
|---|---|
| Super admin | Everything, including users, settings and the audit log |
| Club admin | Content, events, people, projects, members, attendance, settings |
| Attendance officer | QR sessions, corrections, reports, member records |
| Editor | Stories, projects, events, media, imports, review queue |
| Member | Own profile and own attendance |

## Privacy

Public: name, photo, profession, skills, bio, social links, leadership, projects. Never public: phone, private email, member ID, PIN, attendance, internal notes. Members can hide their own profile. Admins control profile visibility. Attendance appears publicly only as aggregate figures on year pages.
