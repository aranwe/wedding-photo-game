-- 20260825000001_tasks_unique_title.sql
-- Tasks are keyed by their Czech title so seed upserts work.

-- Collapse any duplicates introduced by earlier non-constrained seed runs,
-- keeping the lowest sort_order for each title.
delete from public.tasks a
using public.tasks b
where a.title_cs = b.title_cs
  and a.id < b.id
  and a.sort_order = b.sort_order;

alter table public.tasks
  add constraint tasks_title_cs_key unique (title_cs);
