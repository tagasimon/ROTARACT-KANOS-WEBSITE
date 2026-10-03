import type { Role } from "@prisma/client";

export const ADMIN_ROLES: Role[] = ["SUPER_ADMIN", "CLUB_ADMIN", "ATTENDANCE_OFFICER", "EDITOR"];

export type Area =
  | "dashboard"
  | "content" // stories, projects, milestones, metrics, media, albums, history, achievements, social
  | "events"
  | "people" // people profiles, leadership, years, committees, skills, organizations
  | "members" // private member records
  | "attendance"
  | "review"
  | "inquiries"
  | "settings"
  | "users"
  | "audit";

const MATRIX: Record<Area, Role[]> = {
  dashboard: ["SUPER_ADMIN", "CLUB_ADMIN", "ATTENDANCE_OFFICER", "EDITOR"],
  content: ["SUPER_ADMIN", "CLUB_ADMIN", "EDITOR"],
  events: ["SUPER_ADMIN", "CLUB_ADMIN", "EDITOR"],
  people: ["SUPER_ADMIN", "CLUB_ADMIN"],
  members: ["SUPER_ADMIN", "CLUB_ADMIN", "ATTENDANCE_OFFICER"],
  attendance: ["SUPER_ADMIN", "CLUB_ADMIN", "ATTENDANCE_OFFICER"],
  review: ["SUPER_ADMIN", "CLUB_ADMIN", "EDITOR"],
  inquiries: ["SUPER_ADMIN", "CLUB_ADMIN"],
  settings: ["SUPER_ADMIN", "CLUB_ADMIN"],
  users: ["SUPER_ADMIN"],
  audit: ["SUPER_ADMIN", "CLUB_ADMIN"],
};

export function can(role: Role | undefined | null, area: Area) {
  return !!role && MATRIX[area].includes(role);
}
export function rolesFor(area: Area) {
  return MATRIX[area];
}

export const ROLE_LABEL: Record<Role, string> = {
  SUPER_ADMIN: "Super admin",
  CLUB_ADMIN: "Club admin",
  ATTENDANCE_OFFICER: "Attendance officer",
  EDITOR: "Editor",
  MEMBER: "Member",
};
