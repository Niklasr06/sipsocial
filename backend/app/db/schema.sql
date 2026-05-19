-- SipSocial Postgres schema.
-- Idempotent: each statement uses IF NOT EXISTS so initialization can run
-- on every startup without erroring against an already-populated cluster.

-- Long-lived refresh tokens, used to mint fresh access JWTs without forcing
-- a re-login. We store the SHA-256 hash so a leaked DB dump can't be
-- replayed against the API. ``revoked_at`` lets us invalidate a single
-- token on logout.
CREATE TABLE IF NOT EXISTS refresh_tokens (
  token_hash  TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at  TIMESTAMPTZ NOT NULL,
  revoked_at  TIMESTAMPTZ,
  last_used_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS refresh_tokens_user ON refresh_tokens (user_id);
CREATE INDEX IF NOT EXISTS refresh_tokens_active
  ON refresh_tokens (user_id) WHERE revoked_at IS NULL;

-- Single-use password reset tokens. Hashed so a leaked DB dump can't
-- be used to reset arbitrary user passwords.
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  token_hash  TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at  TIMESTAMPTZ NOT NULL,
  used_at     TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS password_reset_tokens_user
  ON password_reset_tokens (user_id) WHERE used_at IS NULL;

CREATE TABLE IF NOT EXISTS users (
  id                  TEXT PRIMARY KEY,
  pseudonym           TEXT NOT NULL,
  email               TEXT NOT NULL,
  password_hash       TEXT,
  age_range           TEXT NOT NULL DEFAULT '25-34',
  bio                 TEXT NOT NULL DEFAULT '',
  interests           TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  meeting_preference  TEXT NOT NULL DEFAULT 'both',
  privacy_settings    JSONB NOT NULL DEFAULT '{"hide_bio":false,"share_only_area":true}'::jsonb,
  no_show_count       INTEGER NOT NULL DEFAULT 0,
  trust_status        TEXT NOT NULL DEFAULT 'trusted',
  initials            TEXT NOT NULL DEFAULT '',
  accent_color        TEXT NOT NULL DEFAULT '#7A4E2D',
  match_age_ranges    TEXT[] NOT NULL DEFAULT ARRAY['18-24','25-34','35-44','45+']::TEXT[],
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- Add password column on databases that pre-date the auth migration.
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT;
-- Expo push token. Nullable; we register lazily after the user grants
-- notification permission. Multiple devices per user would need a separate
-- table — for MVP one slot per user is fine.
ALTER TABLE users ADD COLUMN IF NOT EXISTS expo_push_token TEXT;
-- Match-Präferenz fürs Alter. Default = alle Bereiche, damit Bestand
-- nach der Migration nicht plötzlich keine Matches mehr bekommt.
ALTER TABLE users ADD COLUMN IF NOT EXISTS match_age_ranges TEXT[]
  NOT NULL DEFAULT ARRAY['18-24','25-34','35-44','45+']::TEXT[];
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

-- One-way blocks. (a, b) means a doesn't want to see b — matching needs to
-- skip a pair if EITHER side blocked the other, so the lookup queries OR
-- both directions.
CREATE TABLE IF NOT EXISTS blocks (
  blocker_id   TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  blocked_id   TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reason       TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (blocker_id, blocked_id)
);
CREATE INDEX IF NOT EXISTS blocks_blocked ON blocks (blocked_id);

-- User-submitted reports. Kept lean: no moderation workflow yet, just the
-- bare minimum so the data is captured for a future admin tool.
CREATE TABLE IF NOT EXISTS reports (
  id            TEXT PRIMARY KEY,
  reporter_id   TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reported_id   TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  match_id      TEXT,
  reason        TEXT NOT NULL,
  details       TEXT NOT NULL DEFAULT '',
  status        TEXT NOT NULL DEFAULT 'open',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS reports_reported ON reports (reported_id);
