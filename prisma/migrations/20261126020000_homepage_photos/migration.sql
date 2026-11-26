-- Homepage photos (Nov 2026): a sharp medical-camp photo for the hero, a group photo for
-- "Who we are" and a fellowship photo behind "Join us". All three are club photos already in the
-- media library (imported from the club's X account). Admins can change them under Settings.
INSERT INTO "site_settings" ("key", "value", "updatedAt") VALUES ('site', '{}'::jsonb, NOW()) ON CONFLICT ("key") DO NOTHING;

UPDATE "site_settings" SET "value" = "value"::jsonb || jsonb_build_object('heroImageId', (SELECT "id" FROM "media" WHERE "storageKey" = 'images/x/HTHFi7jXMAALyBo-lg.webp' LIMIT 1))
WHERE "key" = 'site' AND EXISTS (SELECT 1 FROM "media" WHERE "storageKey" = 'images/x/HTHFi7jXMAALyBo-lg.webp');

UPDATE "site_settings" SET "value" = "value"::jsonb || jsonb_build_object('homeAboutImageId', (SELECT "id" FROM "media" WHERE "storageKey" = 'images/x/FpY2l6aWcAEgw37-lg.webp' LIMIT 1))
WHERE "key" = 'site' AND EXISTS (SELECT 1 FROM "media" WHERE "storageKey" = 'images/x/FpY2l6aWcAEgw37-lg.webp');

UPDATE "site_settings" SET "value" = "value"::jsonb || jsonb_build_object('homeJoinImageId', (SELECT "id" FROM "media" WHERE "storageKey" = 'images/x/HFnEiEgXcAA2DfS-lg.webp' LIMIT 1))
WHERE "key" = 'site' AND EXISTS (SELECT 1 FROM "media" WHERE "storageKey" = 'images/x/HFnEiEgXcAA2DfS-lg.webp');

-- #KANOs4Kakindu's cover was a low-resolution flyer with text on it; use a sharp photo from the
-- project's library day instead (only if the cover is still that flyer).
UPDATE "projects" SET "coverId" = (SELECT "id" FROM "media" WHERE "storageKey" = 'images/x/FhRgJJ4X0AM0-Hv-lg.webp' LIMIT 1)
WHERE "slug" = 'kanos-4-kakindu'
  AND EXISTS (SELECT 1 FROM "media" WHERE "storageKey" = 'images/x/FhRgJJ4X0AM0-Hv-lg.webp')
  AND "coverId" IN (SELECT "id" FROM "media" WHERE "storageKey" LIKE 'images/x/Ex-3DE-WEA4BKzt%');
