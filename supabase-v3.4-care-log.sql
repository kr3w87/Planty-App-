-- Planty V3.4: dauerhafter Pflegeverlauf
create table if not exists public.plant_care_logs (
  id uuid primary key default gen_random_uuid(),
  plant_id uuid not null references public.plants(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('water','fert','skip')),
  performed_at timestamptz not null default now(),
  note text
);

create index if not exists plant_care_logs_user_date_idx on public.plant_care_logs(user_id, performed_at desc);
create index if not exists plant_care_logs_plant_date_idx on public.plant_care_logs(plant_id, performed_at desc);

alter table public.plant_care_logs enable row level security;

drop policy if exists "Users can view own care logs" on public.plant_care_logs;
create policy "Users can view own care logs" on public.plant_care_logs for select using (auth.uid() = user_id);

drop policy if exists "Users can insert own care logs" on public.plant_care_logs;
create policy "Users can insert own care logs" on public.plant_care_logs for insert with check (auth.uid() = user_id);

drop policy if exists "Users can update own care logs" on public.plant_care_logs;
create policy "Users can update own care logs" on public.plant_care_logs for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users can delete own care logs" on public.plant_care_logs;
create policy "Users can delete own care logs" on public.plant_care_logs for delete using (auth.uid() = user_id);
