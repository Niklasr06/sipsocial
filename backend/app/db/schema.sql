-- SipSocial Postgres schema.
-- Idempotent: each statement uses IF NOT EXISTS so initialization can run
-- on every startup without erroring against an already-populated cluster.

CREATE TABLE IF NOT EXISTS users (
  id                  TEXT PRIMARY KEY,
  pseudonym           TEXT NOT NULL,
  email               TEXT NOT NULL,
  password_hash       TEXT,
  age_range           TEXT NOT NULL DEFAULT '25-34',
  bio                 TEXT NOT NULL DEFAULT '',
  interests           TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  meeting_preference  TEXT NOT NULL DEFAULT 'both',
  privacy_settings    JSONB NOT NULL DEFAULT '{"hide_exact_age":false,"hide_bio":false,"share_only_area":true}'::jsonb,
  no_show_count       INTEGER NOT NULL DEFAULT 0,
  trust_status        TEXT NOT NULL DEFAULT 'trusted',
  initials            TEXT NOT NULL DEFAULT '',
  accent_color        TEXT NOT NULL DEFAULT '#7A4E2D',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- Add password column on databases that pre-date the auth migration.
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT;
-- Expo push token. Nullable; we register lazily after the user grants
-- notification permission. Multiple devices per user would need a separate
-- table — for MVP one slot per user is fine.
ALTER TABLE users ADD COLUMN IF NOT EXISTS expo_push_token TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique ON users (lower(email));

CREATE TABLE IF NOT EXISTS availabilities (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date        DATE NOT NULL,
  start_time  TIME NOT NULL,
  end_time    TIME NOT NULL,
  area        TEXT NOT NULL,
  lat         DOUBLE PRECISION,
  lng         DOUBLE PRECISION,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS availabilities_user_date ON availabilities (user_id, date);

CREATE TABLE IF NOT EXISTS cafes (
  id              TEXT PRIMARY KEY,
  place_id        TEXT,
  name            TEXT NOT NULL,
  address         TEXT NOT NULL DEFAULT '',
  area            TEXT NOT NULL,
  opening_hours   TEXT NOT NULL DEFAULT '',
  rating          DOUBLE PRECISION NOT NULL DEFAULT 0,
  atmosphere      TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  distance_mock   TEXT NOT NULL DEFAULT '',
  emoji           TEXT NOT NULL DEFAULT '☕',
  lat             DOUBLE PRECISION,
  lng             DOUBLE PRECISION,
  source          TEXT NOT NULL DEFAULT 'mock',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- Partial unique index: only enforced when place_id is set (Google Places hits).
CREATE UNIQUE INDEX IF NOT EXISTS cafes_place_id_unique
  ON cafes (place_id) WHERE place_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS cafes_area ON cafes (area);

CREATE TABLE IF NOT EXISTS matches (
  id                    TEXT PRIMARY KEY,
  user_a_id             TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_b_id             TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  score                 INTEGER NOT NULL,
  shared_interests      TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  suggested_cafe_id     TEXT,
  suggested_date        DATE NOT NULL,
  suggested_start_time  TIME NOT NULL,
  suggested_end_time    TIME NOT NULL,
  meeting_preference    TEXT NOT NULL DEFAULT 'both',
  status                TEXT NOT NULL DEFAULT 'suggested',
  reasons               JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS matches_pair ON matches (user_a_id, user_b_id);

CREATE TABLE IF NOT EXISTS meetings (
  id          TEXT PRIMARY KEY,
  match_id    TEXT NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  cafe_id     TEXT NOT NULL,
  date        DATE NOT NULL,
  start_time  TIME NOT NULL,
  end_time    TIME NOT NULL,
  status      TEXT NOT NULL DEFAULT 'confirmed',
  qr_code     TEXT NOT NULL,
  check_ins   JSONB NOT NULL DEFAULT '[]'::jsonb,
  reminder_sent_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- Idempotent migration for databases created before the reminder column.
ALTER TABLE meetings ADD COLUMN IF NOT EXISTS reminder_sent_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS meetings_match ON meetings (match_id);
CREATE INDEX IF NOT EXISTS meetings_reminder ON meetings (reminder_sent_at) WHERE reminder_sent_at IS NULL;

CREATE TABLE IF NOT EXISTS chat_messages (
  id                 TEXT PRIMARY KEY,
  match_id           TEXT NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  sender_id          TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  encrypted_text     TEXT NOT NULL,
  message_number     INTEGER NOT NULL,
  blocked            BOOLEAN NOT NULL DEFAULT FALSE,
  privacy_warnings   TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS chat_messages_match ON chat_messages (match_id, message_number);

CREATE TABLE IF NOT EXISTS icebreakers (
  id         TEXT PRIMARY KEY,
  match_id   TEXT NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  interest   TEXT NOT NULL,
  questions  TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS icebreakers_match ON icebreakers (match_id);
