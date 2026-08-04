create table employees (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  color text not null default '#2563eb',
  role text not null check (role in ('employee', 'manager', 'admin')),
  seniority_level text not null check (seniority_level in ('new', 'regular', 'senior', 'shift_lead')),
  can_open boolean not null default false,
  can_close boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table shift_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  start_time time not null,
  end_time time not null,
  type text not null check (type in ('opening', 'middle', 'middle_2', 'closing')),
  required_employees integer not null default 1,
  requires_senior_employee boolean not null default false,
  active boolean not null default true
);

create table availability (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees(id),
  date date not null,
  status text not null check (status in ('available', 'unavailable', 'preferred', 'only_if_needed')),
  note text,
  unique(employee_id, date)
);

create table scheduled_shifts (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  shift_template_id uuid not null references shift_templates(id),
  status text not null check (status in ('draft', 'published')),
  created_at timestamptz not null default now(),
  published_at timestamptz
);

create table scheduled_shift_employees (
  scheduled_shift_id uuid not null references scheduled_shifts(id) on delete cascade,
  employee_id uuid not null references employees(id),
  primary key (scheduled_shift_id, employee_id)
);

create table swap_requests (
  id uuid primary key default gen_random_uuid(),
  requested_by_employee_id uuid not null references employees(id),
  original_shift_id uuid not null references scheduled_shifts(id),
  target_employee_id uuid not null references employees(id),
  target_shift_id uuid references scheduled_shifts(id),
  status text not null check (status in ('pending_employee', 'pending_manager', 'approved', 'rejected')),
  reason text not null,
  manager_note text,
  created_at timestamptz not null default now()
);

create table swap_request_logs (
  id uuid primary key default gen_random_uuid(),
  swap_request_id uuid not null references swap_requests(id) on delete cascade,
  actor_employee_id uuid references employees(id),
  action text not null,
  note text,
  created_at timestamptz not null default now()
);
