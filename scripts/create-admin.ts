/** Usage: npm run create-admin -- you@example.com 'a-strong-password' [ROLE] */
import { PrismaClient, type Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();
(async () => {
  const [email, password, role = "SUPER_ADMIN"] = process.argv.slice(2);
  if (!email || !password || password.length < 8) {
    console.error("Usage: npm run create-admin -- email password(8+ chars) [SUPER_ADMIN|CLUB_ADMIN|ATTENDANCE_OFFICER|EDITOR]");
    process.exit(1);
  }
  const passwordHash = await bcrypt.hash(password, 12);
  const u = await db.user.upsert({ where: { email: email.toLowerCase() }, create: { email: email.toLowerCase(), passwordHash, role: role as Role }, update: { passwordHash, role: role as Role, active: true } });
  console.log(`✓ ${u.email} is now ${u.role}`);
  await db.$disconnect();
})();
