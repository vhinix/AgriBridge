-- ============================================================
-- AgriBridge · Supabase setup (schema + security + seed data)
-- Paste this whole file into: Supabase dashboard → SQL Editor → Run
--
-- ⚠ DO THIS FIRST (before the SEED section links to it):
--   Supabase dashboard → Authentication → Users → "Add user"
--   Email:    d.aker@benueadp.gov.ng
--   Password: (choose one — this is the officer login for the demo)
--   Then run this whole file. The seed auto-links to that user by email.
-- ============================================================

create extension if not exists "pgcrypto";

-- ============================================================
-- 1 · TABLES
-- ============================================================

-- Extension officer profile (one row per auth user)
create table if not exists profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  full_name  text not null,
  role       text not null default 'Extension Officer',
  agency     text,
  region     text,
  phone      text,
  created_at timestamptz default now()
);

-- Farmers managed by an officer
create table if not exists farmers (
  id            uuid primary key default gen_random_uuid(),
  officer_id    uuid references profiles(id) on delete set null,
  full_name     text not null,
  phone         text,               -- SMS relay target
  lga           text,
  region        text,
  farm_size     text,
  primary_crop  text,
  registered_at date default now(),
  created_at    timestamptz default now()
);

-- Crop-disease diagnoses (also the signal for pest alerts)
create table if not exists diagnoses (
  id             uuid primary key default gen_random_uuid(),
  farmer_id      uuid references farmers(id) on delete cascade,
  officer_id     uuid references profiles(id) on delete set null,
  image_url      text,
  disease_name   text,
  confidence     numeric,           -- 0..1
  recommendation text,
  region         text,
  created_at     timestamptz default now()
);

-- System-generated alerts (weather / pest / crop_recommendation)
create table if not exists alerts (
  id          uuid primary key default gen_random_uuid(),
  type        text not null check (type in ('weather','pest','crop_recommendation')),
  severity    text default 'Info',   -- Info | Advisory | Urgent
  region      text,
  title       text not null,
  short       text,
  description text,
  source      text,                  -- weather_api | diagnosis_cluster | crop_service
  created_at  timestamptz default now()
);

-- Record of an officer relaying an alert to farmers (SMS stub for MVP)
create table if not exists alert_relays (
  id         uuid primary key default gen_random_uuid(),
  alert_id   uuid references alerts(id) on delete cascade,
  officer_id uuid references profiles(id) on delete set null,
  farmer_ids uuid[] default '{}',
  sms_text   text,
  status     text default 'sent',    -- sent | failed | stub
  created_at timestamptz default now()
);

-- Activity feed backbone (every meaningful write appends one row)
create table if not exists activities (
  id         uuid primary key default gen_random_uuid(),
  officer_id uuid references profiles(id) on delete set null,
  type       text not null,          -- farmer_added | diagnosis_logged | alert_relayed
  entity_id  uuid,
  summary    text,
  created_at timestamptz default now()
);

-- Crop recommendation lookup (the "location + season → crops" knowledge)
create table if not exists region_crops (
  id              uuid primary key default gen_random_uuid(),
  region          text not null,
  season          text not null check (season in ('wet','dry')),
  crop            text not null,
  yield_outlook   text,              -- High | Good | Moderate
  planting_window text,
  notes           text
);

-- Input-supply directory (Resources screen)
create table if not exists resources (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  category    text,                  -- Seed | Fertiliser | Agro-chemical | Equipment | Planting material
  supplier    text,
  location    text,
  price       text,
  description text,
  created_at  timestamptz default now()
);

-- Learning content (Training hub screen)
create table if not exists training (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  category    text,                  -- Article | Video | Guide | Tip sheet
  url         text,
  description text,
  created_at  timestamptz default now()
);

-- ============================================================
-- 2 · AUTH: auto-create a profile whenever a new user signs up
--     (so signup "just works" without a manual profile insert)
-- ============================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (new.id,
          coalesce(new.raw_user_meta_data->>'full_name', 'New Officer'),
          'Extension Officer')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- 3 · ROW LEVEL SECURITY
--     MVP policy: any signed-in user can read/write.
--     Simple and safe for a single-officer demo; tighten later
--     (e.g. officer_id = auth.uid()) when you go multi-officer.
-- ============================================================
do $$
declare t text;
begin
  foreach t in array array['profiles','farmers','diagnoses','alerts',
                           'alert_relays','activities','region_crops','resources','training']
  loop
    execute format('alter table %I enable row level security;', t);
    execute format('drop policy if exists "authenticated_all" on %I;', t);
    execute format(
      'create policy "authenticated_all" on %I for all to authenticated using (true) with check (true);', t);
  end loop;
end $$;

-- ============================================================
-- 4 · SEED DATA (realistic Benue State ADP content)
--     Requires the auth user d.aker@benueadp.gov.ng to exist (see top).
-- ============================================================

-- Officer profile
insert into profiles (id, full_name, role, agency, region, phone)
select id, 'Dooshima Aker', 'Extension Officer', 'Benue State ADP', 'Benue — Makurdi zone', '+234 803 000 0001'
from auth.users where email = 'd.aker@benueadp.gov.ng'
on conflict (id) do update set
  full_name = excluded.full_name, agency = excluded.agency, region = excluded.region;

-- Farmers
insert into farmers (officer_id, full_name, phone, lga, region, farm_size, primary_crop, registered_at)
select p.id, v.full_name, v.phone, v.lga, 'Benue', v.farm_size, v.primary_crop, v.reg::date
from profiles p
cross join (values
  ('Terhemba Akaa',  '+234 803 412 7781', 'Makurdi',     '3.2 ha', 'Yam',     '2026-03-14'),
  ('Adaeze Okonkwo', '+234 806 552 1039', 'Gboko',       '1.8 ha', 'Cassava', '2026-04-02'),
  ('Sule Danjuma',   '+234 812 907 4416', 'Guma',        '5.0 ha', 'Rice',    '2026-04-19'),
  ('Grace Ityavyar', '+234 705 331 8820', 'Vandeikya',   '2.4 ha', 'Soybean', '2026-04-27'),
  ('Iorwuese Ugba',  '+234 809 664 2073', 'Katsina-Ala', '4.1 ha', 'Sesame',  '2026-05-11')
) as v(full_name, phone, lga, farm_size, primary_crop, reg)
where p.full_name = 'Dooshima Aker'
and not exists (select 1 from farmers f where f.full_name = v.full_name);

-- A couple of diagnoses (feed the pest-alert story)
insert into diagnoses (farmer_id, officer_id, disease_name, confidence, recommendation, region)
select f.id, f.officer_id, d.disease_name, d.confidence, d.recommendation, 'Benue'
from farmers f
join (values
  ('Adaeze Okonkwo', 'Cassava Mosaic Disease', 0.91, 'Remove and burn infected plants; use resistant TMS varieties next cycle.'),
  ('Sule Danjuma',   'Rice Blast',             0.84, 'Apply recommended fungicide; avoid excess nitrogen; keep bunds weed-free.')
) as d(farmer_name, disease_name, confidence, recommendation)
  on d.farmer_name = f.full_name
where not exists (select 1 from diagnoses x where x.farmer_id = f.id);

-- Alerts (one of each type)
insert into alerts (type, severity, region, title, short, description, source)
select * from (values
  ('weather','Urgent','Benue — Makurdi zone',
    'Heavy rainfall warning — next 72 hours',
    '90–120 mm forecast across Katsina-Ala, Ushongo and Kwande from Thursday.',
    'Clear drainage between yam ridges, stake young plants, and hold fertiliser until the ground settles — broadcast urea applied now will wash off.',
    'weather_api'),
  ('pest','Advisory','Benue — Gboko zone',
    'Cassava mosaic cases rising in Gboko',
    'Multiple cassava mosaic diagnoses logged nearby this week.',
    'Inspect cassava for yellow mottling and distorted leaves. Rogue out and burn infected stands; source cuttings only from certified, resistant varieties.',
    'diagnosis_cluster'),
  ('crop_recommendation','Info','Benue — Makurdi zone',
    'Plant for the wet season now',
    'Yam, cassava, rice, soybean and maize are the strong choices this season.',
    'With the rains setting in across the Makurdi zone, these crops give the best yield outlook. Prioritise certified soybean seed for the export demand.',
    'crop_service')
) as v
where not exists (select 1 from alerts a where a.title = v.column4);

-- Recent activity
insert into activities (officer_id, type, summary, created_at)
select p.id, v.type, v.summary, now() - (v.mins || ' minutes')::interval
from profiles p
cross join (values
  ('diagnosis_logged','Logged diagnosis (Rice Blast) for Sule Danjuma','35'),
  ('farmer_added','Registered new farmer Iorwuese Ugba','180'),
  ('alert_relayed','Relayed rainfall warning to 4 farmers in Makurdi','420')
) as v(type, summary, mins)
where p.full_name = 'Dooshima Aker'
and not exists (select 1 from activities a where a.summary = v.summary);

-- Crop recommendation knowledge (region + season → crops)
insert into region_crops (region, season, crop, yield_outlook, planting_window, notes)
select * from (values
  -- Middle Belt (Benue)
  ('Middle Belt','wet','Yam','High','Mar–May','Staple; mound early with the first rains'),
  ('Middle Belt','wet','Cassava','High','Apr–Jun','Tolerant; plant certified resistant cuttings'),
  ('Middle Belt','wet','Rice','Good','May–Jul','Best in fadama / lowland plots'),
  ('Middle Belt','wet','Soybean','Good','Jun–Jul','Strong market demand; inoculate seed'),
  ('Middle Belt','wet','Maize','Good','Apr–Jun','Two cycles possible with good rains'),
  ('Middle Belt','dry','Tomato','Moderate','Nov–Jan','Irrigation required; watch for blight'),
  ('Middle Belt','dry','Vegetables','Moderate','Nov–Feb','Fadama dry-season farming'),
  -- Northern (Sudan/Sahel)
  ('Northern','wet','Millet','High','Jun–Jul','Drought-tolerant staple'),
  ('Northern','wet','Sorghum','High','Jun–Jul','Reliable in low-rainfall zones'),
  ('Northern','wet','Groundnut','Good','Jun–Jul','Improves soil; good cash crop'),
  ('Northern','wet','Cowpea','Good','Jul–Aug','Short cycle; intercrop with cereals'),
  ('Northern','dry','Onion','High','Nov–Feb','Irrigated; strong dry-season earner'),
  ('Northern','dry','Wheat','Moderate','Nov–Dec','Irrigated schemes only'),
  ('Northern','dry','Pepper','Good','Nov–Jan','Irrigated; high market value'),
  -- Southern (South-South / South-East)
  ('Southern','wet','Cassava','High','Mar–Jun','Year-round staple'),
  ('Southern','wet','Plantain','High','Apr–Jun','Suits high-rainfall belt'),
  ('Southern','wet','Oil palm','High','Apr–Jul','Long-term tree crop'),
  ('Southern','wet','Cocoyam','Good','Apr–Jun','Shade-tolerant; intercrop'),
  ('Southern','dry','Vegetables','Moderate','Nov–Feb','Fluted pumpkin, waterleaf near water')
) as v
where not exists (select 1 from region_crops r where r.region = v.column1 and r.season = v.column2 and r.crop = v.column3);

-- Input-supply directory (Resources screen)
insert into resources (title, category, supplier, location, price, description)
select * from (values
  ('TMS Cassava Cuttings (resistant)','Planting material','Benue ADP Depot','Makurdi','₦3,500 / bundle','Mosaic-resistant improved cuttings'),
  ('Certified Soybean Seed (TGx)','Seed','Seedco Agent','Gboko','₦8,000 / 5kg','High-yield, inoculant-ready'),
  ('NPK 20:10:10','Fertiliser','Notore Dealer','Makurdi','₦32,000 / 50kg','General-purpose basal fertiliser'),
  ('Urea 46%','Fertiliser','Notore Dealer','Makurdi','₦30,000 / 50kg','Top-dressing nitrogen'),
  ('Mancozeb Fungicide','Agro-chemical','AgroServe','Gboko','₦4,200 / kg','Controls blight and blast'),
  ('Knapsack Sprayer 16L','Equipment','AgroServe','Makurdi','₦18,000','Manual field sprayer')
) as v
where not exists (select 1 from resources r where r.title = v.column1);

-- Training hub content
insert into training (title, category, url, description)
select * from (values
  ('Spotting cassava mosaic early','Article','#','Field signs and what to do this week'),
  ('Staking yam after heavy rain','Video','#','2-minute demo for young vines'),
  ('Soybean inoculation guide','Guide','#','Step-by-step for better nodulation'),
  ('Dry-season onion tips','Tip sheet','#','Irrigation and spacing basics'),
  ('Reading a weather alert','Article','#','Turning a forecast into farmer action'),
  ('Safe agro-chemical handling','Tip sheet','#','Protective steps every farmer should take')
) as v
where not exists (select 1 from training t where t.title = v.column1);

-- ============================================================
-- Done. Sign in to the app with d.aker@benueadp.gov.ng and the
-- password you set. Everything below is real, queryable data.
-- ============================================================
