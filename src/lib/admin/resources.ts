import type { Area } from "@/lib/rbac";

export type FieldType =
  | "text"
  | "textarea"
  | "markdown"
  | "number"
  | "date"
  | "datetime"
  | "boolean"
  | "select"
  | "relation"
  | "relations"
  | "image"
  | "file"
  | "url"
  | "email"
  | "slug"
  | "pin"
  | "readonly";

export type Field = {
  name: string;
  label: string;
  type: FieldType;
  options?: readonly string[];
  relation?: { model: string; label: string; where?: Record<string, unknown>; orderBy?: Record<string, unknown> };
  required?: boolean;
  help?: string;
  group?: string;
  default?: string | number | boolean;
  width?: "full" | "half" | "third";
};

export type ChildLink = { resource: string; fk: string; label: string };

export type Resource = {
  key: string;
  model: string; // prisma delegate name
  label: string;
  singular: string;
  area: Area;
  group: string;
  titleField: string;
  listFields: { name: string; label: string; type?: "date" | "enum" | "bool" | "rel"; rel?: string }[];
  searchFields: string[];
  orderBy: Record<string, unknown> | Record<string, unknown>[];
  fields: Field[];
  provenance?: boolean;
  publish?: boolean; // has publishStatus
  children?: ChildLink[];
  publicPath?: (row: Record<string, unknown>) => string | null;
  where?: Record<string, unknown>; // fixed filter (e.g. media kind)
  defaults?: Record<string, unknown>; // fixed data on create
  slugFrom?: string;
  yearFrom?: string; // auto-assign yearId from this date field
  description?: string;
};

// ── enum option lists (mirror prisma enums) ──
export const E = {
  verification: ["VERIFIED", "NEEDS_VERIFICATION", "CONFLICTING", "UNVERIFIED"],
  publish: ["DRAFT", "IN_REVIEW", "PUBLISHED", "REJECTED", "ARCHIVED"],
  memberStatus: ["ACTIVE", "ALUMNI", "INACTIVE", "HONORARY", "PENDING"],
  personType: ["MEMBER", "ROTARIAN", "DISTRICT_LEADER", "PARTNER_CONTACT", "COMMUNITY_LEADER", "GUEST", "OTHER"],
  orgType: ["ROTARACT_CLUB", "ROTARY_CLUB", "ROTARACT_DISTRICT", "ROTARY_DISTRICT", "ROTARY_INTERNATIONAL", "NGO", "CORPORATE", "GOVERNMENT", "SCHOOL", "COMMUNITY", "MEDIA", "OTHER"],
  roleCategory: ["BOARD", "COMMITTEE_CHAIR", "DISTRICT", "OTHER"],
  projectStatus: ["IDEA", "PLANNING", "FUNDRAISING", "IMPLEMENTATION", "ONGOING", "COMPLETED", "PAUSED"],
  stage: ["NEED", "IDEA", "PLANNING", "FUNDRAISING", "PARTNERSHIP", "IMPLEMENTATION", "MILESTONE", "COMPLETION", "IMPACT", "UPDATE"],
  phase: ["BEFORE", "DURING", "AFTER", "CURRENT"],
  eventType: ["CLUB_MEETING", "FELLOWSHIP", "SERVICE_PROJECT", "COMMUNITY_OUTREACH", "PROFESSIONAL_DEVELOPMENT", "CAREER", "TRAINING", "FUNDRAISER", "SOCIAL", "SPORTS", "NETWORKING", "INDUCTION", "INSTALLATION", "DISTRICT_CONFERENCE", "DISTRICT_ASSEMBLY", "DISTRICT_TRAINING", "LEADERSHIP", "OFFICIAL_VISIT", "ROTARACT_DISTRICT_EVENT", "INTERNATIONAL", "OTHER"],
  eventStatus: ["SCHEDULED", "TENTATIVE", "POSTPONED", "CANCELLED", "COMPLETED"],
  visitStatus: ["CONFIRMED", "TENTATIVE", "REPORTED", "COMPLETED", "CANCELLED"],
  category: ["ANNOUNCEMENT", "PROJECT_UPDATE", "EVENT", "PHOTO_STORY", "VIDEO", "ACHIEVEMENT", "FELLOWSHIP", "MEMBER_SPOTLIGHT", "LEADERSHIP_UPDATE", "PROFESSIONAL_DEVELOPMENT", "COMMUNITY_SERVICE"],
  platform: ["X", "INSTAGRAM", "FACEBOOK", "LINKEDIN", "YOUTUBE", "TIKTOK", "WEBSITE", "OTHER"],
  provider: ["UPLOAD", "YOUTUBE", "EXTERNAL"],
  albumCategory: ["GENERAL", "PROJECT", "EVENT", "FELLOWSHIP", "COMMUNITY_SERVICE", "PROFESSIONAL_DEVELOPMENT", "DISTRICT_VISIT", "CONFERENCE", "INSTALLATION", "INDUCTION"],
  historyKind: ["FORMATION", "CHARTER", "PRESIDENT", "PROJECT", "INITIATIVE", "TRANSITION", "EVENT", "AWARD", "PARTNERSHIP", "MOMENT", "CURRENT"],
  feedKind: ["ICS", "RSS", "JSON_FEED", "MANUAL"],
  feedTrust: ["TRUSTED", "REVIEW"],
  inquiryStatus: ["NEW", "IN_PROGRESS", "CLOSED"],
  inquiryType: ["ATTEND", "VOLUNTEER", "PARTNER", "SUPPORT_PROJECT", "JOIN", "CONTACT"],
} as const;

// ── common relation shortcuts ──
const R = {
  year: { name: "yearId", label: "Rotaract year", type: "relation", relation: { model: "rotaractYear", label: "label", orderBy: { startDate: "desc" } } } as Field,
  project: { name: "projectId", label: "Project", type: "relation", relation: { model: "project", label: "title", orderBy: { title: "asc" } } } as Field,
  event: { name: "eventId", label: "Event", type: "relation", relation: { model: "event", label: "title", orderBy: { date: "desc" }, where: { mergedIntoId: null } } } as Field,
  person: { name: "personId", label: "Person", type: "relation", relation: { model: "person", label: "name", orderBy: { name: "asc" } } } as Field,
  people: { name: "people", label: "People", type: "relations", relation: { model: "person", label: "name", orderBy: { name: "asc" } } } as Field,
  org: { name: "organizationId", label: "Organization", type: "relation", relation: { model: "organization", label: "name", orderBy: { name: "asc" } } } as Field,
  committee: { name: "committeeId", label: "Committee", type: "relation", relation: { model: "committee", label: "name", orderBy: { name: "asc" } } } as Field,
  album: { name: "albumId", label: "Album", type: "relation", relation: { model: "photoAlbum", label: "title", orderBy: { date: "desc" } } } as Field,
};

const seo: Field[] = [
  { name: "seoTitle", label: "SEO title", type: "text", group: "SEO" },
  { name: "seoDescription", label: "Meta description", type: "textarea", group: "SEO", help: "About 150 characters. Shown in search results and link previews." },
];

export const RESOURCES: Resource[] = [
  // ───────────── People ─────────────
  {
    key: "people", model: "person", label: "People", singular: "Person", area: "people", group: "People",
    titleField: "name", searchFields: ["name", "professionalTitle", "organization"], orderBy: { name: "asc" },
    listFields: [{ name: "name", label: "Name" }, { name: "type", label: "Type", type: "enum" }, { name: "isPublic", label: "Public", type: "bool" }, { name: "verification", label: "Verification", type: "enum" }],
    provenance: true, slugFrom: "name",
    publicPath: (r) => (r.isPublic ? `/people/${r.slug}` : null),
    description: "Public profiles: members, district leaders, Rotarians, partners and guests. Private member data lives under Members.",
    fields: [
      { name: "name", label: "Full name", type: "text", required: true, width: "half" },
      { name: "honorific", label: "Honorific", type: "text", help: "e.g. Rtr., Rtn., PP, IPP", width: "half" },
      { name: "slug", label: "URL slug", type: "slug", width: "half" },
      { name: "type", label: "Type", type: "select", options: E.personType, default: "MEMBER", width: "half" },
      { name: "photoId", label: "Photo", type: "image" },
      { name: "professionalTitle", label: "Professional title", type: "text", width: "half" },
      { name: "organization", label: "Company / organisation", type: "text", width: "half" },
      { name: "bio", label: "Biography", type: "markdown" },
      { name: "skills", label: "Skills", type: "relations", relation: { model: "skill", label: "name", orderBy: { name: "asc" } } },
      { name: "expertise", label: "Areas of expertise", type: "text", width: "half" },
      { name: "interests", label: "Interests", type: "text", width: "half" },
      { name: "linkedin", label: "LinkedIn", type: "url", group: "Links", width: "half" },
      { name: "x", label: "X", type: "url", group: "Links", width: "half" },
      { name: "instagram", label: "Instagram", type: "url", group: "Links", width: "half" },
      { name: "website", label: "Website", type: "url", group: "Links", width: "half" },
      { name: "isPublic", label: "Show profile publicly", type: "boolean", default: true, group: "Visibility" },
      { name: "featured", label: "Feature on people page", type: "boolean", group: "Visibility" },
      ...seo,
    ],
  },
  {
    key: "members", model: "member", label: "Members", singular: "Member", area: "members", group: "People",
    titleField: "memberNumber", searchFields: ["memberNumber", "email", "phone"], orderBy: { memberNumber: "asc" },
    listFields: [{ name: "memberNumber", label: "Member ID" }, { name: "person", label: "Name", type: "rel", rel: "name" }, { name: "status", label: "Status", type: "enum" }, { name: "membershipDate", label: "Joined", type: "date" }],
    description: "Private membership records (contact details, member ID, PIN). Never shown publicly. Leave Person empty and enter a name to create a profile automatically.",
    fields: [
      { name: "personId", label: "Person (public profile)", type: "relation", relation: { model: "person", label: "name", orderBy: { name: "asc" } }, help: "Pick an existing profile, or leave empty and fill “New person name”." },
      { name: "__newPersonName", label: "New person name", type: "text", help: "Creates a public profile (hidden until you publish it) if no person is selected." },
      { name: "memberNumber", label: "Member ID", type: "text", required: true, width: "half", help: "e.g. KN-0001" },
      { name: "status", label: "Status", type: "select", options: E.memberStatus, default: "ACTIVE", width: "half" },
      { name: "email", label: "Email (private)", type: "email", width: "half" },
      { name: "phone", label: "Phone (private)", type: "text", width: "half" },
      { name: "membershipDate", label: "Membership date", type: "date", width: "half" },
      { name: "__pin", label: "Set new PIN", type: "pin", width: "half", help: "4–8 digits. Members use Member ID + PIN to activate their account or check in." },
      { name: "notes", label: "Internal notes", type: "textarea" },
    ],
  },
  {
    key: "skills", model: "skill", label: "Skills", singular: "Skill", area: "people", group: "People",
    titleField: "name", searchFields: ["name"], orderBy: { name: "asc" }, slugFrom: "name",
    listFields: [{ name: "name", label: "Skill" }],
    fields: [{ name: "name", label: "Name", type: "text", required: true }, { name: "slug", label: "Slug", type: "slug" }, { name: "description", label: "Description", type: "textarea" }],
  },
  {
    key: "committees", model: "committee", label: "Committees", singular: "Committee", area: "people", group: "People",
    titleField: "name", searchFields: ["name"], orderBy: { sortOrder: "asc" }, slugFrom: "name",
    listFields: [{ name: "name", label: "Committee" }, { name: "active", label: "Active", type: "bool" }],
    children: [{ resource: "committee-members", fk: "committeeId", label: "Members" }],
    fields: [
      { name: "name", label: "Name", type: "text", required: true, width: "half" },
      { name: "slug", label: "Slug", type: "slug", width: "half" },
      { name: "description", label: "Description", type: "textarea" },
      { name: "focus", label: "Focus areas", type: "text" },
      { name: "sortOrder", label: "Sort order", type: "number", default: 0, width: "half" },
      { name: "active", label: "Active", type: "boolean", default: true, width: "half" },
    ],
  },
  {
    key: "committee-members", model: "committeeMembership", label: "Committee members", singular: "Committee membership", area: "people", group: "People",
    titleField: "role", searchFields: ["role"], orderBy: { committeeId: "asc" },
    listFields: [{ name: "committee", label: "Committee", type: "rel", rel: "name" }, { name: "person", label: "Person", type: "rel", rel: "name" }, { name: "year", label: "Year", type: "rel", rel: "label" }, { name: "role", label: "Role" }],
    fields: [R.committee, R.person, R.year, { name: "role", label: "Role", type: "text", help: "Member, Co-chair…" }],
  },
  // ───────────── Leadership ─────────────
  {
    key: "leadership", model: "leadershipAssignment", label: "Leadership", singular: "Leadership assignment", area: "people", group: "Leadership",
    titleField: "customTitle", searchFields: ["customTitle", "highlights"], orderBy: [{ year: { startDate: "desc" } }, { role: { sortOrder: "asc" } }],
    listFields: [{ name: "year", label: "Year", type: "rel", rel: "label" }, { name: "role", label: "Role", type: "rel", rel: "title" }, { name: "person", label: "Person", type: "rel", rel: "name" }, { name: "verification", label: "Verification", type: "enum" }],
    provenance: true,
    description: "Who held which role in which Rotaract year. Changing club leadership for a new year = add assignments for that year.",
    fields: [
      { ...R.year, required: true },
      { name: "roleId", label: "Role", type: "relation", required: true, relation: { model: "leadershipRole", label: "title", orderBy: { sortOrder: "asc" } } },
      { ...R.person, required: true },
      { name: "customTitle", label: "Custom title", type: "text", help: "Overrides the role title, e.g. a club-specific name", width: "half" },
      { ...R.committee, width: "half" },
      { name: "highlights", label: "Leadership highlights / notes", type: "textarea" },
      { name: "sortOrder", label: "Sort order", type: "number", default: 0 },
    ],
  },
  {
    key: "roles", model: "leadershipRole", label: "Leadership roles", singular: "Role", area: "people", group: "Leadership",
    titleField: "title", searchFields: ["title"], orderBy: { sortOrder: "asc" }, slugFrom: "title",
    listFields: [{ name: "title", label: "Title" }, { name: "category", label: "Category", type: "enum" }, { name: "sortOrder", label: "Order" }],
    description: "The role structure. Keep the slug “president” for the President role; the past-presidents archive depends on it.",
    fields: [{ name: "title", label: "Title", type: "text", required: true }, { name: "slug", label: "Slug", type: "slug" }, { name: "category", label: "Category", type: "select", options: E.roleCategory, default: "BOARD" }, { name: "sortOrder", label: "Sort order", type: "number", default: 100 }, { name: "description", label: "Description", type: "textarea" }],
  },
  {
    key: "years", model: "rotaractYear", label: "Rotaract years", singular: "Rotaract year", area: "people", group: "Leadership",
    titleField: "label", searchFields: ["label", "theme"], orderBy: { startDate: "desc" },
    listFields: [{ name: "label", label: "Year" }, { name: "theme", label: "Theme" }, { name: "isCurrent", label: "Current", type: "bool" }],
    publicPath: (r) => `/years/${r.slug}`,
    description: "Create next year's record before 1 July, then mark it current. Only one year should be current.",
    fields: [
      { name: "label", label: "Label", type: "text", required: true, help: "e.g. 2027–2028", width: "half" },
      { name: "slug", label: "Slug", type: "slug", help: "e.g. 2027-2028", width: "half" },
      { name: "startDate", label: "Starts", type: "date", required: true, width: "half" },
      { name: "endDate", label: "Ends", type: "date", required: true, width: "half" },
      { name: "theme", label: "Club theme", type: "text", width: "half" },
      { name: "riTheme", label: "RI / district theme", type: "text", width: "half" },
      { name: "summary", label: "Summary", type: "textarea" },
      { name: "coverId", label: "Cover image", type: "image" },
      { name: "isCurrent", label: "This is the current year", type: "boolean" },
    ],
    slugFrom: "label",
  },
  // ───────────── Projects ─────────────
  {
    key: "projects", model: "project", label: "Projects", singular: "Project", area: "content", group: "Projects",
    titleField: "title", searchFields: ["title", "summary", "locationName"], orderBy: { updatedAt: "desc" },
    listFields: [{ name: "title", label: "Project" }, { name: "status", label: "Status", type: "enum" }, { name: "year", label: "Year", type: "rel", rel: "label" }, { name: "publishStatus", label: "Published", type: "enum" }, { name: "verification", label: "Verification", type: "enum" }],
    provenance: true, publish: true, slugFrom: "title", yearFrom: "startDate",
    publicPath: (r) => `/projects/${r.slug}`,
    children: [
      { resource: "milestones", fk: "projectId", label: "Milestones" },
      { resource: "metrics", fk: "projectId", label: "Metrics" },
      { resource: "partners", fk: "projectId", label: "Partners" },
      { resource: "team", fk: "projectId", label: "Team" },
      { resource: "photos", fk: "projectId", label: "Photos (incl. Then → Now)" },
    ],
    fields: [
      { name: "title", label: "Title", type: "text", required: true, width: "half" },
      { name: "slug", label: "URL slug", type: "slug", width: "half" },
      { name: "tagline", label: "Tagline", type: "text" },
      { name: "summary", label: "Summary", type: "textarea" },
      { name: "status", label: "Status", type: "select", options: E.projectStatus, default: "PLANNING", width: "third" },
      { name: "startDate", label: "Start date", type: "date", width: "third" },
      { name: "endDate", label: "End date", type: "date", width: "third" },
      { name: "coverId", label: "Cover photo", type: "image" },
      { name: "need", label: "The need", type: "markdown", group: "Journey", help: "What problem were people facing?" },
      { name: "idea", label: "The idea", type: "markdown", group: "Journey", help: "How was the project conceived?" },
      { name: "beginning", label: "The beginning", type: "markdown", group: "Journey" },
      { name: "impact", label: "The impact", type: "markdown", group: "Journey", help: "What changed?" },
      { name: "today", label: "Today", type: "markdown", group: "Journey", help: "Current status" },
      { name: "quote", label: "Pull quote", type: "textarea", group: "Journey", help: "Only real, attributable quotes." },
      { name: "quoteAttribution", label: "Quote attribution", type: "text", group: "Journey" },
      { name: "beneficiaries", label: "Beneficiaries", type: "text", group: "Place & people" },
      { name: "locationName", label: "Location", type: "text", group: "Place & people", width: "third" },
      { name: "latitude", label: "Latitude", type: "number", group: "Place & people", width: "third" },
      { name: "longitude", label: "Longitude", type: "number", group: "Place & people", width: "third" },
      { name: "leadId", label: "Project lead", type: "relation", group: "Place & people", relation: { model: "person", label: "name", orderBy: { name: "asc" } }, width: "half" },
      { ...R.committee, group: "Place & people", width: "half" },
      { ...R.year, group: "Place & people", help: "Auto-filled from the start date if left empty." },
      { name: "featured", label: "Feature on the homepage (Project Journey)", type: "boolean", group: "Place & people" },
      ...seo,
    ],
  },
  {
    key: "milestones", model: "projectMilestone", label: "Project milestones", singular: "Milestone", area: "content", group: "Projects",
    titleField: "title", searchFields: ["title", "description"], orderBy: [{ date: "desc" }],
    listFields: [{ name: "project", label: "Project", type: "rel", rel: "title" }, { name: "date", label: "Date", type: "date" }, { name: "title", label: "Milestone" }, { name: "stage", label: "Stage", type: "enum" }, { name: "verification", label: "Verification", type: "enum" }],
    provenance: true, yearFrom: "date",
    fields: [
      { ...R.project, required: true },
      { name: "title", label: "Title", type: "text", required: true },
      { name: "stage", label: "Journey stage", type: "select", options: E.stage, default: "MILESTONE", width: "third" },
      { name: "date", label: "Date", type: "date", width: "third" },
      { name: "dateLabel", label: "Date label", type: "text", help: "e.g. “Early 2025” when the exact date is unknown", width: "third" },
      { name: "description", label: "Description", type: "textarea" },
      { name: "imageId", label: "Image", type: "image" },
      { name: "videoUrl", label: "Video URL", type: "url" },
      R.event,
      R.people,
      { name: "documents", label: "Documents", type: "relations", relation: { model: "document", label: "title", orderBy: { title: "asc" } } },
      R.year,
      { name: "sortOrder", label: "Sort order (same date)", type: "number", default: 0 },
    ],
  },
  {
    key: "metrics", model: "projectMetric", label: "Project metrics", singular: "Metric", area: "content", group: "Projects",
    titleField: "label", searchFields: ["label", "impactKey"], orderBy: { projectId: "asc" },
    listFields: [{ name: "project", label: "Project", type: "rel", rel: "title" }, { name: "label", label: "Metric" }, { name: "value", label: "Value" }, { name: "unit", label: "Unit" }, { name: "verification", label: "Verification", type: "enum" }],
    description: "Use the same impact key (e.g. trees_planted, beneficiaries, funds_raised_ugx, volunteer_hours) across projects to sum club-wide totals on Our Impact.",
    fields: [
      { ...R.project, required: true },
      { name: "label", label: "Label", type: "text", required: true, width: "half" },
      { name: "impactKey", label: "Impact key", type: "text", width: "half" },
      { name: "value", label: "Value", type: "number", required: true, width: "third" },
      { name: "unit", label: "Unit", type: "text", width: "third" },
      { name: "date", label: "As of", type: "date", width: "third" },
      { name: "showInImpact", label: "Include in club-wide impact", type: "boolean", default: true },
      { name: "source", label: "Source", type: "text", group: "Provenance" },
      { name: "sourceUrl", label: "Source URL", type: "url", group: "Provenance" },
      { name: "verification", label: "Verification", type: "select", options: E.verification, default: "NEEDS_VERIFICATION", group: "Provenance" },
    ],
  },
  {
    key: "partners", model: "projectPartner", label: "Project partners", singular: "Partner", area: "content", group: "Projects",
    titleField: "role", searchFields: ["role", "description"], orderBy: { projectId: "asc" },
    listFields: [{ name: "project", label: "Project", type: "rel", rel: "title" }, { name: "organization", label: "Organization", type: "rel", rel: "name" }, { name: "role", label: "Role" }],
    fields: [{ ...R.project, required: true }, { ...R.org, required: true }, { name: "role", label: "Role", type: "text", help: "Sponsor, Supporting Rotary club, Community partner…" }, { name: "description", label: "Description", type: "textarea" }, { name: "sourceUrl", label: "Source URL", type: "url" }, { name: "verification", label: "Verification", type: "select", options: E.verification, default: "NEEDS_VERIFICATION" }],
  },
  {
    key: "team", model: "projectTeamMember", label: "Project team", singular: "Team member", area: "content", group: "Projects",
    titleField: "role", searchFields: ["role"], orderBy: { sortOrder: "asc" },
    listFields: [{ name: "project", label: "Project", type: "rel", rel: "title" }, { name: "person", label: "Person", type: "rel", rel: "name" }, { name: "role", label: "Role" }],
    fields: [{ ...R.project, required: true }, { ...R.person, required: true }, { name: "role", label: "Role", type: "text", default: "Rotaractor", help: "Project committee, Community leader, Supporting Rotarian, Donor…" }, { name: "sortOrder", label: "Sort order", type: "number", default: 0 }],
  },
  {
    key: "organizations", model: "organization", label: "Organizations", singular: "Organization", area: "people", group: "Projects",
    titleField: "name", searchFields: ["name", "shortName"], orderBy: { name: "asc" }, slugFrom: "name",
    listFields: [{ name: "name", label: "Name" }, { name: "type", label: "Type", type: "enum" }, { name: "isSelf", label: "This club", type: "bool" }],
    description: "Partners, sponsors and event organizers. Event labels use these names, so keep Rotary and Rotaract bodies distinct.",
    fields: [{ name: "name", label: "Name", type: "text", required: true, width: "half" }, { name: "shortName", label: "Short name", type: "text", width: "half" }, { name: "slug", label: "Slug", type: "slug", width: "half" }, { name: "type", label: "Type", type: "select", options: E.orgType, default: "OTHER", width: "half" }, { name: "website", label: "Website", type: "url" }, { name: "description", label: "Description", type: "textarea" }, { name: "logoId", label: "Logo", type: "image" }, { name: "isSelf", label: "This is Rotaract Club Kampala North", type: "boolean" }],
  },
  // ───────────── Events ─────────────
  {
    key: "events", model: "event", label: "Events", singular: "Event", area: "events", group: "Events",
    titleField: "title", searchFields: ["title", "venue", "description"], orderBy: { date: "desc" },
    where: { mergedIntoId: null },
    listFields: [{ name: "date", label: "Date", type: "date" }, { name: "title", label: "Event" }, { name: "organizer", label: "Organizer", type: "rel", rel: "name" }, { name: "publishStatus", label: "Published", type: "enum" }, { name: "verification", label: "Verification", type: "enum" }],
    provenance: true, publish: true, slugFrom: "title", yearFrom: "date",
    publicPath: (r) => `/events/${r.slug}`,
    fields: [
      { name: "title", label: "Title", type: "text", required: true, width: "half" },
      { name: "slug", label: "URL slug", type: "slug", width: "half" },
      { name: "organizerId", label: "Organizer", type: "relation", required: true, relation: { model: "organization", label: "name", orderBy: { name: "asc" } }, width: "half", help: "Always label who organises it." },
      { name: "type", label: "Type", type: "select", options: E.eventType, default: "CLUB_MEETING", width: "half" },
      { name: "date", label: "Date", type: "date", required: true, width: "third" },
      { name: "startTime", label: "Starts", type: "datetime", width: "third" },
      { name: "endTime", label: "Ends", type: "datetime", width: "third" },
      { name: "endDate", label: "End date (multi-day)", type: "date", width: "third" },
      { name: "status", label: "Status", type: "select", options: E.eventStatus, default: "SCHEDULED", width: "third" },
      { name: "allDay", label: "All-day", type: "boolean", width: "third" },
      { name: "description", label: "Description", type: "markdown" },
      { name: "venue", label: "Venue", type: "text", group: "Where", width: "half" },
      { name: "address", label: "Address", type: "text", group: "Where", width: "half" },
      { name: "latitude", label: "Latitude", type: "number", group: "Where", width: "third" },
      { name: "longitude", label: "Longitude", type: "number", group: "Where", width: "third" },
      { name: "onlineUrl", label: "Online link", type: "url", group: "Where", width: "third" },
      { name: "registrationUrl", label: "Registration URL", type: "url", group: "Where" },
      { name: "coverId", label: "Cover image", type: "image", group: "Links" },
      { ...R.project, group: "Links" },
      { ...R.people, group: "Links" },
      { ...R.year, group: "Links" },
      { name: "externalId", label: "External ID", type: "text", group: "Provenance" },
      ...seo,
    ],
  },
  {
    key: "feeds", model: "eventFeed", label: "Event sources", singular: "Event source", area: "events", group: "Events",
    titleField: "name", searchFields: ["name", "url"], orderBy: { name: "asc" },
    listFields: [{ name: "name", label: "Source" }, { name: "kind", label: "Kind", type: "enum" }, { name: "trust", label: "Trust", type: "enum" }, { name: "active", label: "Active", type: "bool" }, { name: "lastCheckedAt", label: "Last checked", type: "date" }],
    description: "Public calendars the discovery job checks. ICS/RSS/JSON Feed only; we never scrape HTML. TRUSTED sources publish automatically; REVIEW sources go to Needs Review.",
    fields: [
      { name: "name", label: "Name", type: "text", required: true },
      { name: "url", label: "Feed URL", type: "url", required: true },
      { name: "kind", label: "Format", type: "select", options: E.feedKind, default: "ICS", width: "third" },
      { name: "trust", label: "Trust", type: "select", options: E.feedTrust, default: "REVIEW", width: "third" },
      { name: "defaultType", label: "Default event type", type: "select", options: E.eventType, default: "OTHER", width: "third" },
      { name: "organizerId", label: "Organizer", type: "relation", relation: { model: "organization", label: "name", orderBy: { name: "asc" } } },
      { name: "active", label: "Active", type: "boolean", default: true },
      { name: "lastStatus", label: "Last status", type: "readonly" },
    ],
  },
  {
    key: "visits", model: "districtVisit", label: "District visits", singular: "District visit", area: "events", group: "Events",
    titleField: "visitorName", searchFields: ["visitorName", "visitorTitle", "venue"], orderBy: { date: "desc" },
    listFields: [{ name: "date", label: "Date", type: "date" }, { name: "visitorTitle", label: "Title" }, { name: "visitorName", label: "Visitor" }, { name: "status", label: "Status", type: "enum" }, { name: "verification", label: "Verification", type: "enum" }],
    provenance: true, yearFrom: "date",
    publicPath: () => "/district",
    description: "Record only announced or reported visits. Never add speculative future visits.",
    fields: [
      { name: "visitorName", label: "Visitor name", type: "text", required: true, width: "half" },
      { name: "visitorTitle", label: "Title", type: "text", required: true, width: "half", help: "District Governor, District Rotaract Representative, Assistant Governor…" },
      { ...R.person, label: "Linked profile", width: "half" },
      { name: "status", label: "Status", type: "select", options: E.visitStatus, default: "TENTATIVE", width: "half" },
      { name: "date", label: "Date", type: "date", required: true, width: "third" },
      { name: "startTime", label: "Time", type: "datetime", width: "third" },
      { name: "venue", label: "Venue", type: "text", width: "third" },
      { name: "summary", label: "Summary / report", type: "textarea" },
      R.event,
      R.year,
    ],
  },
  // ───────────── Content ─────────────
  {
    key: "stories", model: "story", label: "Stories", singular: "Story", area: "content", group: "Content",
    titleField: "title", searchFields: ["title", "excerpt"], orderBy: { publishedAt: "desc" },
    listFields: [{ name: "publishedAt", label: "Date", type: "date" }, { name: "title", label: "Story" }, { name: "category", label: "Category", type: "enum" }, { name: "publishStatus", label: "Status", type: "enum" }],
    provenance: true, publish: true, slugFrom: "title", yearFrom: "publishedAt",
    publicPath: (r) => `/stories/${r.slug}`,
    fields: [
      { name: "title", label: "Title", type: "text", required: true, width: "half" },
      { name: "slug", label: "URL slug", type: "slug", width: "half" },
      { name: "category", label: "Category", type: "select", options: E.category, default: "ANNOUNCEMENT", width: "third" },
      { name: "publishedAt", label: "Publish date", type: "datetime", width: "third" },
      { name: "authorName", label: "Author", type: "text", width: "third" },
      { name: "excerpt", label: "Excerpt", type: "textarea" },
      { name: "body", label: "Body", type: "markdown" },
      { name: "coverId", label: "Cover image", type: "image" },
      { name: "featured", label: "Featured", type: "boolean" },
      { ...R.project, group: "Links" },
      { ...R.event, group: "Links" },
      { ...R.people, group: "Links" },
      { ...R.year, group: "Links" },
      ...seo,
    ],
  },
  {
    key: "social", model: "socialPost", label: "Social posts", singular: "Social post", area: "content", group: "Content",
    titleField: "url", searchFields: ["content", "url"], orderBy: { postedAt: "desc" },
    listFields: [{ name: "postedAt", label: "Posted", type: "date" }, { name: "platform", label: "Platform", type: "enum" }, { name: "content", label: "Content" }, { name: "publishStatus", label: "Status", type: "enum" }],
    provenance: true, publish: true, yearFrom: "postedAt",
    description: "Use Import post to add new ones. Open a post and choose Convert to turn it into a story, milestone, achievement, event, album or member spotlight.",
    fields: [
      { name: "platform", label: "Platform", type: "select", options: E.platform, default: "INSTAGRAM", width: "half" },
      { name: "url", label: "Original URL", type: "url", required: true, width: "half" },
      { name: "postedAt", label: "Posted", type: "datetime", width: "half" },
      { name: "category", label: "Category", type: "select", options: E.category, default: "ANNOUNCEMENT", width: "half" },
      { name: "content", label: "Content", type: "textarea" },
      { name: "imageId", label: "Image (upload a copy)", type: "image" },
      { name: "imageUrl", label: "Remote image URL", type: "url" },
      { ...R.org, label: "Organization (whose post)" },
      { ...R.project, group: "Links" },
      { ...R.event, group: "Links" },
      { ...R.people, group: "Links" },
      { ...R.year, group: "Links" },
      { name: "showInFeed", label: "Show in “From Kampala North” feed", type: "boolean", default: true },
    ],
  },
  {
    key: "history", model: "historyEntry", label: "Our Story timeline", singular: "Timeline entry", area: "content", group: "Content",
    titleField: "title", searchFields: ["title", "description"], orderBy: { date: "asc" },
    listFields: [{ name: "date", label: "Date", type: "date" }, { name: "title", label: "Entry" }, { name: "kind", label: "Kind", type: "enum" }, { name: "verification", label: "Verification", type: "enum" }],
    provenance: true, publish: true, yearFrom: "date",
    publicPath: () => "/about",
    fields: [
      { name: "title", label: "Title", type: "text", required: true },
      { name: "kind", label: "Kind", type: "select", options: E.historyKind, default: "MOMENT", width: "third" },
      { name: "date", label: "Date", type: "date", width: "third" },
      { name: "dateLabel", label: "Date label", type: "text", width: "third", help: "Shown instead of the date, e.g. “2015–16 (approx.)”" },
      { name: "description", label: "Description", type: "textarea" },
      { name: "imageId", label: "Photo", type: "image" },
      { name: "videoUrl", label: "Video URL", type: "url" },
      R.people,
      { name: "projects", label: "Projects", type: "relations", relation: { model: "project", label: "title", orderBy: { title: "asc" } } },
      R.year,
    ],
  },
  {
    key: "achievements", model: "achievement", label: "Achievements", singular: "Achievement", area: "content", group: "Content",
    titleField: "title", searchFields: ["title", "description"], orderBy: { date: "desc" },
    listFields: [{ name: "date", label: "Date", type: "date" }, { name: "title", label: "Achievement" }, { name: "verification", label: "Verification", type: "enum" }, { name: "publishStatus", label: "Status", type: "enum" }],
    provenance: true, publish: true, yearFrom: "date",
    publicPath: () => "/achievements",
    fields: [
      { name: "title", label: "Title", type: "text", required: true },
      { name: "description", label: "Description", type: "textarea" },
      { name: "date", label: "Date", type: "date", width: "third" },
      { name: "metricValue", label: "Metric value", type: "number", width: "third" },
      { name: "metricLabel", label: "Metric label", type: "text", width: "third" },
      { name: "imageId", label: "Image", type: "image" },
      R.project, R.event,
      { ...R.person, label: "Person (award recipient)" },
      R.year,
      { name: "featured", label: "Featured", type: "boolean" },
    ],
  },
  {
    key: "impact", model: "impactMetric", label: "Impact numbers", singular: "Impact number", area: "content", group: "Content",
    titleField: "label", searchFields: ["label", "key"], orderBy: { sortOrder: "asc" },
    listFields: [{ name: "label", label: "Metric" }, { name: "value", label: "Value" }, { name: "visible", label: "Visible", type: "bool" }, { name: "verification", label: "Verification", type: "enum" }],
    description: "Club-wide numbers that aren't tied to one project. Project metrics with an impact key are added automatically. Key “communities_reached” overrides the homepage Communities figure.",
    fields: [
      { name: "key", label: "Key", type: "text", required: true, width: "half" },
      { name: "label", label: "Label", type: "text", required: true, width: "half" },
      { name: "value", label: "Value", type: "number", required: true, width: "third" },
      { name: "unit", label: "Unit", type: "text", width: "third" },
      { name: "asOf", label: "As of", type: "date", width: "third" },
      { name: "description", label: "Description", type: "text" },
      { name: "sortOrder", label: "Sort order", type: "number", default: 0, width: "half" },
      { name: "visible", label: "Visible", type: "boolean", default: true, width: "half" },
      { name: "source", label: "Source", type: "text" },
      { name: "sourceUrl", label: "Source URL", type: "url" },
      { name: "verification", label: "Verification", type: "select", options: E.verification, default: "NEEDS_VERIFICATION" },
    ],
  },
  // ───────────── Media ─────────────
  {
    key: "photos", model: "media", label: "Photos", singular: "Photo", area: "content", group: "Media",
    titleField: "caption", searchFields: ["caption", "alt", "title"], orderBy: { createdAt: "desc" },
    where: { kind: "IMAGE" }, defaults: { kind: "IMAGE" },
    listFields: [{ name: "__thumb", label: "" }, { name: "caption", label: "Caption" }, { name: "album", label: "Album", type: "rel", rel: "title" }, { name: "phase", label: "Then→Now", type: "enum" }, { name: "date", label: "Date", type: "date" }],
    yearFrom: "date",
    description: "Use Upload photos for bulk uploads. Images are converted to WebP in four sizes automatically.",
    fields: [
      { name: "__file", label: "Replace image", type: "file" },
      { name: "alt", label: "Alt text (describe the photo)", type: "text" },
      { name: "caption", label: "Caption", type: "text" },
      { name: "date", label: "Date taken", type: "date", width: "half" },
      { name: "credit", label: "Photo credit", type: "text", width: "half" },
      { name: "phase", label: "Then → Now phase", type: "select", options: E.phase, width: "half" },
      { name: "sortOrder", label: "Sort order", type: "number", default: 0, width: "half" },
      R.album, R.project, R.event, R.people, R.year,
      { name: "source", label: "Source", type: "text" },
      { name: "sourceUrl", label: "Source URL", type: "url" },
    ],
  },
  {
    key: "albums", model: "photoAlbum", label: "Albums", singular: "Album", area: "content", group: "Media",
    titleField: "title", searchFields: ["title"], orderBy: { date: "desc" }, slugFrom: "title", yearFrom: "date", publish: true,
    listFields: [{ name: "date", label: "Date", type: "date" }, { name: "title", label: "Album" }, { name: "category", label: "Category", type: "enum" }, { name: "publishStatus", label: "Status", type: "enum" }],
    publicPath: (r) => `/memories/${r.slug}`,
    children: [{ resource: "photos", fk: "albumId", label: "Photos" }],
    fields: [
      { name: "title", label: "Title", type: "text", required: true, width: "half" },
      { name: "slug", label: "Slug", type: "slug", width: "half" },
      { name: "category", label: "Category", type: "select", options: E.albumCategory, default: "GENERAL", width: "half" },
      { name: "date", label: "Date", type: "date", width: "half" },
      { name: "description", label: "Description", type: "textarea" },
      { name: "coverId", label: "Cover", type: "image" },
      R.project, R.event, R.year,
      { name: "source", label: "Source", type: "text" },
      { name: "sourceUrl", label: "Source URL", type: "url" },
    ],
  },
  {
    key: "videos", model: "media", label: "Videos", singular: "Video", area: "content", group: "Media",
    titleField: "title", searchFields: ["title", "description"], orderBy: { date: "desc" },
    where: { kind: "VIDEO" }, defaults: { kind: "VIDEO" }, yearFrom: "date",
    listFields: [{ name: "date", label: "Date", type: "date" }, { name: "title", label: "Video" }, { name: "provider", label: "Provider", type: "enum" }],
    publicPath: () => "/videos",
    fields: [
      { name: "title", label: "Title", type: "text", required: true },
      { name: "provider", label: "Provider", type: "select", options: E.provider, default: "YOUTUBE", width: "half" },
      { name: "url", label: "Video URL (YouTube or external)", type: "url", width: "half" },
      { name: "__file", label: "Or upload a video file (MP4/WebM, max 50 MB)", type: "file" },
      { name: "description", label: "Description", type: "textarea" },
      { name: "date", label: "Date", type: "date" },
      R.project, R.event, R.people, R.year,
      { name: "source", label: "Source", type: "text" },
      { name: "sourceUrl", label: "Source URL", type: "url" },
    ],
  },
  {
    key: "documents", model: "document", label: "Documents", singular: "Document", area: "content", group: "Media",
    titleField: "title", searchFields: ["title", "description"], orderBy: { date: "desc" }, slugFrom: "title", yearFrom: "date",
    listFields: [{ name: "date", label: "Date", type: "date" }, { name: "title", label: "Document" }, { name: "isPublic", label: "Public", type: "bool" }],
    fields: [
      { name: "title", label: "Title", type: "text", required: true, width: "half" },
      { name: "slug", label: "Slug", type: "slug", width: "half" },
      { name: "__file", label: "Upload file", type: "file" },
      { name: "url", label: "Or external URL", type: "url" },
      { name: "description", label: "Description", type: "textarea" },
      { name: "date", label: "Date", type: "date", width: "half" },
      { name: "isPublic", label: "Public", type: "boolean", default: true, width: "half" },
      R.project, R.year,
      { name: "source", label: "Source", type: "text" },
      { name: "sourceUrl", label: "Source URL", type: "url" },
    ],
  },
  {
    key: "inquiries", model: "inquiry", label: "Inquiries", singular: "Inquiry", area: "inquiries", group: "Club",
    titleField: "name", searchFields: ["name", "email", "message", "organization"], orderBy: { createdAt: "desc" },
    listFields: [{ name: "createdAt", label: "Received", type: "date" }, { name: "type", label: "Type", type: "enum" }, { name: "name", label: "Name" }, { name: "email", label: "Email" }, { name: "status", label: "Status", type: "enum" }],
    description: "Messages from the Get Involved form.",
    fields: [
      { name: "type", label: "Type", type: "select", options: E.inquiryType, width: "half" },
      { name: "status", label: "Status", type: "select", options: E.inquiryStatus, default: "NEW", width: "half" },
      { name: "name", label: "Name", type: "text", required: true, width: "half" },
      { name: "email", label: "Email", type: "email", required: true, width: "half" },
      { name: "phone", label: "Phone", type: "text", width: "half" },
      { name: "organization", label: "Organization", type: "text", width: "half" },
      { name: "message", label: "Message", type: "textarea" },
    ],
  },
];

export const PROVENANCE_FIELDS: Field[] = [
  { name: "source", label: "Source (name)", type: "text", group: "Provenance", width: "half" },
  { name: "sourceUrl", label: "Source URL", type: "url", group: "Provenance", width: "half" },
  { name: "sourceType", label: "Source type", type: "text", group: "Provenance", width: "third", help: "CLUB_SOCIAL, DISTRICT, ROTARYO, NEWS, MANUAL…" },
  { name: "verification", label: "Verification", type: "select", options: E.verification, default: "NEEDS_VERIFICATION", group: "Provenance", width: "third" },
  { name: "verifiedAt", label: "Verified", type: "readonly", group: "Provenance", width: "third" },
];
export const PUBLISH_FIELD: Field = { name: "publishStatus", label: "Publication", type: "select", options: E.publish, default: "PUBLISHED", group: "Publication" };

export function getResource(key: string) {
  return RESOURCES.find((r) => r.key === key) || null;
}

export function allFields(r: Resource): Field[] {
  const f = [...r.fields];
  if (r.publish && !f.some((x) => x.name === "publishStatus")) f.push(PUBLISH_FIELD);
  if (r.provenance) for (const p of PROVENANCE_FIELDS) if (!f.some((x) => x.name === p.name)) f.push(p);
  return f;
}
