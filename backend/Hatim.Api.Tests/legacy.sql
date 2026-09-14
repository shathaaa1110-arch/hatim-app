BEGIN TRANSACTION;
CREATE TABLE groups (
                id TEXT PRIMARY KEY, title TEXT NOT NULL,
                invite_code TEXT UNIQUE NOT NULL, owner_hash TEXT UNIQUE NOT NULL,
                settings TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            );
INSERT INTO "groups" VALUES('legacy-group','مجموعة قبل النقل','legacy-invite','ed51e21f686024fd7893a149127750f1928d542627f8e199b3f3759cf484dd2f','{"slots":3,"anchor_id":"fire","pocket_ids":[],"completed_ids":["fire"]}','2026-09-14 07:53:26');
CREATE TABLE members (
                id TEXT PRIMARY KEY, group_id TEXT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
                token_hash TEXT UNIQUE NOT NULL, preferences TEXT NOT NULL,
                organizer INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            );
INSERT INTO "members" VALUES('legacy-owner','legacy-group','febe1d741b49e5a9c31526728d8c5134a803adfc4c04c4f052673722ed85597e','{"name":"أمل","role":"مقيم","cuisines":["سعودي"],"allergies":[],"vegetarian":false,"mild":false,"budget":200}',1,'2026-09-14 07:53:26');
INSERT INTO "members" VALUES('legacy-member','legacy-group','e66c4d5b4b907d11719382862dcc12768848d0bc86cf7d2c319bcd946edd19f5','{"name":"بدر","role":"مقيم","cuisines":[],"allergies":[],"vegetarian":true,"mild":false,"budget":200}',0,'2026-09-14 07:53:26');
CREATE INDEX members_group ON members(group_id);
COMMIT;
