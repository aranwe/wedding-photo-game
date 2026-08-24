-- seed.sql — initial config + photo tasks
--
-- Behavior on every Vercel build (prebuild):
--   * config rows are UPSERTED — edit them here to change the live theme/event
--   * tasks are inserted ONLY when the tasks table is empty, so tasks deleted
--     or edited via SQL/dashboard stay deleted/edited across deploys

insert into public.config (key, value) values
  ('theme', '{"primary": "#a53627", "secondary": "#a53627"}'),
  ('event', '{"partner1": "Bára", "and": "&", "partner2": "Matěj", "subtitle": "Svatební foto hra"}')
on conflict (key) do update set value = excluded.value;

insert into public.tasks (title_cs, sort_order)
select * from (values
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
) as seed(title_cs, sort_order)
where not exists (select 1 from public.tasks);
