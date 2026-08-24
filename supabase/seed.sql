-- seed.sql — initial config + photo tasks
--
-- Seed is the source of truth: every Vercel build UPSERTS both config and
-- tasks (tasks keyed by title_cs). Edit this file and push to change the
-- live game. Deleting a row here does NOT delete it from the DB — remove it
-- via SQL/dashboard if needed.

insert into public.config (key, value) values
  ('theme', '{"primary": "#a53627", "secondary": "#a53627"}'),
  ('event', '{"partner1": "Bára", "and": "&", "partner2": "Matěj", "subtitle": "Svatební foto hra"}'),
  ('slideshow', '{"interval": 15, "limit": 10, "aspectRatio": "16:9"}')
on conflict (key) do update set value = excluded.value;

insert into public.tasks (title_cs, sort_order) values
  ('Vyfoť nevěstu se ženichem', 1),
  ('Někdo tančí jako nikdy předtím', 2),
  ('Skupinové selfie tvého týmu', 3),
  ('Přípitek na novomanžele', 4),
  ('Nejstarší a nejmladší host spolu', 5),
  ('Něco modrého', 6),
  ('Děda u koláčků', 7),
  ('Roztančený taneční parket', 8),
  ('Nevěsta smějící se', 9),
  ('Svatební dort před rozkrájením', 10),
  ('Dvojice, která se poznala na svatbě', 11),
  ('Polibek novomanželů', 12)
on conflict (title_cs) do update set sort_order = excluded.sort_order;
