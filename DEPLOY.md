# Deploying on a private VPS with Coolify

The app ships as a standard Docker image (`Dockerfile`, Next.js standalone output). It does not depend on Vercel. On every start the container applies pending database migrations, then starts the server on port 3000.

## 1. Create the database

In Coolify go to **+ New → Database → PostgreSQL 16**, in the same project/environment as the app.

- Note the **internal** connection URL, e.g. `postgresql://postgres:…@<db-uuid>:5432/postgres`.
- Turn on **Scheduled backups** for this database (see §6).

## 2. Create the application

Go to **+ New → Application**, pick the Git repository with this code, and set **Build pack: Dockerfile**.

- Port: **3000**
- Domain: e.g. `https://kampalanorthrotaract.org` (Coolify issues the TLS certificate)
- Health check path: **/api/health** (the image also defines its own `HEALTHCHECK`)

### Environment variables

| Variable | Value |
|---|---|
| `DATABASE_URL` | Internal Postgres URL from step 1, ending in `?schema=public` |
| `APP_URL` | The public URL, e.g. `https://kampalanorthrotaract.org`. Used in QR codes, canonical URLs and the sitemap. |
| `SESSION_SECRET` | `openssl rand -hex 32`. Signs QR grants and rotating codes, so keep it stable. |
| `CRON_SECRET` | `openssl rand -hex 24` |
| `STORAGE_DRIVER` | `local` (default) or `s3` |
| `STORAGE_LOCAL_DIR` | `/app/storage` |
| `SEED_ON_START` | `true` for the **first** deploy only, then set back to `false` |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | First super-admin, created by the seed if the email doesn't exist yet. Remove after first login. |

### Persistent storage for media (important)

Under **Storages → Add volume**, mount a volume at **`/app/storage`**. Uploaded photos (four WebP sizes each), videos and documents live there. Without the volume, uploads are lost on redeploy.

## 3. First deploy

1. Deploy with `SEED_ON_START=true`. Logs should show `Applying database migrations`, then `Seeding…`, then `Seed complete`.
2. Sign in at `/login` with `ADMIN_EMAIL` and `ADMIN_PASSWORD`, then change the password under **Account**.
3. Set `SEED_ON_START=false` and remove `ADMIN_PASSWORD`. The seed is idempotent, but leaving it on would recreate seeded records that an admin deliberately deleted.
4. Visit `/api/health`. It should return `{"status":"ok","db":"ok"}`.

Alternative to the env-var admin: open the app's **Terminal** in Coolify and run
`tsx scripts/create-admin.ts you@example.com 'strong-password' SUPER_ADMIN`.

## 4. Scheduled jobs (event discovery + housekeeping)

In the application go to **Scheduled Tasks → Add**:

- **Command:** `node -e "fetch('http://127.0.0.1:3000/api/cron/discover',{method:'POST',headers:{Authorization:'Bearer '+process.env.CRON_SECRET}}).then(r=>r.text()).then(console.log)"`
- **Frequency:** `0 */6 * * *` (every 6 hours)

Each run:

- checks every active event source (ICS, RSS or JSON Feed)
- matches events it has seen before
- detects duplicates across sources (similar title, ±1 day, organizer and venue)
- categorises new events and stores their provenance
- publishes events from **trusted** sources and sends the rest to **Needs review**
- marks past events completed
- closes expired QR sessions
- rolls the Rotaract year over on 1 July

Add sources under **Admin → Event sources** (the seed adds three inactive placeholders). Ask the district secretariat for an iCalendar link. Any Google Calendar's "Secret/Public address in iCal format" works. Instagram, X and HTML pages are deliberately never scraped. Use **Admin → Import post** for those.

## 5. Media on S3-compatible storage (optional, later)

Set `STORAGE_DRIVER=s3` plus `S3_ENDPOINT`, `S3_REGION`, `S3_BUCKET`, `S3_ACCESS_KEY_ID` and `S3_SECRET_ACCESS_KEY`. Add `S3_PUBLIC_URL` if the bucket or CDN is public; otherwise files are proxied through `/media/…`. This works with MinIO (it can run inside Coolify), Cloudflare R2, Backblaze B2 and Wasabi. To migrate existing files, copy `/app/storage/*` into the bucket with the same keys (for example with `rclone copy`). Database rows store keys, not URLs, so nothing else changes.

## 6. Backups

- **Database:** use Coolify's PostgreSQL **Scheduled backups** (daily, keep 14+). Point them at S3 for off-site copies. For a manual dump: `pg_dump -Fc "$DATABASE_URL" > kanos-$(date +%F).dump`. To restore: `pg_restore --clean -d "$DATABASE_URL" kanos-….dump`.
- **Media:** back up the `/app/storage` volume (or the S3 bucket) on the same schedule. For example, a host cron job: `tar czf /backups/kanos-media-$(date +%F).tgz -C /var/lib/docker/volumes/<volume>/_data .`
- Test a restore once a term. The archive is the point of this site.

## 7. Updating

Push to the deployed branch, and Coolify rebuilds. Migrations in `prisma/migrations` are applied automatically on start. When you change `prisma/schema.prisma` during development, run `npx prisma migrate dev --name <change>` and commit the new migration folder.

## Option B: Docker Compose

`docker-compose.yml` runs the app and Postgres together with named volumes. In Coolify go to **+ New → Docker Compose**, then set `POSTGRES_PASSWORD`, `APP_URL`, `SESSION_SECRET` and `CRON_SECRET`, and expose the `app` service on port 3000.

## Troubleshooting

- **QR codes point to localhost:** `APP_URL` is wrong. Fix it and redeploy.
- **Members get logged out or the QR says "expired" right after a redeploy:** `SESSION_SECRET` changed. Keep it constant.
- **"Check-in is only available on the venue network":** the session has an IP allowlist. Remove it, or add the venue's public IP prefix.
- **Uploads fail with a 413 error:** raise the proxy body limit in Coolify (Traefik/Caddy). The app accepts up to 25 MB per request.
