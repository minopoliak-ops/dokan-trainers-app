create extension if not exists "uuid-ossp";

drop view if exists student_completed_topics_view cascade;
drop view if exists dojo_attendance_stats_view cascade;
drop view if exists student_attendance_stats_view cascade;
drop view if exists trainer_dojos_view cascade;

drop table if exists email_logs cascade;
drop table if exists attendance cascade;
drop table if exists trainings cascade;
drop table if exists training_topics cascade;
drop table if exists student_grade_history cascade;
drop table if exists students cascade;
drop table if exists dojo_trainers cascade;
drop table if exists dojos cascade;
drop table if exists profiles cascade;
drop type if exists user_role cascade;
drop type if exists attendance_status cascade;

create type public.user_role as enum ('admin', 'trainer');
create type public.attendance_status as enum ('present', 'absent');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text not null,
  role public.user_role not null default 'trainer',
  created_at timestamptz not null default now()
);

create table public.dojos (
  id uuid primary key default uuid_generate_v4(),
  name text not null unique,
  address text,
  created_at timestamptz not null default now()
);

create table public.dojo_trainers (
  id uuid primary key default uuid_generate_v4(),
  dojo_id uuid not null references public.dojos(id) on delete cascade,
  trainer_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (dojo_id, trainer_id)
);

create table public.students (
  id uuid primary key default uuid_generate_v4(),
  dojo_id uuid not null references public.dojos(id) on delete cascade,
  first_name text not null,
  last_name text not null,
  birth_year int,
  parent_name text,
  parent_phone text,
  parent_email text,
  health_info text,
  medication_info text,
  notes text,
  grade_system text,
  technical_grade text,
  last_grading_date date,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.student_grade_history (
  id uuid primary key default uuid_generate_v4(),
  student_id uuid not null references public.students(id) on delete cascade,
  grade_system text,
  technical_grade text not null,
  grading_date date,
  notes text,
  created_at timestamptz not null default now()
);

create table public.training_topics (
  id uuid primary key default uuid_generate_v4(),
  name text not null unique,
  description text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.trainings (
  id uuid primary key default uuid_generate_v4(),
  dojo_id uuid not null references public.dojos(id) on delete cascade,
  topic_id uuid references public.training_topics(id) on delete set null,
  training_date date not null,
  title text not null default 'Tréning',
  created_at timestamptz not null default now(),
  unique (dojo_id, training_date)
);

create table public.attendance (
  id uuid primary key default uuid_generate_v4(),
  training_id uuid not null references public.trainings(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  status public.attendance_status not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (training_id, student_id)
);

create table public.email_logs (
  id uuid primary key default uuid_generate_v4(),
  dojo_id uuid references public.dojos(id) on delete set null,
  subject text not null,
  body text not null,
  recipients text[] not null default '{}',
  status text not null default 'logged_only',
  created_at timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean
language sql
security definer
as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

create or replace function public.can_access_dojo(target_dojo_id uuid)
returns boolean
language sql
security definer
as $$
  select public.is_admin()
  or exists (
    select 1 from public.dojo_trainers
    where dojo_trainers.dojo_id = target_dojo_id
    and dojo_trainers.trainer_id = auth.uid()
  );
$$;

create view public.trainer_dojos_view as
select d.* from public.dojos d where public.can_access_dojo(d.id);

create view public.student_completed_topics_view as
select
  s.id as student_id,
  s.first_name || ' ' || s.last_name as student_name,
  t.id as training_id,
  t.training_date,
  topic.id as topic_id,
  topic.name as topic_name,
  d.name as dojo_name
from public.attendance a
join public.students s on s.id = a.student_id
join public.trainings t on t.id = a.training_id
join public.training_topics topic on topic.id = t.topic_id
join public.dojos d on d.id = t.dojo_id
where a.status = 'present'
and public.can_access_dojo(t.dojo_id);

create view public.dojo_attendance_stats_view as
select
  d.id as dojo_id,
  d.name as dojo_name,
  count(a.id) filter (where a.status = 'present') as present_count,
  count(a.id) filter (where a.status = 'absent') as absent_count
from public.dojos d
left join public.trainings t on t.dojo_id = d.id
left join public.attendance a on a.training_id = t.id
where public.can_access_dojo(d.id)
group by d.id, d.name;

create view public.student_attendance_stats_view as
select
  s.id as student_id,
  s.first_name || ' ' || s.last_name as student_name,
  s.technical_grade,
  s.last_grading_date,
  d.name as dojo_name,
  count(a.id) filter (where a.status = 'present') as present_count,
  count(distinct t.topic_id) filter (where a.status = 'present' and t.topic_id is not null) as completed_topics_count
from public.students s
join public.dojos d on d.id = s.dojo_id
left join public.attendance a on a.student_id = s.id
left join public.trainings t on t.id = a.training_id
where public.can_access_dojo(s.dojo_id)
group by s.id, s.first_name, s.last_name, s.technical_grade, s.last_grading_date, d.name;

alter table public.profiles enable row level security;
alter table public.dojos enable row level security;
alter table public.dojo_trainers enable row level security;
alter table public.students enable row level security;
alter table public.student_grade_history enable row level security;
alter table public.training_topics enable row level security;
alter table public.trainings enable row level security;
alter table public.attendance enable row level security;
alter table public.email_logs enable row level security;

create policy "profiles_read_self_or_admin" on public.profiles for select using (id = auth.uid() or public.is_admin());
create policy "profiles_admin_all" on public.profiles for all using (public.is_admin()) with check (public.is_admin());

create policy "dojos_read_assigned" on public.dojos for select using (public.can_access_dojo(id));
create policy "dojos_admin_all" on public.dojos for all using (public.is_admin()) with check (public.is_admin());

create policy "dojo_trainers_read_relevant" on public.dojo_trainers for select using (trainer_id = auth.uid() or public.is_admin());
create policy "dojo_trainers_admin_all" on public.dojo_trainers for all using (public.is_admin()) with check (public.is_admin());

create policy "students_read_assigned_dojo" on public.students for select using (public.can_access_dojo(dojo_id));
create policy "students_insert_assigned_dojo" on public.students for insert with check (public.can_access_dojo(dojo_id));
create policy "students_update_assigned_dojo" on public.students for update using (public.can_access_dojo(dojo_id)) with check (public.can_access_dojo(dojo_id));

create policy "student_grade_history_read" on public.student_grade_history for select using (
  exists (select 1 from public.students s where s.id = student_grade_history.student_id and public.can_access_dojo(s.dojo_id))
);
create policy "student_grade_history_insert" on public.student_grade_history for insert with check (
  exists (select 1 from public.students s where s.id = student_grade_history.student_id and public.can_access_dojo(s.dojo_id))
);

create policy "topics_read_all" on public.training_topics for select using (auth.uid() is not null);
create policy "topics_admin_all" on public.training_topics for all using (public.is_admin()) with check (public.is_admin());

create policy "trainings_read_assigned_dojo" on public.trainings for select using (public.can_access_dojo(dojo_id));
create policy "trainings_insert_assigned_dojo" on public.trainings for insert with check (public.can_access_dojo(dojo_id));
create policy "trainings_update_assigned_dojo" on public.trainings for update using (public.can_access_dojo(dojo_id)) with check (public.can_access_dojo(dojo_id));

create policy "attendance_read_assigned_dojo" on public.attendance for select using (
  exists (select 1 from public.trainings t where t.id = attendance.training_id and public.can_access_dojo(t.dojo_id))
);
create policy "attendance_insert_assigned_dojo" on public.attendance for insert with check (
  exists (
    select 1 from public.trainings t
    join public.students s on s.id = attendance.student_id
    where t.id = attendance.training_id and s.dojo_id = t.dojo_id and public.can_access_dojo(t.dojo_id)
  )
);
create policy "attendance_update_assigned_dojo" on public.attendance for update using (
  exists (select 1 from public.trainings t where t.id = attendance.training_id and public.can_access_dojo(t.dojo_id))
) with check (
  exists (
    select 1 from public.trainings t
    join public.students s on s.id = attendance.student_id
    where t.id = attendance.training_id and s.dojo_id = t.dojo_id and public.can_access_dojo(t.dojo_id)
  )
);

create policy "email_logs_read_assigned" on public.email_logs for select using (dojo_id is null or public.can_access_dojo(dojo_id));
create policy "email_logs_insert_assigned" on public.email_logs for insert with check (dojo_id is null or public.can_access_dojo(dojo_id));

insert into public.training_topics (name, description) values
('Kihon', 'Základné techniky'),
('Kata', 'Formy a zostavy'),
('Kumite', 'Zápasové cvičenia'),
('Kondícia', 'Fyzická príprava'),
('Skúškové techniky', 'Príprava na technické stupne')
on conflict (name) do nothing;

insert into public.dojos (name, address) values
('DOKAN Petrzalka', 'Bratislava - Petrzalka'),
('DOKAN Ruzinov', 'Bratislava - Ruzinov'),
('DOKAN Krasnany', 'Bratislava - Krasnany'),
('DOKAN Kysucke Nove Mesto', 'Kysucke Nove Mesto')
on conflict (name) do nothing;

-- Po vytvorení usera v Authentication spusti:
-- insert into public.profiles (id, email, full_name, role)
-- values ('SEM_DAJ_AUTH_USER_UID', 'mino.poliak@gmail.com', 'Mino Poliak', 'admin')
-- on conflict (id) do update set role = 'admin';
--
-- insert into public.dojo_trainers (dojo_id, trainer_id)
-- select id, 'SEM_DAJ_AUTH_USER_UID' from public.dojos
-- on conflict (dojo_id, trainer_id) do nothing;
