# DOKAN Complete App Login Ready

Táto verzia už obsahuje `.env.local` s URL aj kľúčom, ktoré si poslal.

## Spustenie

```bash
npm install
npm run dev
```

Potom otvor:

```text
http://localhost:3000/login
```

## Supabase databáza

V Supabase SQL Editore spusti súbor:

```text
supabase/schema.sql
```

Potom vytvor používateľa v:

```text
Authentication → Users → Add user → Create new user
```

Následne v SQL Editore spusti tieto príkazy a nahraď `SEM_DAJ_AUTH_USER_UID` reálnym User UID:

```sql
insert into public.profiles (id, email, full_name, role)
values ('SEM_DAJ_AUTH_USER_UID', 'mino.poliak@gmail.com', 'Mino Poliak', 'admin')
on conflict (id) do update set role = 'admin';

insert into public.dojo_trainers (dojo_id, trainer_id)
select id, 'SEM_DAJ_AUTH_USER_UID' from public.dojos
on conflict (dojo_id, trainer_id) do nothing;
```

Ak login píše nesprávne heslo, problém je v Supabase Authentication userovi alebo hesle.
Použi `Send password recovery` alebo vytvor usera nanovo s Auto Confirm User.
