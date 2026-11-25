# Rotaract Club Kampala North: website, archive & club platform

The public face, living archive and internal tools of **Rotaract Club Kampala North** (Rotary District 9213, Uganda).

- **Public site:** a magazine-style homepage, Our Story timeline, project journeys (Need → Idea → … → Impact today, with Then → Now photos), people & skills directory, leadership by year, past presidents, a "Year That Was" page for each year, events with organizer labels, district visits with a countdown, stories (including imported social posts), photo and video archive, achievements & impact, global search, and Get Involved enquiries.
- **Meeting sign-in:** one permanent QR code at the venue opens `/attend`. Members, visiting Rotarians and Rotaractors, and prospective members sign in with a name and an email or phone, with no account needed, and get a thank-you email (visitors also get a make-up card PDF). Members who activate an account once (Member ID + PIN) see their own attendance under My account.
- **Admin CMS:** about 25 content types with role-based access, a Needs Review queue (approve, edit, reject, merge duplicates, mark verified), Import Post → convert into a story, milestone, achievement, event, album or member spotlight, bulk photo upload with automatic optimisation, meeting sign-in (printable QR poster, live attendance lists, visiting-club and member attendance reports, thank-you emails), CSV/Excel/print exports, automated event discovery, and an audit log.

Stack: Next.js 15 (App Router, server-rendered) · TypeScript · Tailwind CSS 4 · PostgreSQL + Prisma 6 · Recharts · sharp · exceljs · qrcode · pdf-lib · Resend (email).

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

Optional demo data for trying the meeting sign-in reports. It adds 24 obviously fake "Demo Member" records and 20 past "[Demo]" weekly meetings with members and a few visitors:

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
              │    └─ Meeting (one per day) ── AttendanceRecord (member or visitor)
              ├─ Story ← SocialPost (converted)      ├─ DistrictVisit
              ├─ Achievement · HistoryEntry (Our Story)
              └─ PhotoAlbum ── Media · Document
```

Every researched or imported record keeps its provenance: `source`, `sourceUrl`, `sourceType`, `externalId`, `discoveredAt` / `importedAt`, `lastCheckedAt`, `verification` (`VERIFIED`, `NEEDS_VERIFICATION`, `CONFLICTING`, `UNVERIFIED`), `verifiedAt` and `verifiedById`. Anything not yet verified shows a dashed "Needs verification" or "Sources conflict" tag on the public site. Records are filed into a Rotaract year (1 July – 30 June) automatically from their date.

## Running the club from the admin area

- **Dashboard** (`/admin`): quick buttons for the common jobs (add a project, member, business, event or story, update leadership, upload photos, attendance), headline numbers, a to-do list (for example business listings waiting to be published) and the current fundraising appeal.
- **Preview before publishing:** save anything as a *Draft*, then use **Preview** on its admin page. Signed-in admins see the real page with a yellow "Preview" bar; everyone else gets "page not found" until it's published. This works for projects, stories, events, campaigns, businesses and hidden profiles.
- **Members** (`/admin/members`): the private register, with search and status filters (Active, Pending, Inactive, Alumni, Honorary, Archived). Archiving hides a former member from the list without deleting anything.
  - **Export CSV** downloads the current view: contact details, profession, skills, committees, this year's club role and whether the member has activated an account. The file opens cleanly in Excel (UTF-8, cells starting with = + - @ are prefixed with ' so they can't run as formulas).
  - **Import from a spreadsheet** takes a CSV with a Name column (plus any of Member ID, Status, Email, Phone, Membership date, Profession, Organisation, Notes) and shows what will happen to every row before anything is saved. Rows are matched to existing members by Member ID, email or phone, so re-importing never duplicates anyone; a new member whose name matches exactly one existing member profile is linked to it. Members' own profile edits are never overwritten.
- **Members manage their own listing:** under **My account → Your business listings**, a member can add or edit a business they run. New listings wait for an admin to publish them; edits to a published listing go live straight away.

## Member businesses

**Admin → Member businesses** lists businesses run by members and the club's corporate members: name, logo, category, services (one per line), description, location, website, an enquiry link and social links, plus the member behind it. Listings start as drafts and appear at `/businesses` once published; visitors can search and filter by type and category. A member's public profile shows their listings, and the homepage shows up to three (featured ones first) as soon as one is published. Enter only details the member has agreed to share.

## Before & after comparisons

Open a project in the admin area and choose **Before & after** to add a draggable comparison: upload a Before and an After photo (and optionally a During photo for three stages), with labels, dates and a caption. A project can have several, shown in the order of their **Order on the page** number. Visitors drag on the photo, use the arrow keys, or open it full screen. Projects with no comparison set up still show a slider built from photos tagged with a Then → Now phase.

## Fundraising campaigns

**Admin → Fundraising campaigns** holds appeals such as *Save Dr. Fredrick Katende*. Each has a story, a target, an optional amount raised and one official donation link. The Donate button always opens that link, and the site never collects money itself.

- **Amount raised** is typed in by an admin. Set **Amount correct as of** each time, and the page shows that date. Leave the amount empty to show the target alone.
- **Feature on the homepage** puts the campaign in a band under the hero.
- To finish a campaign, set **Campaign status** to *Goal reached* or *Closed* (the page stays up with a thank-you and no Donate button), or set **Publication** to *Archived* to take the page down.
- **Updates** (open a campaign, then *Updates*) are short dated notes shown on the campaign page.

## Meeting sign-in

**Admin → Meeting sign-in** (`/admin/attendance`) runs attendance for every meeting. Club admins and attendance officers can use it.

**Before the first meeting**

1. Choose **Print poster** and print it on A4. The QR code points at `/attend` and never changes, so the same poster works every week. **Download PNG** and **SVG** give the code for slides or WhatsApp; **Copy link** gives the address.
2. Check the meeting day, time and venue under **Settings**. If they are blank, the sign-in uses Friday, 6:00 PM at Hotel Triangle, Buganda Road.

**At a meeting**

- People scan the code, choose *Member*, *Visiting Rotarian or Rotaractor* or *Prospective member*, and enter their name and an email or phone. Visitors pick their club from the District 9213 and 9214 list or type it in. The phone remembers their details for next week.
- The first sign-in of the day creates that day's meeting. On the meeting day it is called *Weekly meeting*. If a published club event is on that day, the meeting takes the event's title. Any other day it is a *Club gathering*. Rename it from its page if needed.
- Signing in twice updates the same line instead of adding another. A member is matched to the register by email or phone.
- The meeting's page refreshes itself during the meeting. From there you can **Add someone** by hand (for people without a phone), remove a line, preview each person's email, download a visitor's make-up card, send or re-send an email, and **Send pending** emails.

**Reports:** the overview shows attendance over time, visiting clubs (this Rotary year or all time), and each member's attendance at weekly meetings this Rotary year. **Download CSV** exports one meeting or all of them, and opens cleanly in Excel. Every change, email and export is recorded in the audit log.

**Thank-you emails** go out through [Resend](https://resend.com) a few seconds after someone signs in, with replies going to hello@kanosug.org. Members get a thank-you, visitors a thank-you with their make-up card attached, and prospective members a welcome with the next club event. Each line shows *Sent*, *Failed* (with Resend's reason) or *Not sent* (emails are off). Set these in Coolify, never in the repository:

| Variable | What it does |
|---|---|
| `RESEND_API_KEY` | Resend API key. Without it, sign-in still works and emails are simply not sent. |
| `EMAIL_FROM` | Sender, for example `Rotaract Club Kampala North <hello@kanosug.org>`. The domain must be verified in Resend. |
| `ATTENDANCE_EMAILS` | Set to `false` to switch thank-you emails off without removing the key. |
| `RESEND_API_URL` | Testing only: send to a mock server instead of Resend. Leave unset in production. |

To test emails safely, sign in as a visitor with the address `delivered@resend.dev` (Resend accepts it without sending it to a real person), check the line says *Sent* and the email appears in the Resend dashboard, then remove that line.

**Abuse protection:** each network address can make 120 sign-ins an hour (the venue Wi-Fi puts everyone behind one address), and a hidden field catches bots.

**Visiting clubs:** the list is `src/data/clubs.json` (Rotary and Rotaract clubs of Districts 9213 and 9214). Edit that file to add or correct a club; typed-in clubs that aren't listed are kept as typed.

## Roles

| Role | Can do |
|---|---|
| Super admin | Everything, including users, settings and the audit log |
| Club admin | Content, events, people, projects, members, attendance, settings |
| Attendance officer | Meeting sign-in: QR poster, attendance lists and corrections, thank-you emails, reports, member records |
| Editor | Stories, projects, events, media, imports, review queue |
| Member | Own profile and own attendance |

## Privacy

Public: name, photo, profession, skills, bio, social links, leadership, projects. Never public: phone, private email, member ID, PIN, attendance, visitors' sign-in details, internal notes. Members can hide their own profile. Admins control profile visibility. Attendance appears publicly only as aggregate figures on year pages.
