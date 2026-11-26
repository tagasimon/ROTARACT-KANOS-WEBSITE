-- Homepage photos, round two (Nov 2026): the team celebrating the solar commissioning at Mboona
-- Kiyoganyi Health Unit for the hero, and the whole team's group photo from the same day behind
-- "Join us". Each one only replaces the photo set by the previous migration, so a photo an admin
-- has chosen under Settings is left alone.
UPDATE "site_settings" SET "value" = "value"::jsonb || jsonb_build_object('heroImageId', (SELECT "id" FROM "media" WHERE "storageKey" = 'images/x/HTHDRvnXYAAKzuE-lg.webp' LIMIT 1))
WHERE "key" = 'site'
  AND EXISTS (SELECT 1 FROM "media" WHERE "storageKey" = 'images/x/HTHDRvnXYAAKzuE-lg.webp')
  AND ("value"::jsonb ->> 'heroImageId') IS NOT DISTINCT FROM (SELECT "id" FROM "media" WHERE "storageKey" = 'images/x/HTHFi7jXMAALyBo-lg.webp' LIMIT 1);

UPDATE "site_settings" SET "value" = "value"::jsonb || jsonb_build_object('homeJoinImageId', (SELECT "id" FROM "media" WHERE "storageKey" = 'images/x/HTHNhMgWQAAzxct-lg.webp' LIMIT 1))
WHERE "key" = 'site'
  AND EXISTS (SELECT 1 FROM "media" WHERE "storageKey" = 'images/x/HTHNhMgWQAAzxct-lg.webp')
  AND ("value"::jsonb ->> 'homeJoinImageId') IS NOT DISTINCT FROM (SELECT "id" FROM "media" WHERE "storageKey" = 'images/x/HFnEiEgXcAA2DfS-lg.webp' LIMIT 1);
