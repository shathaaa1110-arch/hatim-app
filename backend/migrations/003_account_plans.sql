-- Direct experience plans remain independent from persistent circles.
-- Existing guest plans keep their capability until explicitly saved to an account.
ALTER TABLE groups ADD COLUMN owner_account_id TEXT REFERENCES accounts(id);
CREATE INDEX groups_account ON groups(owner_account_id, created_at DESC, id)
    WHERE owner_account_id IS NOT NULL;
