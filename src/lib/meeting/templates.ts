import type { AttendanceRecord, Meeting } from "@prisma/client";
import { MEETING } from "./config";

export type Variant = "member" | "visitor" | "prospect";
type NextEvent = { title: string; slug: string; date: Date; startTime: Date | null; venue: string | null } | null;
export type TemplateInput = {
  record: Pick<AttendanceRecord, "name" | "isGuest" | "affiliation" | "clubName">;
  meeting: Pick<Meeting, "title" | "date" | "venue">;
  next: NextEvent;
  regular: { weekdayName: string; time: string; venue: string };
  siteUrl: string;
  cardAttached: boolean;
  fmt: { longDate: (d: Date) => string; clock: (d: Date) => string };
};

export function variantOf(r: Pick<AttendanceRecord, "isGuest" | "affiliation" | "clubName">): Variant {
  if (!r.isGuest) return "member";
  if ((r.affiliation === "ROTARIAN" || r.affiliation === "ROTARACTOR") && r.clubName) return "visitor";
  return "prospect";
}

export const esc = (s: string | null | undefined) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

const firstName = (n: string) => n.trim().split(/\s+/)[0] || n;
/** "the Rotaract Club of Gayaza", or the typed name as given. */
const theClub = (c: string) => (/^rot(ary|aract)\b/i.test(c) ? `the ${c}` : c);

export function subjectFor(v: Variant) {
  return v === "member" ? "Thank you for attending today's meeting" : `Thank you for visiting the ${MEETING.CLUB_NAME}`;
}

/** The three thank-you emails, as HTML (table layout for email clients) and plain text. Every user value is escaped. */
export function buildThankYou(t: TemplateInput) {
  const v = variantOf(t.record);
  const first = firstName(t.record.name);
  const when = t.fmt.longDate(t.meeting.date);
  const regular = `every ${t.regular.weekdayName} at ${t.regular.time}, ${t.regular.venue}`;
  const heading = v === "member" ? `Thank you for coming, ${first}.` : v === "visitor" ? `Thank you for visiting, ${first}.` : `Thank you for joining us, ${first}.`;

  // Paragraphs as [html, text] pairs
  const paras: [string, string][] = [];
  if (v === "member") {
    paras.push([`Your attendance at <strong>${esc(t.meeting.title)}</strong> on ${esc(when)} has been recorded.`, `Your attendance at ${t.meeting.title} on ${when} has been recorded.`]);
    paras.push([`See you at our next meeting: ${esc(regular)}.`, `See you at our next meeting: ${regular}.`]);
  } else if (v === "visitor") {
    const club = theClub(t.record.clubName!);
    paras.push([`Thank you for bringing the fellowship of ${esc(club)} to <strong>${esc(t.meeting.title)}</strong> on ${esc(when)}.`, `Thank you for bringing the fellowship of ${club} to ${t.meeting.title} on ${when}.`]);
    paras.push(
      t.cardAttached
        ? ["Your <strong>make-up card is attached</strong> as a PDF. Share it with your club secretary so the visit counts toward your attendance.", "Your make-up card is attached as a PDF. Share it with your club secretary so the visit counts toward your attendance."]
        : ["If you need a make-up card for your club secretary, reply to this email and we'll send one.", "If you need a make-up card for your club secretary, reply to this email and we'll send one."],
    );
    paras.push([`You are always welcome back: we meet ${esc(regular)}.`, `You are always welcome back: we meet ${regular}.`]);
  } else {
    paras.push([`We hope you enjoyed <strong>${esc(t.meeting.title)}</strong> on ${esc(when)}.`, `We hope you enjoyed ${t.meeting.title} on ${when}.`]);
    paras.push(["Rotaract is about friendship and service that make a lasting difference in our communities, and there is a place for you in it.", "Rotaract is about friendship and service that make a lasting difference in our communities, and there is a place for you in it."]);
    paras.push([
      `To find out more about joining, reply to this email or visit <a href="${esc(t.siteUrl)}/get-involved?type=JOIN" style="color:#0067C8">our website</a>.`,
      `To find out more about joining, reply to this email or visit ${t.siteUrl}/get-involved?type=JOIN`,
    ]);
    paras.push([`You are always welcome back: we meet ${esc(regular)}.`, `You are always welcome back: we meet ${regular}.`]);
  }

  let coming = "";
  let comingText = "";
  if (t.next) {
    const start = t.next.startTime ?? t.next.date;
    const line = [t.fmt.longDate(start), t.next.startTime ? t.fmt.clock(t.next.startTime) : null, t.next.venue].filter(Boolean).join(" · ");
    const url = `${t.siteUrl}/events/${t.next.slug}`;
    coming = `<tr><td style="padding:8px 32px 0"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#e6eef8;border-left:4px solid #F7A81B"><tr><td style="padding:14px 16px;font-family:Arial,Helvetica,sans-serif">
      <div style="font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#54565A;font-weight:bold">Coming up</div>
      <div style="font-size:16px;font-weight:bold;color:#17458F;margin-top:4px"><a href="${esc(url)}" style="color:#17458F;text-decoration:none">${esc(t.next.title)}</a></div>
      <div style="font-size:13px;color:#54565A;margin-top:2px">${esc(line)}</div></td></tr></table></td></tr>`;
    comingText = `\nComing up: ${t.next.title}\n${line}\n${url}\n`;
  }

  const logo = `${t.siteUrl}${MEETING.LOGO_PNG}`;
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(subjectFor(v))}</title></head>
<body style="margin:0;padding:0;background:#e6eef8">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#e6eef8"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-top:6px solid #17458F;border-bottom:4px solid #F7A81B">
<tr><td style="padding:28px 32px 8px"><img src="${esc(logo)}" alt="${esc(MEETING.CLUB_NAME)}" height="44" style="display:block;height:44px;width:auto;border:0"></td></tr>
<tr><td style="padding:12px 32px 4px;font-family:Arial,Helvetica,sans-serif;font-size:24px;line-height:1.25;font-weight:bold;color:#17458F">${esc(heading)}</td></tr>
${paras.map(([h]) => `<tr><td style="padding:10px 32px 0;font-family:Georgia,'Times New Roman',serif;font-size:17px;line-height:1.55;color:#222">${h}</td></tr>`).join("\n")}
${coming}
<tr><td style="padding:22px 32px 26px;font-family:Georgia,'Times New Roman',serif;font-size:16px;line-height:1.5;color:#222">With warm regards,<br><strong>${esc(MEETING.CLUB_NAME)}</strong><br><span style="font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#54565A">Rotary District ${esc(MEETING.DISTRICT)} · Service Above Self</span></td></tr>
</table>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px"><tr><td style="padding:14px 32px;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.5;color:#54565A;text-align:center">You are receiving this because you signed in at a ${esc(MEETING.CLUB_NAME)} meeting.<br><a href="${esc(t.siteUrl)}" style="color:#54565A">${esc(t.siteUrl.replace(/^https?:\/\//, ""))}</a></td></tr></table>
</td></tr></table></body></html>`;

  const text = `${heading}\n\n${paras.map(([, x]) => x).join("\n\n")}\n${comingText}\nWith warm regards,\n${MEETING.CLUB_NAME}\nRotary District ${MEETING.DISTRICT} · Service Above Self\n\n--\nYou are receiving this because you signed in at a ${MEETING.CLUB_NAME} meeting.\n${t.siteUrl}\n`;
  return { variant: v, subject: subjectFor(v), html, text };
}
