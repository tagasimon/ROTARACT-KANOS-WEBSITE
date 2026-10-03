import "server-only";
import { cache } from "react";
import { db } from "./db";

/** Rotary/Rotaract year runs 1 July – 30 June. */
export function rotaryYearBounds(date: Date) {
  const y = date.getUTCMonth() >= 6 ? date.getUTCFullYear() : date.getUTCFullYear() - 1;
  return {
    startYear: y,
    label: `${y}–${y + 1}`,
    slug: `${y}-${y + 1}`,
    startDate: new Date(Date.UTC(y, 6, 1)),
    endDate: new Date(Date.UTC(y + 1, 5, 30, 23, 59, 59)),
  };
}

export const getCurrentYear = cache(async () => {
  const flagged = await db.rotaractYear.findFirst({ where: { isCurrent: true } });
  if (flagged) return flagged;
  const now = new Date();
  return db.rotaractYear.findFirst({ where: { startDate: { lte: now }, endDate: { gte: now } } });
});

/** Find (or create) the Rotaract year containing a date — used to auto-file records. */
export async function yearIdForDate(date?: Date | null, create = true) {
  if (!date) return null;
  const b = rotaryYearBounds(date);
  const found = await db.rotaractYear.findUnique({ where: { slug: b.slug } });
  if (found) return found.id;
  if (!create) return null;
  const y = await db.rotaractYear.create({ data: { label: b.label, slug: b.slug, startDate: b.startDate, endDate: b.endDate } });
  return y.id;
}
