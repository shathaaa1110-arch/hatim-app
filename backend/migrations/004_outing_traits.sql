-- Editorial traits for the nine fictional demo experiences only.
-- Existing custom editorial traits are preserved. No availability or allergy claims.
UPDATE experiences AS e
SET payload = jsonb_set(e.payload, '{outing_traits}', seed.traits)
FROM (VALUES
('fire', '["sharing"]'::jsonb),
('sushi', '["discovery"]'::jsonb),
('levant', '["quiet", "sharing"]'::jsonb),
('pasta', '["discovery"]'::jsonb),
('breakfast', '["quiet", "sharing"]'::jsonb),
('bao', '["discovery", "sharing"]'::jsonb),
('pizza', '["sharing"]'::jsonb),
('coffee', '["quiet"]'::jsonb),
('dessert', '["sharing"]'::jsonb)
) AS seed(id, traits)
WHERE e.id = seed.id AND NOT (e.payload ? 'outing_traits');
