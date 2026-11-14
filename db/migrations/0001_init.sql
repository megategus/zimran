-- Counter Check schema. All access goes through server route handlers with the service role key,
-- filtered by the guest id cookie. RLS is on with no policies, so the anon key reads nothing.

create table cars (
  id uuid primary key default gen_random_uuid(),
  guest_id text not null,
  vin text,
  year int not null,
  make text not null,
  model text not null,
  trim text,
  drivetrain text check (drivetrain in ('fwd', 'rwd', 'awd', '4wd')),
  fuel text check (fuel in ('gas', 'diesel', 'hybrid', 'ev')),
  state char(2) not null,
  mileage int not null check (mileage >= 0),
  original_owner bool not null default true,
  purchase_date date,
  is_sample bool not null default false,
  created_at timestamptz not null default now()
);

create table service_records (
  id uuid primary key default gen_random_uuid(),
  guest_id text not null,
  asset_type text not null default 'car',
  asset_id uuid not null references cars (id) on delete cascade,
  service_date date not null,
  mileage int not null check (mileage >= 0),
  source text not null check (source in ('manual', 'voice', 'quote', 'import')),
  shop text,
  lines jsonb not null default '[]',
  total_cents int not null default 0,
  is_sample bool not null default false,
  created_at timestamptz not null default now()
);

create table quote_checks (
  id uuid primary key default gen_random_uuid(),
  guest_id text not null,
  car_id uuid not null references cars (id) on delete cascade,
  input_kind text not null check (input_kind in ('photo', 'text', 'sample')),
  raw_text text,
  image_path text,
  parsed jsonb,
  verdict jsonb,
  overpay_cents int,
  is_sample bool not null default false,
  created_at timestamptz not null default now()
);

create table reminders (
  id uuid primary key default gen_random_uuid(),
  guest_id text not null,
  car_id uuid not null references cars (id) on delete cascade,
  service_key text not null,
  due_mileage int,
  due_date date,
  status text not null default 'open' check (status in ('open', 'done', 'dismissed')),
  created_at timestamptz not null default now()
);

create table documents (
  id uuid primary key default gen_random_uuid(),
  guest_id text not null,
  car_id uuid not null references cars (id) on delete cascade,
  kind text not null,
  file_path text,
  expires_on date,
  is_sample bool not null default false,
  created_at timestamptz not null default now()
);

-- Plan and free-tier counters per guest.
create table entitlements (
  guest_id text primary key,
  plan text not null default 'free' check (plan in ('free', 'plus')),
  stripe_session_id text,
  assistant_day date,
  assistant_count int not null default 0,
  checks_month text,
  checks_count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index cars_guest_idx on cars (guest_id);
create index service_records_guest_asset_idx on service_records (guest_id, asset_id);
create index quote_checks_guest_car_idx on quote_checks (guest_id, car_id);
create index reminders_guest_car_idx on reminders (guest_id, car_id);
create index documents_guest_car_idx on documents (guest_id, car_id);

alter table cars enable row level security;
alter table service_records enable row level security;
alter table quote_checks enable row level security;
alter table reminders enable row level security;
alter table documents enable row level security;
alter table entitlements enable row level security;

insert into storage.buckets (id, name, public) values ('uploads', 'uploads', false)
on conflict (id) do nothing;
