-- For databases that applied an earlier 0004 before id was dropped.
alter table app_settings drop column if exists id;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conrelid = 'app_settings'::regclass and contype = 'p'
  ) then
    alter table app_settings add primary key (store_id);
  end if;
end $$;
