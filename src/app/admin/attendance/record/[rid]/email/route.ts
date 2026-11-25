import { getCurrentUser } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { composeFor, emailOffReason } from "@/lib/meeting/email";
import { esc } from "@/lib/meeting/templates";
import { MEETING } from "@/lib/meeting/config";

export const dynamic = "force-dynamic";

/** The exact email this person gets, with a banner showing who it goes to. Nothing can run in it. */
export async function GET(_: Request, { params }: { params: Promise<{ rid: string }> }) {
  const user = await getCurrentUser();
  if (!user || !can(user.role, "attendance")) return new Response("Not allowed", { status: 403 });
  const mail = await composeFor((await params).rid);
  if (!mail) return new Response("Not found", { status: 404 });
  const off = emailOffReason();
  const banner = `<div style="font:14px/1.5 Arial,Helvetica,sans-serif;background:#fff8e6;border-bottom:2px solid #F7A81B;padding:12px 16px;color:#222">
<strong>Preview</strong> (${esc(mail.variant)} email)${off ? ` · <span style="color:#a01045">Emails are off: ${esc(off)}</span>` : ""}<br>
<strong>To:</strong> ${esc(mail.to || "(no email address)")} · <strong>Reply-to:</strong> ${esc(MEETING.CLUB_EMAIL)}<br>
<strong>Subject:</strong> ${esc(mail.subject)}<br>
<strong>Attachment:</strong> ${mail.card ? esc(mail.card.filename) : "none"}</div>`;
  const html = mail.html.replace(/<body([^>]*)>/, `<body$1>${banner}`);
  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Security-Policy": "default-src 'none'; img-src * data:; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'; frame-ancestors 'self'",
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex",
    },
  });
}
