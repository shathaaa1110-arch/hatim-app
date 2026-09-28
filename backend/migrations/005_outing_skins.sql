-- Optional membership default, per-outing override and immutable archive appearance.
ALTER TABLE circle_members ADD COLUMN skin JSONB
    CHECK (skin IS NULL OR jsonb_typeof(skin) = 'object');
ALTER TABLE outing_participants ADD COLUMN skin_override JSONB
    CHECK (skin_override IS NULL OR jsonb_typeof(skin_override) = 'object');
ALTER TABLE outing_participants ADD COLUMN skin_snapshot JSONB
    CHECK (skin_snapshot IS NULL OR jsonb_typeof(skin_snapshot) = 'object');
