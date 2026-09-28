-- Additive: legacy groups and member capabilities remain intact until explicitly claimed.
CREATE TABLE accounts (
    id TEXT PRIMARY KEY,
    handle TEXT NOT NULL UNIQUE CHECK(handle = lower(handle)),
    name TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE account_sessions (
    token_hash TEXT PRIMARY KEY,
    account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    expires_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX account_sessions_account ON account_sessions(account_id);
CREATE TABLE auth_attempts (
    key TEXT PRIMARY KEY,
    attempts INTEGER NOT NULL,
    resets_at TIMESTAMPTZ NOT NULL
);
CREATE TABLE circles (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    owner_id TEXT NOT NULL REFERENCES accounts(id),
    invite_code TEXT NOT NULL UNIQUE,
    legacy_group_id TEXT UNIQUE REFERENCES groups(id),
    archived BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE circle_members (
    id TEXT PRIMARY KEY,
    circle_id TEXT NOT NULL REFERENCES circles(id),
    account_id TEXT REFERENCES accounts(id),
    legacy_hash TEXT,
    preferences JSONB NOT NULL CHECK(jsonb_typeof(preferences) = 'object'),
    status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','removed')),
    pinned BOOLEAN NOT NULL DEFAULT FALSE,
    fun_opt_in BOOLEAN NOT NULL DEFAULT FALSE,
    joined_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(circle_id,account_id),
    UNIQUE(id,circle_id)
);
CREATE TABLE outings (
    id TEXT PRIMARY KEY,
    circle_id TEXT NOT NULL REFERENCES circles(id),
    title TEXT NOT NULL,
    coordinator_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open','closed')),
    settings JSONB NOT NULL CHECK(jsonb_typeof(settings) = 'object'),
    planning_revision INTEGER NOT NULL DEFAULT 1,
    snapshot JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(id,circle_id),
    FOREIGN KEY(coordinator_id,circle_id) REFERENCES circle_members(id,circle_id)
);
CREATE INDEX outings_circle ON outings(circle_id,created_at);
CREATE TABLE outing_participants (
    outing_id TEXT NOT NULL,
    member_id TEXT NOT NULL,
    circle_id TEXT NOT NULL,
    attendance TEXT NOT NULL DEFAULT 'pending' CHECK(attendance IN ('pending','going','declined')),
    budget_override INTEGER CHECK(budget_override BETWEEN 30 AND 500),
    snapshot JSONB,
    PRIMARY KEY(outing_id,member_id),
    FOREIGN KEY(outing_id,circle_id) REFERENCES outings(id,circle_id),
    FOREIGN KEY(member_id,circle_id) REFERENCES circle_members(id,circle_id)
);
CREATE TABLE experiences (
    id TEXT PRIMARY KEY,
    payload JSONB NOT NULL CHECK(jsonb_typeof(payload) = 'object' AND payload->>'id' = id)
);
CREATE TABLE decision_rounds (
    id TEXT PRIMARY KEY,
    outing_id TEXT NOT NULL REFERENCES outings(id),
    mode TEXT NOT NULL CHECK(mode IN ('vote','draw')),
    status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open','tied','resolved','invalidated')),
    planning_revision INTEGER NOT NULL,
    voter_ids JSONB NOT NULL CHECK(jsonb_typeof(voter_ids) = 'array'),
    result_id TEXT,
    resolved_by TEXT CHECK(resolved_by IN ('vote','draw','only_option')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMPTZ,
    UNIQUE(id,outing_id),
    CHECK((status='resolved' AND result_id IS NOT NULL AND resolved_at IS NOT NULL) OR status<>'resolved')
);
CREATE UNIQUE INDEX one_current_round ON decision_rounds(outing_id) WHERE status IN ('open','tied','resolved');
CREATE TABLE round_options (
    round_id TEXT NOT NULL REFERENCES decision_rounds(id),
    experience_id TEXT NOT NULL REFERENCES experiences(id),
    position INTEGER NOT NULL,
    PRIMARY KEY(round_id,experience_id),
    UNIQUE(round_id,position)
);
ALTER TABLE decision_rounds ADD CONSTRAINT round_result_option
    FOREIGN KEY(id,result_id) REFERENCES round_options(round_id,experience_id) DEFERRABLE INITIALLY DEFERRED;
CREATE TABLE votes (
    round_id TEXT NOT NULL,
    outing_id TEXT NOT NULL,
    member_id TEXT NOT NULL,
    experience_id TEXT NOT NULL,
    PRIMARY KEY(round_id,member_id),
    FOREIGN KEY(round_id,outing_id) REFERENCES decision_rounds(id,outing_id),
    FOREIGN KEY(outing_id,member_id) REFERENCES outing_participants(outing_id,member_id),
    FOREIGN KEY(round_id,experience_id) REFERENCES round_options(round_id,experience_id)
);
CREATE TABLE outing_fun_cards (
    outing_id TEXT NOT NULL,
    target_id TEXT NOT NULL,
    sender_id TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    dismissed BOOLEAN NOT NULL DEFAULT FALSE,
    PRIMARY KEY(outing_id,target_id),
    FOREIGN KEY(outing_id,target_id) REFERENCES outing_participants(outing_id,member_id),
    FOREIGN KEY(outing_id,sender_id) REFERENCES outing_participants(outing_id,member_id)
);

-- Fictional editorial catalog copied into PostgreSQL once, with stable IDs.
INSERT INTO experiences(id,payload) VALUES('fire','{"id": "fire", "title": "على مهل… وعلى الحطب", "venue": "مائدة الحطب", "neighborhood": "حي حطين", "category": "طبق ولحظة", "cuisine": "سعودي", "description": "رائحة الحطب أول الترحيب. أطباق سعودية بروح جديدة، ومائدة تكبر بالسوالف. لحظة تستاهل تجمعكم حولها.", "why": "تجربة مشاركة تعطي اللمة مساحة، ونكهة محلية تستحق وقتها.", "image": "fire", "price": 145, "minutes": 90, "editorial": 96, "vegetarian": false, "vegetarian_option": "قرنبيط مشوي على الحطب مع أرز الأعشاب بدل اللحم.", "spicy": false, "mild_option": null, "allergens": ["حليب", "قمح"], "verified_free_of": []}'::jsonb);
INSERT INTO experiences(id,payload) VALUES('sushi','{"id": "sushi", "title": "رحلة صغيرة إلى اليابان", "venue": "طاولة نوري", "neighborhood": "حي الملقا", "category": "مطابخ جديدة", "cuisine": "ياباني", "description": "اجلسوا قريبًا من الشيف. قطع صغيرة، تفاصيل كثيرة، وقائمة تذوّق تأخذكم من نكهة إلى حكاية.", "why": "مطبخ مختلف يوسّع التجربة خارج اختياراتكم المعتادة.", "image": "sushi", "price": 180, "minutes": 75, "editorial": 91, "vegetarian": false, "vegetarian_option": "قائمة ماكي بالخضار والفطر.", "spicy": false, "mild_option": null, "allergens": ["سمك", "قشريات", "صويا", "سمسم", "قمح"], "verified_free_of": []}'::jsonb);
INSERT INTO experiences(id,payload) VALUES('levant','{"id": "levant", "title": "باب صغير، سفرة كبيرة", "venue": "دار الزيتون", "neighborhood": "حي الروضة", "category": "كنوز مخفية", "cuisine": "شامي", "description": "في شارع هادئ، خبز يطلع من الفرن ومزّات تتشاركها الأيادي. من الأماكن اللي ودّك تحتفظ بسرّها.", "why": "كنز هادئ، ميزانية مريحة، وخيارات نباتية من أصل المطبخ.", "image": "levant", "price": 85, "minutes": 60, "editorial": 90, "vegetarian": true, "vegetarian_option": null, "spicy": false, "mild_option": null, "allergens": ["سمسم", "قمح", "حليب"], "verified_free_of": []}'::jsonb);
INSERT INTO experiences(id,payload) VALUES('pasta','{"id": "pasta", "title": "الباستا تُصنع قدّامك", "venue": "مختبر العجين", "neighborhood": "حي العليا", "category": "افتتاحات", "cuisine": "إيطالي", "description": "عجين طازج، مطبخ مفتوح، وصلصة بسيطة تعطي المكوّن حقّه. بداية جديدة لسه ما يعرفها الكل.", "why": "تجربة افتتاح تجمع عرض التحضير مع طبق مألوف ومحبوب.", "image": "pasta", "price": 120, "minutes": 70, "editorial": 87, "vegetarian": true, "vegetarian_option": null, "spicy": false, "mild_option": null, "allergens": ["قمح", "بيض", "حليب"], "verified_free_of": []}'::jsonb);
INSERT INTO experiences(id,payload) VALUES('breakfast','{"id": "breakfast", "title": "صباح بطعم أوّل", "venue": "فناء الصباح", "neighborhood": "حي الدرعية", "category": "كنوز مخفية", "cuisine": "سعودي", "description": "تميس دافئ، شكشوكة، وقهوة على طرف الفناء. فطور ما يستعجل الصباح ولا سوالفكم.", "why": "بداية محلية خفيفة على الميزانية قبل يوم طويل.", "image": "breakfast", "price": 65, "minutes": 60, "editorial": 85, "vegetarian": true, "vegetarian_option": null, "spicy": false, "mild_option": null, "allergens": ["قمح", "بيض", "حليب"], "verified_free_of": []}'::jsonb);
INSERT INTO experiences(id,payload) VALUES('bao','{"id": "bao", "title": "لقمة من آخر العالم", "venue": "بيت الباو", "neighborhood": "حي السليمانية", "category": "مطابخ جديدة", "cuisine": "آسيوي", "description": "خبز باو طري وحشوات مليانة نكهة. اطلبوا أكثر من صنف وخلّوا كل لقمة مفاجأة.", "why": "مغامرة صغيرة بالنكهة، تناسب خانة وجبة قصيرة.", "image": "bao", "price": 95, "minutes": 45, "editorial": 83, "vegetarian": false, "vegetarian_option": "باو الفطر بدل الدجاج.", "spicy": true, "mild_option": "الصلصة الحارة على الجانب.", "allergens": ["قمح", "صويا", "سمسم"], "verified_free_of": []}'::jsonb);
INSERT INTO experiences(id,payload) VALUES('pizza','{"id": "pizza", "title": "حواف تستاهل الانتظار", "venue": "فرن الحارة", "neighborhood": "حي النرجس", "category": "افتتاحات", "cuisine": "إيطالي", "description": "فرن صغير وعجينة تأخذ وقتها. بيتزا نابولية إلى وسط الطاولة، عشان كل أحد يذوق.", "why": "اختيار مشاركة مرن يقرّب الأذواق المختلفة.", "image": "pizza", "price": 80, "minutes": 55, "editorial": 81, "vegetarian": true, "vegetarian_option": null, "spicy": false, "mild_option": null, "allergens": ["قمح", "حليب"], "verified_free_of": []}'::jsonb);
INSERT INTO experiences(id,payload) VALUES('coffee','{"id": "coffee", "title": "قهوة… وباقي الحكاية", "venue": "ظل البن", "neighborhood": "حي الياسمين", "category": "طبق ولحظة", "cuisine": "قهوة وحلى", "description": "قهوة مقطّرة وحلى تمر دافئ في ركن هادئ. خلوها موعدًا كاملًا، مو محطة مستعجلة.", "why": "وقفة هادئة للنهاية؛ مرنة إذا احتاجت وجبة ثانية مكانها.", "image": "coffee", "price": 45, "minutes": 40, "editorial": 78, "vegetarian": true, "vegetarian_option": null, "spicy": false, "mild_option": null, "allergens": ["حليب", "قمح", "مكسرات"], "verified_free_of": []}'::jsonb);
INSERT INTO experiences(id,payload) VALUES('dessert','{"id": "dessert", "title": "ختامها فستق", "venue": "قطعة سكر", "neighborhood": "حي العقيق", "category": "طبق ولحظة", "cuisine": "قهوة وحلى", "description": "طبقات خفيفة وفستق محمّص. ختام حلو تتقاسمونه، وتطوّلون عنده السالفة.", "why": "لحظة حلوة إضافية نحفظها إذا ما وسعها الوقت.", "image": "dessert", "price": 50, "minutes": 40, "editorial": 75, "vegetarian": true, "vegetarian_option": null, "spicy": false, "mild_option": null, "allergens": ["مكسرات", "قمح", "حليب", "بيض"], "verified_free_of": []}'::jsonb);
