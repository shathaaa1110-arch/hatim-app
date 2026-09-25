-- Sharing owns invitation presentation and revocation. Source features own plans.
-- One active link per source; deletion cascades and a new link receives a new code.
CREATE SEQUENCE plan_invitation_revision AS BIGINT;
CREATE TABLE plan_invitations (
    code TEXT PRIMARY KEY,
    plan_id TEXT UNIQUE REFERENCES groups(id) ON DELETE CASCADE,
    outing_id TEXT UNIQUE REFERENCES outings(id) ON DELETE CASCADE,
    details JSONB NOT NULL CHECK (jsonb_typeof(details)='object'),
    revision BIGINT NOT NULL DEFAULT nextval('plan_invitation_revision') CHECK (revision > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CHECK ((plan_id IS NULL) <> (outing_id IS NULL))
);
