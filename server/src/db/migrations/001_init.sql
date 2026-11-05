CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  display_name varchar(80) NOT NULL,
  currency char(3) NOT NULL DEFAULT 'PHP',
  timezone text NOT NULL DEFAULT 'Asia/Manila',
  theme text NOT NULL DEFAULT 'system' CHECK (theme IN ('light','dark','system')),
  budget_method text NOT NULL DEFAULT 'daily_pace' CHECK (budget_method IN ('daily_pace','category_limits','simple_total')),
  onboarding_completed boolean NOT NULL DEFAULT false,
  biometric_enabled boolean NOT NULL DEFAULT false,
  notifications jsonb NOT NULL DEFAULT '{"daily_reminder":false,"daily_reminder_time":"20:00","budget_50":true,"budget_75":true,"budget_90":true,"budget_100":true,"category_overspend":true,"cycle_ending_soon":true,"cycle_ending_days":2,"savings_progress":true}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash char(64) NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX sessions_user_idx ON sessions(user_id);
CREATE INDEX sessions_expiry_idx ON sessions(expires_at);

CREATE TABLE categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name varchar(50) NOT NULL,
  is_savings boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id, user_id),
  UNIQUE (user_id, name)
);

CREATE TABLE budget_cycles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name varchar(80) NOT NULL,
  frequency text NOT NULL CHECK (frequency IN ('weekly','biweekly','monthly','custom')),
  start_date date NOT NULL,
  end_date date NOT NULL,
  total_amount numeric(12,2) NOT NULL CHECK (total_amount >= 0),
  carried_over_amount numeric(12,2) NOT NULL DEFAULT 0 CHECK (carried_over_amount >= 0),
  savings_allocation numeric(12,2) NOT NULL DEFAULT 0 CHECK (savings_allocation >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (end_date >= start_date),
  CHECK (savings_allocation <= total_amount + carried_over_amount),
  UNIQUE (id, user_id),
  EXCLUDE USING gist (user_id WITH =, daterange(start_date, end_date, '[]') WITH &&)
);
CREATE INDEX budget_cycles_user_dates_idx ON budget_cycles(user_id, start_date, end_date);

CREATE TABLE cycle_category_budgets (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  cycle_id uuid NOT NULL,
  category_id uuid NOT NULL,
  limit_amount numeric(12,2) CHECK (limit_amount IS NULL OR limit_amount >= 0),
  PRIMARY KEY (cycle_id, category_id),
  FOREIGN KEY (cycle_id, user_id) REFERENCES budget_cycles(id, user_id) ON DELETE CASCADE,
  FOREIGN KEY (category_id, user_id) REFERENCES categories(id, user_id) ON DELETE CASCADE
);

CREATE TABLE transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount numeric(12,2) NOT NULL CHECK (amount > 0),
  occurred_at timestamptz NOT NULL,
  merchant varchar(120) NOT NULL,
  category_id uuid NOT NULL,
  payment_method text NOT NULL CHECK (payment_method IN ('gcash','maya','cash','bank_transfer','other')),
  description varchar(500),
  source text NOT NULL DEFAULT 'manual' CHECK (source IN ('manual','screenshot','receipt')),
  ocr_status text NOT NULL DEFAULT 'not_applicable' CHECK (ocr_status IN ('not_applicable','succeeded','corrected','failed')),
  external_reference varchar(120),
  is_splurge boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (category_id, user_id) REFERENCES categories(id, user_id) ON DELETE CASCADE,
  UNIQUE (id, user_id)
);
CREATE INDEX transactions_user_date_idx ON transactions(user_id, occurred_at DESC);
CREATE INDEX transactions_user_category_idx ON transactions(user_id, category_id, occurred_at DESC);
CREATE UNIQUE INDEX transactions_external_reference_unique ON transactions(user_id, payment_method, external_reference) WHERE external_reference IS NOT NULL;

CREATE TABLE transaction_receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  transaction_id uuid NOT NULL,
  file_name varchar(180) NOT NULL,
  mime_type varchar(80) NOT NULL,
  size_bytes bigint NOT NULL CHECK (size_bytes > 0 AND size_bytes <= 15000000),
  sha256 char(64) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (transaction_id, user_id) REFERENCES transactions(id, user_id) ON DELETE CASCADE,
  UNIQUE (transaction_id, sha256)
);

CREATE TABLE savings_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name varchar(80) NOT NULL,
  target_amount numeric(12,2) NOT NULL CHECK (target_amount > 0),
  target_date date,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id, user_id)
);
CREATE TABLE savings_contributions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  goal_id uuid NOT NULL,
  amount numeric(12,2) NOT NULL CHECK (amount > 0),
  contributed_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (goal_id, user_id) REFERENCES savings_goals(id, user_id) ON DELETE CASCADE
);
CREATE INDEX savings_contributions_goal_idx ON savings_contributions(goal_id, contributed_at);
