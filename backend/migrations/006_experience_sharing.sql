-- Editorial suggestions for the existing fictional catalog only.
-- Preserve authored suggestions and never infer a real Google place or rating.
UPDATE experiences AS e
SET payload = jsonb_set(e.payload, '{suggested_dishes}', seed.dishes)
FROM (VALUES
('fire', '["أطباق الحطب للمشاركة", "أرز الأعشاب"]'::jsonb),
('sushi', '["قائمة تذوق السوشي"]'::jsonb),
('levant', '["مزّات شامية", "خبز الفرن"]'::jsonb),
('pasta', '["باستا طازجة بصلصة اليوم"]'::jsonb),
('breakfast', '["تميس", "شكشوكة", "قهوة"]'::jsonb),
('bao', '["باو بحشوات متنوعة"]'::jsonb),
('pizza', '["بيتزا نابولية للمشاركة"]'::jsonb),
('coffee', '["قهوة مقطرة", "حلى التمر"]'::jsonb),
('dessert', '["حلى الفستق للمشاركة"]'::jsonb)
) AS seed(id, dishes)
WHERE e.id=seed.id AND NOT (e.payload ? 'suggested_dishes');
