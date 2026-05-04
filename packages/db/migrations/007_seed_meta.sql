-- politikar 007_seed_meta
-- Seed minimal : the eight French national functions used by the MVP, and
-- the prompt_versions registry initialized with placeholders. Real prompt
-- contents are inserted by `apps/workers/scripts/seed_prompts.py`.

insert into functions (country, name, slug, level)
values
  ('fr', 'Président de la République',         'president-republique', 'national_executive'),
  ('fr', 'Premier ministre',                   'premier-ministre',     'national_executive'),
  ('fr', 'Ministre',                           'ministre',             'national_executive'),
  ('fr', 'Député',                             'depute',               'national_legislative'),
  ('fr', 'Sénateur',                           'senateur',             'national_legislative'),
  ('fr', 'Président de l''Assemblée nationale','president-assemblee',  'national_legislative'),
  ('fr', 'Eurodéputé',                         'eurodepute',           'european'),
  ('fr', 'Président de région',                'president-region',     'regional'),
  ('fr', 'Leader de parti',                    'leader-parti',         'party_leadership')
on conflict (country, slug) do nothing;
