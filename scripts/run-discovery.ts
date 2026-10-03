/** Trigger event discovery + housekeeping via the app's cron endpoint. Usage: npm run discover */
(async () => {
  const base = (process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "");
  const r = await fetch(`${base}/api/cron/discover`, { method: "POST", headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` } });
  console.log(r.status, await r.text());
  process.exit(r.ok ? 0 : 1);
})();
