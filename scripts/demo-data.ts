/**
 * DEMO DATA for local testing only. Creates obviously fake members ("Demo Member 01"…)
 * and past attendance sessions so the dashboards have something to show.
 * Remove with: npm run demo -- --clear
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";

const db = new PrismaClient();
const tok = (n = 12) => crypto.randomBytes(n).toString("base64url");

(async () => {
  if (process.argv.includes("--clear")) {
    const ms = await db.member.findMany({ where: { memberNumber: { startsWith: "DEMO-" } } });
    await db.user.deleteMany({ where: { memberId: { in: ms.map((m) => m.id) } } });
    await db.person.deleteMany({ where: { id: { in: ms.map((m) => m.personId) } } });
    await db.attendanceSession.deleteMany({ where: { title: { startsWith: "[Demo]" } } });
    console.log(`Removed ${ms.length} demo members and demo sessions.`);
    return db.$disconnect();
  }
  const pinHash = await bcrypt.hash("1234", 10);
  const skills = await db.skill.findMany();
  const members = [];
  for (let i = 1; i <= 24; i++) {
    const n = String(i).padStart(2, "0");
    const person = await db.person.upsert({
      where: { slug: `demo-member-${n}` },
      update: {},
      create: { slug: `demo-member-${n}`, name: `Demo Member ${n}`, type: "MEMBER", isPublic: false, verification: "VERIFIED", sourceType: "DEMO", skills: { connect: [skills[i % skills.length], skills[(i * 7) % skills.length]].map((s) => ({ id: s.id })) } },
    });
    const m = await db.member.upsert({
      where: { memberNumber: `DEMO-${n}` },
      update: {},
      create: { personId: person.id, memberNumber: `DEMO-${n}`, status: i > 22 ? "INACTIVE" : "ACTIVE", membershipDate: new Date(Date.UTC(2025, i % 12, 1)), pinHash },
    });
    members.push(m);
  }
  // 30 past weekly sessions, attendance probability varies per member
  for (let w = 30; w >= 1; w--) {
    const startsAt = new Date(Date.now() - w * 7 * 86400000);
    startsAt.setUTCHours(15, 0, 0, 0);
    const s = await db.attendanceSession.create({
      data: { title: `[Demo] Weekly fellowship`, type: w % 6 === 0 ? "PROFESSIONAL_DEVELOPMENT" : w % 9 === 0 ? "COMMUNITY_OUTREACH" : "CLUB_MEETING", startsAt, opensAt: new Date(startsAt.getTime() - 1800000), closesAt: new Date(startsAt.getTime() + 3 * 3600000), token: tok(), secret: tok(24), closed: true },
    });
    for (const [i, m] of members.entries()) {
      if (m.status !== "ACTIVE") continue;
      const p = 0.35 + ((i * 37) % 60) / 100;
      if (Math.random() < p && startsAt >= (m.membershipDate || new Date(0))) {
        await db.attendanceRecord.create({ data: { sessionId: s.id, memberId: m.id, checkedInAt: new Date(startsAt.getTime() + Math.random() * 3600000), method: Math.random() < 0.7 ? "QR_ACCOUNT" : "QR_PIN" } });
      }
    }
  }
  console.log("Demo data created: 24 members (PIN 1234), 30 sessions.");
  await db.$disconnect();
})();
