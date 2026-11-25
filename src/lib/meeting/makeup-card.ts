import "server-only";
import fs from "node:fs/promises";
import path from "node:path";
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { MEETING } from "./config";
import { localParts, longDate } from "./today";

const ROYAL = rgb(0x17 / 255, 0x45 / 255, 0x8f / 255);
const GOLD = rgb(0xf7 / 255, 0xa8 / 255, 0x1b / 255);
const PALE = rgb(0xe6 / 255, 0xee / 255, 0xf8 / 255);
const FRAME = rgb(0xc9 / 255, 0xd7 / 255, 0xec / 255);
const GREY = rgb(0x54 / 255, 0x56 / 255, 0x5a / 255);
const INK = rgb(0.13, 0.13, 0.13);

/** Plain-ASCII version of a string ("José Nakato" → "Jose Nakato"): used for file names. */
export function asciiFold(s: string) {
  return s
    .replace(/ß/g, "ss").replace(/[æÆ]/g, (c) => (c === "æ" ? "ae" : "AE")).replace(/[øØ]/g, (c) => (c === "ø" ? "o" : "O")).replace(/[łŁ]/g, (c) => (c === "ł" ? "l" : "L"))
    .replace(/[‘’‚‛]/g, "'").replace(/[“”„‟]/g, '"').replace(/[‐‑‒–—―]/g, "-").replace(/…/g, "...")
    .normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7e]/g, "");
}

// The standard PDF fonts use WinAnsi: ASCII, Latin-1 (é, ë, à, ñ, ü …) and these extras.
const WIN_ANSI_EXTRA = "€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ";
const encodable = (ch: string) => {
  const c = ch.codePointAt(0) ?? 0;
  return (c >= 0x20 && c <= 0x7e) || (c >= 0xa0 && c <= 0xff) || WIN_ANSI_EXTRA.includes(ch);
};
const FOLD: Record<string, string> = { ł: "l", Ł: "L", đ: "d", Đ: "D", ı: "i", "‐": "-", "‑": "-", "‒": "-", "―": "-", "‛": "'", "‟": '"' };

/** Keeps every character the card's fonts can print (so "Zoë" stays "Zoë") and folds the rest. */
export function pdfSafe(s: string) {
  let out = "";
  for (const ch of s.normalize("NFC").replace(/\s+/g, " ")) {
    if (encodable(ch)) out += ch;
    else out += FOLD[ch] ?? [...ch.normalize("NFKD").replace(/[\u0300-\u036f]/g, "")].filter(encodable).join("");
  }
  return out.replace(/ {2,}/g, " ").trim();
}

const ymd = (d: Date) => localParts(d).iso;
export const cardNumber = (recordId: string, meetingDate: Date) => `${MEETING.CLUB_CODE}-${ymd(meetingDate).replace(/-/g, "")}-${recordId.slice(-6).toUpperCase()}`;
export const cardFilename = (name: string, meetingDate: Date) =>
  `make-up-card-${asciiFold(name).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "visitor"}-${ymd(meetingDate)}.pdf`;

function wrap(text: string, font: PDFFont, size: number, width: number) {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(" ")) {
    const next = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(next, size) > width && line) {
      lines.push(line);
      line = word;
    } else line = next;
  }
  if (line) lines.push(line);
  return lines;
}

function spaced(page: PDFPage, text: string, rightX: number, y: number, font: PDFFont, size: number, tracking: number, color = GOLD) {
  const width = [...text].reduce((w, ch) => w + font.widthOfTextAtSize(ch, size) + tracking, -tracking);
  let x = rightX - width;
  for (const ch of text) {
    page.drawText(ch, { x, y, size, font, color });
    x += font.widthOfTextAtSize(ch, size) + tracking;
  }
}

export type CardData = { recordId: string; name: string; affiliation: "ROTARIAN" | "ROTARACTOR"; clubName: string; meetingTitle: string; meetingDate: Date; venue: string | null };

/** A5 landscape make-up card (595 × 420 pt), built on the server. No signature. */
export async function makeupCardPdf(c: CardData): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(pdfSafe(`Make-up card: ${c.name}`));
  doc.setAuthor(MEETING.CLUB_NAME);
  const page = doc.addPage([595, 420]);
  const [sans, bold, italic] = await Promise.all([doc.embedFont(StandardFonts.Helvetica), doc.embedFont(StandardFonts.HelveticaBold), doc.embedFont(StandardFonts.TimesRomanItalic)]);
  const W = 595, H = 420, L = 40, R = W - 40, inner = R - L;

  page.drawRectangle({ x: 0, y: H - 10, width: W, height: 10, color: ROYAL });
  page.drawRectangle({ x: 0, y: 0, width: W, height: 6, color: GOLD });
  page.drawRectangle({ x: 16, y: 20, width: W - 32, height: H - 46, borderColor: FRAME, borderWidth: 0.8 });

  // Logo (or the club name if the file can't be read)
  let logoDrawn = false;
  try {
    const png = await fs.readFile(path.join(process.cwd(), "public", MEETING.LOGO_PNG));
    const img = await doc.embedPng(png);
    const h = 46, w = (img.width / img.height) * h;
    page.drawImage(img, { x: L, y: H - 34 - h, width: w, height: h });
    logoDrawn = true;
  } catch {
    /* fall through */
  }
  if (!logoDrawn) page.drawText(pdfSafe(MEETING.CLUB_NAME), { x: L, y: H - 62, size: 14, font: bold, color: ROYAL });

  spaced(page, "MAKE-UP CARD", R, H - 50, bold, 12, 2.2);
  const no = `No. ${cardNumber(c.recordId, c.meetingDate)}`;
  page.drawText(no, { x: R - sans.widthOfTextAtSize(no, 8.5), y: H - 64, size: 8.5, font: sans, color: GREY });

  let y = H - 128;
  page.drawText("This is to certify that", { x: L, y, size: 14, font: italic, color: GREY });

  const name = pdfSafe(c.name) || "Visitor";
  let size = 30;
  while (size > 14 && bold.widthOfTextAtSize(name, size) > inner) size -= 1;
  y -= size + 10;
  page.drawText(name, { x: L, y, size, font: bold, color: ROYAL });

  y -= 22;
  const who = pdfSafe(`${c.affiliation === "ROTARIAN" ? "Rotarian" : "Rotaractor"}, ${c.clubName}`);
  for (const line of wrap(who, sans, 12, inner)) {
    page.drawText(line, { x: L, y, size: 12, font: sans, color: INK });
    y -= 16;
  }
  y -= 4;
  for (const line of wrap(pdfSafe(`attended the meeting of the ${MEETING.CLUB_NAME}, Rotary District ${MEETING.DISTRICT} (Club ID ${MEETING.CLUB_ID}):`), sans, 11, inner)) {
    page.drawText(line, { x: L, y, size: 11, font: sans, color: INK });
    y -= 15;
  }

  // Meeting box
  const detail = pdfSafe([longDate(c.meetingDate), c.venue].filter(Boolean).join(" · "));
  const boxH = 44;
  y -= boxH - 6;
  page.drawRectangle({ x: L, y, width: inner, height: boxH, color: PALE });
  page.drawRectangle({ x: L, y, width: 4, height: boxH, color: GOLD });
  page.drawText(wrap(pdfSafe(c.meetingTitle), bold, 12, inner - 28)[0] || "", { x: L + 14, y: y + 26, size: 12, font: bold, color: ROYAL });
  page.drawText(wrap(detail, sans, 10, inner - 28)[0] || "", { x: L + 14, y: y + 10, size: 10, font: sans, color: GREY });

  // Footer
  page.drawText(pdfSafe(MEETING.CLUB_NAME), { x: L, y: 52, size: 9, font: bold, color: INK });
  page.drawText(`Rotary District ${MEETING.DISTRICT}`, { x: L, y: 40, size: 8.5, font: sans, color: GREY });
  page.drawText("Issued electronically from the club's attendance register.", { x: L, y: 28, size: 8.5, font: italic, color: GREY });
  const sas = "Service Above Self";
  page.drawText(sas, { x: R - italic.widthOfTextAtSize(sas, 13), y: 34, size: 13, font: italic, color: ROYAL });

  return doc.save();
}
