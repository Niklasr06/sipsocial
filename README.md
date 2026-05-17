# SipSocial

Sichere, anonyme Café-Begegnungen — gebaut als Mobile-App-Prototyp mit
**React Native + Expo (SDK 54)** im Frontend und einem **FastAPI +
Neon Postgres** Backend.

> SipSocial ist **keine** Dating-App. Es geht um echte Treffen bei einem
> Kaffee, mit Datenschutz, klaren Grenzen und einem fairen Vertrauenssystem.

---

## TL;DR

| Setup                 | Befehl                                                  |
| --------------------- | ------------------------------------------------------- |
| **Frontend starten**  | `npm install && npx expo start`                         |
| **Backend starten**   | siehe „Backend lokal starten" weiter unten              |
| **Ohne Backend?**     | App läuft mit den eingebauten Mock-Daten weiter         |
| **Ohne Google Key?**  | Café-Vorschläge kommen aus den Mock-Cafés               |
| **Ohne Anthropic Key?** | Icebreaker kommen aus der Template-Bank statt LLM     |
| **Ohne DB?**          | Backend startet im Mock-Only-Modus, kein Datenverlust   |

---

## Projektstruktur

```
SipSocial/
├── App.tsx                      # Expo-Root: ErrorBoundary, PhoneFrame, NavCont.
├── package.json / tsconfig.json
├── .env.example                 # Frontend-Variablen
├── README.md
├── src/
│   ├── components/              # UI-Bausteine (inkl. CafeMap, PhoneFrame)
│   ├── config/apiConfig.ts      # Liest EXPO_PUBLIC_*
│   ├── data/                    # Lokale Mock-Daten (Fallback)
│   ├── navigation/              # Stacks + Tabs
│   ├── screens/                 # Alle App-Screens (inkl. Login/Register)
│   ├── components/CafeMap.web.tsx # Leaflet-basierte OSM-Karte für Web
│   ├── components/UserActionsSheet.tsx # Block + Report Modal
│   ├── components/EmptyState.tsx  # Wiederverwendbarer Empty-State
│   ├── services/                # *Api.ts (Backend) + lokale Services
│   │   ├── apiClient.ts         # Zentraler fetch-Wrapper + Bearer + 401-Retry
│   │   ├── authApi.ts           # /register, /login, /refresh, /me, /password-reset/*
│   │   ├── blockApi.ts          # /blocks, /reports
│   │   ├── tokenStore.ts        # Access + Refresh in AsyncStorage
│   │   ├── pushService.ts       # Expo-Notifications: Permission + Token-Reg.
│   │   └── ...
│   ├── store/AppContext.tsx     # zentraler App-State + Auth-Bootstrap
│   ├── theme/                   # Farben, Typo, Spacing
│   ├── types/
│   └── utils/                   # Datum, ID, lokale Mock-Crypto
└── backend/
    ├── main.py                  # uvicorn-Eintrittspunkt
    ├── requirements.txt
    ├── .env.example
    └── app/
        ├── api/                 # FastAPI-Routes
        │   ├── auth.py                # /register, /login, /me
        │   └── ...
        ├── core/
        │   ├── config.py        # Pydantic-Settings (liest .env)
        │   ├── security.py      # Bearer-Auth-Dependency (JWT)
        │   └── rate_limit.py    # slowapi Limiter (für auth.py geteilt)
        ├── db/
        │   ├── postgres.py      # asyncpg-Pool + Schema/Seed-Bootstrap
        │   └── schema.sql       # alle Tabellen, idempotent
        ├── models/              # Re-Exports der Pydantic-Modelle
        ├── schemas/             # Pydantic-Schemas (API + DB)
        ├── services/            # Domain-Logik
        │   ├── auth_service.py        # bcrypt + Access-JWT + Refresh-Token + QR-JWT + Reset-Token
        │   ├── block_service.py       # Blocks + Reports + Matching-Filter
        │   ├── cafe_service.py        # Google Places (v1) + primaryType-Filter + Cache
        │   ├── chat_service.py        # Fernet-verschlüsselter Chat
        │   ├── icebreaker_service.py  # LLM-first, Template-Bank-Fallback
        │   ├── llm_icebreaker.py      # Claude Haiku 4.5 + Prompt-Caching
        │   ├── matching_service.py    # Score-Berechnung + Block-Filter
        │   ├── meeting_service.py
        │   ├── notification_service.py # Expo Push Gateway
        │   ├── privacy_filter.py      # Regex-Schutz
        │   ├── reminder_service.py    # asyncio-Loop: 1h-Check-In-Reminder
        │   ├── repo.py                # date/time-Helper für asyncpg
        │   └── ...
        └── utils/crypto.py      # Fernet-Wrapper
```

---

## Frontend lokal starten

Voraussetzungen: Node.js 18+, Expo CLI (per `npx`), optional Xcode/Android Studio.

```bash
# 1. ins Projektverzeichnis
cd /Users/niklasringeisen/Claude/SipSocial

# 2. Pakete installieren
npm install

# 3. Echte Map auf nativen Geräten (optional, im Web wird der Fallback genutzt)
npx expo install react-native-maps

# 4. .env anlegen
cp .env.example .env
# In .env eintragen:
#   EXPO_PUBLIC_API_URL=http://localhost:8000   (leer = reiner Offline/Mock-Modus)
#   EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=            (optional, nur für Google-Maps-Tiles auf nativ)

# 5. App starten
npx expo start
```

Im Expo-CLI-Terminal:

- **`w`** — Web-Vorschau (mit Handy-Frame)
- **`i`** — iOS-Simulator (Xcode erforderlich)
- **`a`** — Android-Emulator
- **QR-Code scannen** mit Expo Go auf dem Smartphone

> Auf restriktiven Netzwerken (z. B. Uni-WLAN) hilft `npx expo start --tunnel`
> oder ein Handy-Hotspot, an dem sich der Mac anmeldet.

### Auf dem Handy testen (Expo Go)

Wenn die App auf dem Handy „Backend nicht erreichbar" meldet, ist meist
einer dieser drei Punkte das Problem:

1. **LAN-IP statt `localhost`:** Auf dem Smartphone ist `localhost` das
   Telefon selbst — nicht dein Mac. Trag in `.env` die LAN-IP deines Macs
   ein, z. B.:
   ```env
   EXPO_PUBLIC_API_URL=http://192.168.178.42:8000
   ```
   Die IP findest du mit `ipconfig getifaddr en0`.
2. **Backend an `0.0.0.0` binden** (siehe „Backend lokal starten") —
   nur dann ist es im LAN erreichbar.
3. **macOS-Firewall:** Beim ersten Start fragt macOS „Eingehende
   Verbindungen für Python erlauben?" → **Erlauben**. Sonst sieht dein
   Handy den Mac nicht.

Schnelltest am Handy: im Browser `http://<mac-lan-ip>:8000/api/health`
öffnen. Liefert das `{"ok":true,...}`, klappt's auch in der App.

---

## Backend lokal starten

Voraussetzungen: Python 3.10+, eine Neon-Postgres-Datenbank (oder lokales
Postgres), optional ein Google Maps API Key.

### Neon-Datenbank anlegen (~ 2 Minuten)

1. Account erstellen auf <https://neon.tech>
2. „Create Project" → Name z. B. `sipsocial`, Region nahe an dir
3. Im Dashboard auf **Connection Details** → Connection-String kopieren
   (sieht aus wie
   `postgresql://user:pwd@ep-xxx.eu-central-1.aws.neon.tech/sipsocial?sslmode=require`)

### Backend einrichten

```bash
cd backend

# 1. venv anlegen (python3 auf macOS!)
python3 -m venv venv
source venv/bin/activate
# Windows PowerShell: venv\Scripts\Activate.ps1

# 2. Abhängigkeiten
pip install -r requirements.txt

# 3. .env anlegen
cp .env.example .env
```

In `backend/.env` eintragen:

```env
# Postgres (Neon). Leer lassen → Mock-Only-Modus.
DATABASE_URL=postgresql://user:pwd@ep-xxx.eu-central-1.aws.neon.tech/sipsocial?sslmode=require

# Google Places API — optional. Ohne Key werden Mock-Cafés genutzt.
GOOGLE_MAPS_API_KEY=

# Symmetrischer Schlüssel für Chat-Verschlüsselung (Fernet, Base64).
CHAT_ENCRYPTION_KEY=

# JWT-Secret für Session-Tokens.
JWT_SECRET=
JWT_EXPIRES_HOURS=168

# Erlaubte CORS-Origins für den Expo-Dev-Server.
BACKEND_CORS_ORIGINS=http://localhost:8081,http://localhost:8082,http://localhost:19006,http://localhost:19000
```

> **Chat-Verschlüsselungsschlüssel erzeugen:**
> ```bash
> python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
> ```
>
> **JWT-Secret erzeugen:**
> ```bash
> python -c "import secrets; print(secrets.token_urlsafe(48))"
> ```

Server starten:

```bash
# nur vom Mac aus erreichbar
uvicorn main:app --reload

# fürs Testen mit dem Handy im selben WLAN: auf 0.0.0.0 binden
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

Die API läuft auf `http://localhost:8000/api/...`. Status:
`http://localhost:8000/api/health` zeigt, ob Postgres und Google Places
aktiv sind. Beim ersten Start legt das Backend das Schema an und seedet
Cafés, Demo-User und Verfügbarkeiten.

> **Lokales Postgres statt Neon?** Geht auch — `DATABASE_URL=postgresql://user:pwd@localhost:5432/sipsocial?sslmode=disable`

---

## Google Places API einrichten (optional)

Ohne Key läuft die App mit den eingebauten Mock-Cafés. Für echte Cafés:

1. **GCP-Projekt öffnen** → <https://console.cloud.google.com/>
2. **Places API (New) aktivieren** → API Library → „Places API (New)" → **Aktivieren**
   (ggf. Rechnungskonto verknüpfen — $200 Gratis-Guthaben pro Monat reichen
   für ein MVP locker).
3. **API-Key erzeugen** → Credentials → „+ API-KEY ERSTELLEN"
4. **Key einschränken (empfohlen):** API-Einschränkungen → **nur „Places API (New)"** auswählen.
   - Hinweis: „Gemini API" lässt sich nicht mit anderen APIs kombinieren —
     für Gemini einen separaten Key anlegen.
5. Key in `backend/.env` als `GOOGLE_MAPS_API_KEY=` eintragen, Backend neu starten.
6. Check: `GET http://localhost:8000/api/health` zeigt `"google_places": true`,
   und `GET /api/cafes/search?lat=48.7758&lng=9.1770` liefert Cafés mit
   `"source": "google"`.

Treffer werden in der `cafes`-Tabelle gecached (`place_id` partial-unique),
also wird derselbe Bereich nicht zweimal abgefragt.

---

## Anthropic API einrichten (optional)

Ohne Key fallen Icebreaker auf die Template-Bank zurück. Mit Key
generiert das Backend frische, kontextspezifische deutsche Fragen via
Claude Haiku 4.5.

1. Account auf <https://console.anthropic.com>, **API Keys → Create Key**.
2. Key in `backend/.env`:
   ```env
   ANTHROPIC_API_KEY=sk-ant-…
   ```
3. Backend neu starten. Sobald ein Match Icebreaker anfragt, siehst du
   im Log eine Zeile wie:
   ```
   Icebreaker LLM ok · cache_read=512 cache_write=0 input=12 output=178
   ```
   Beim ersten Call ist `cache_write` > 0, danach `cache_read` > 0 — der
   System-Prompt landet im Anthropic-Prompt-Cache.

Kosten: Haiku 4.5 ist günstig ($1 / 1M Input, $5 / 1M Output) und der
Cache-Read kostet nur ~10 % davon. Bei ein paar hundert Matches pro Tag
liegst du deutlich unter $1/Monat.

---

## Authentifizierung (Access + Refresh + Reset, Rate-Limited)

Echte Auth ist live — keine Mock-Logins mehr.

| Endpunkt                              | Body                                  | Antwort                                                                |
| ------------------------------------- | ------------------------------------- | ---------------------------------------------------------------------- |
| `POST /api/auth/register`             | `{pseudonym, email, password}`        | `{user, token, refresh_token}` — 201, oder 409 bei Email-Konflikt      |
| `POST /api/auth/login`                | `{email, password}`                   | `{user, token, refresh_token}` — 200, oder 401 (generisch)             |
| `POST /api/auth/refresh`              | `{refresh_token}`                     | `{token, refresh_token}` — 200, Token-Rotation                          |
| `POST /api/auth/logout`               | `{refresh_token}`                     | 204 No Content (revokt den Refresh-Token)                              |
| `POST /api/auth/password-reset/request` | `{email}`                           | 202 (immer — kein Email-Enumeration-Leak)                              |
| `POST /api/auth/password-reset/confirm` | `{token, new_password}`             | `{user, token, refresh_token}` — 200                                   |
| `GET  /api/auth/me`                   | Header `Authorization: Bearer …`     | `{user}` — 200                                                          |

### Architektur

- **Access-Token**: kurzlebige JWT (HS256, Default **1 h**, `JWT_EXPIRES_HOURS`).
- **Refresh-Token**: opaque, server-rotated, 90 Tage Default
  (`REFRESH_TOKEN_DAYS`). Nur als SHA-256-Hash in der
  `refresh_tokens`-Tabelle gespeichert — ein DB-Leak gibt dem Angreifer
  nichts zum Replayen.
- **Token-Rotation**: jeder `/auth/refresh`-Call revokt den verbrauchten
  Refresh-Token und gibt einen frischen aus. Ein Replay des alten Tokens
  liefert 401.
- **Passwörter**: bcrypt Cost 12.
- **Frontend**: speichert beide Tokens via `AsyncStorage`
  (`src/services/tokenStore.ts`). Der `apiClient` hat einen
  401-Retry-Loop, der einmal `/auth/refresh` aufruft und die Original-
  Anfrage wiederholt. Parallel-Requests teilen sich denselben
  Refresh-Call (Coalescing).

### Passwort-Reset

`POST /auth/password-reset/request` antwortet immer 202 — wir verraten
nicht, ob die Email existiert. Token gültig 15 Minuten, single-use.
**Email-Versand ist noch nicht angeschlossen**; der Reset-Token wird ins
Backend-Log geschrieben (`logger.warning("[password-reset] token issued …")`).
Bei `confirm` wird das neue Passwort gesetzt, **alle aktiven
Refresh-Tokens des Users werden revoked**, und der User bekommt direkt
ein frisches Auth-Paar.

### Rate Limiting

IP-basiert via `slowapi` auf den kritischen Auth-Routen:

| Route                                | Limit       |
| ------------------------------------ | ----------- |
| `POST /api/auth/register`            | 5 / Minute  |
| `POST /api/auth/login`               | 10 / Minute |
| `POST /api/auth/refresh`             | 30 / Minute |
| `POST /api/auth/password-reset/request` | 3 / Minute  |
| `POST /api/auth/password-reset/confirm` | 5 / Minute  |

Überschritten → 429 mit `Retry-After`.

### Geschützte Endpunkte

Die meisten Domain-Endpunkte (User-Profil, Availability, Matches, Chat,
Meetings, Blocks, Reports) erfordern einen gültigen Bearer-Token. Im
Mock-Only-Modus (Backend ohne DB) wird die Auth-Schicht abgeschaltet,
damit die App auch dann läuft.

---

## Was die App jetzt kann

### 1. Echte Datenbank mit Neon Postgres
- Sieben Tabellen: `users`, `availabilities`, `cafes`, `matches`,
  `meetings`, `chat_messages`, `icebreakers`.
- Async-Treiber **asyncpg** mit Connection-Pool, JSONB-Codecs und partial
  uniqueness indexes (z. B. `cafes.place_id` nur unique, wenn nicht NULL).
- Schema: [`backend/app/db/schema.sql`](backend/app/db/schema.sql)
  — idempotent, läuft bei jedem Start.
- Ist die Datenbank nicht erreichbar, läuft das Backend im
  **Mock-Only-Modus** weiter. Endpunkte antworten dann mit den
  eingebauten Mock-Daten — kein Crash, keine 500er.

### 2. FastAPI-Backend
Alle Endpunkte unter `/api/...`:

| Bereich       | Endpunkte                                                                 |
| ------------- | ------------------------------------------------------------------------- |
| **Auth**      | `POST /api/auth/{register,login,refresh,logout}`, `POST /api/auth/password-reset/{request,confirm}`, `GET /api/auth/me` |
| User          | `POST/GET/PATCH /api/users[/{id}]`, `PUT /api/users/me/push-token`        |
| Profile       | `POST/GET/PATCH /api/profiles[/{user_id}]`                                |
| Availability  | `POST /api/availability`, `GET /api/availability/{user_id}`, `DELETE /api/availability/{id}` |
| Matching      | `POST /api/matches/find`, `GET /api/matches/{user_id}`, `PATCH /api/matches/{id}/status` |
| Cafés         | `GET /api/cafes/search`, `/api/cafes/nearby`, `/api/cafes/{id}`           |
| Meetings      | `POST/GET/PATCH /api/meetings[/{id}]`, `POST /api/meetings/{id}/check-in` |
| Chat          | `GET /api/chat/{match_id}`, `POST /api/chat/{match_id}/message`           |
| Icebreaker    | `GET /api/chat/{match_id}/icebreakers`                                    |
| Blocks        | `POST/DELETE /api/blocks/{user_id}`, `GET /api/blocks`                    |
| Reports       | `POST /api/reports`                                                       |
| Health        | `GET /api/health`                                                         |

OpenAPI-Doku läuft automatisch auf `http://localhost:8000/docs`.

### 3. Google Places (v1) für echte Cafés
- `cafe_service.search_cafes_near_location` ruft
  `places.googleapis.com/v1/places:searchNearby` auf, wenn
  `GOOGLE_MAPS_API_KEY` gesetzt ist.
- Field-Mask reduziert Antworten auf das Nötigste (Billing-freundlich).
- Treffer landen in der `cafes`-Tabelle (`place_id` partial-unique),
  also wird die API nicht doppelt aufgerufen.
- Ohne Key oder bei API-Fehler greift die App auf die mitgelieferten
  Mock-Cafés zurück.

### 4. Karten-Ansicht (echt — auf jedem Target)
- **iOS / Android:** `react-native-maps` mit Apple Maps (iOS) bzw. Google
  Maps (Android). Wird dynamisch geladen, falls installiert.
- **Web:** echte **OpenStreetMap-Tiles** via Leaflet + react-leaflet
  (`src/components/CafeMap.web.tsx`). Kein API-Key nötig; CSS wird per
  `<link>` lazily injiziert. Metro picks die `.web.tsx`-Datei
  automatisch, Leaflet erreicht den Native-Bundle nicht.
- Marker im SipSocial-Style (cream/coffee, ausgewähltes Café primary).
  FitBounds zentriert automatisch.
- **Café-Filter** auf dem Vorschlags-Screen: häufigste Atmosphäre-Tags
  als Chips + Rating-Filter (4.0+, 4.5+). Karte und Liste folgen dem
  Filter; bei leerem Treffer kommt ein „Filter zurücksetzen"-Link.

### 5. Frontend API-Schicht
- `src/services/apiClient.ts` ist der einzige Ort mit `fetch`, hängt
  automatisch den Bearer-Token an und hat einen **401-Retry-Loop**, der
  einmal `/auth/refresh` ruft und die Original-Anfrage wiederholt.
- Pro Domäne ein typisierter Service: `authApi`, `userApi`, `profileApi`,
  `availabilityApi`, `matchingApi`, `cafeApi`, `meetingApi`, `chatApi`,
  `icebreakerApi`, `blockApi`, plus `pushService` und `tokenStore`.
- Bei offline-Backend wirft der Client `ApiUnavailableError`. Die Screens
  fangen das ab und zeigen die lokale Variante mit Hinweis-Text.

### 6. Verschlüsselter Chat
- Backend speichert nur das Fernet-Ciphertext-Feld `encrypted_text`.
- Bei `GET /api/chat/{match_id}` wird entschlüsselt und als `text`
  ausgeliefert.
- Limit weiterhin **3 Nachrichten pro Person**.

### 7. Datenschutz-Filter
- Backend (`app/services/privacy_filter.py`) und Frontend
  (`src/services/privacyFilter.ts`) erkennen via Regex:
  - Telefonnummern, E-Mail-Adressen, Links
  - WhatsApp/Insta/Snap/TikTok-Erwähnungen, Handles wie `@niki`
  - Wohnadressen (Straße + Hausnummer)
  - Aufforderungen wie „schreib mir auf WhatsApp"
- **Hard-Block** → Nachricht wird nicht gesendet, freundlicher Hinweis erscheint.
- **Soft-Warnung** → Nachricht geht durch, der Nutzer sieht die Hinweise inline.
- Gespeicherte Nachrichten tragen `blocked` und `privacy_warnings`.

### 8. Icebreaker (LLM-generiert via Claude Haiku 4.5)
- Wenn `ANTHROPIC_API_KEY` gesetzt ist, ruft das Backend **Claude Haiku 4.5**
  via Anthropic Python SDK auf und lässt frische, deutschsprachige
  Eisbrecher-Fragen generieren, die zu den gemeinsamen Interessen passen.
- Prompt-Caching auf dem stabilen System-Prompt — ab dem 2. Call ist der
  Prefix ein günstiger Cache-Read (~ 90 % billiger). cache_read /
  cache_write / input / output werden geloggt.
- **Graceful Fallback** auf die Template-Bank im selben Service, wenn
  kein API-Key da ist, die Anfrage scheitert oder die LLM-Antwort sich
  nicht parsen lässt — kein Crash, gleicher UI-Flow.
- Eigener Screen `IcebreakerScreen.tsx`, erreichbar aus dem Chat über den
  „Icebreaker"-Button im Header. Karten zeigen die Fragen mit Buttons
  „Nächste Frage", „Zum Chat", „Zum Treffen".

### 9. Matching mit Café-Integration
- Score-Logik unverändert (40 % Zeit / 30 % Bereich / 20 % Interessen
  / 10 % Treffenstyp).
- Beim Erstellen eines Matches schlägt das Backend automatisch ein Café
  vor — bevorzugt aus Google Places, ansonsten aus dem Mock-Bestand.
- Im „Warum dieses Match?"-Block taucht zusätzlich „Café in der Nähe" auf.
- Auf dem Café-Vorschlagsscreen kann der Nutzer per Button neue Cafés in
  der Nähe suchen lassen.

### 10. QR-Check-In mit signiertem Token
- Backend signiert beim Anlegen eines Meetings einen JWT
  (`purpose: "qr_checkin"`, 24 h Gültigkeit) und legt ihn als `qr_code` ab.
- Frontend rendert daraus einen **echten scanbaren QR** (`react-native-qrcode-svg`).
- „QR-Code scannen" öffnet die Kamera via `expo-camera`. Der gescannte
  Token geht an `POST /api/meetings/{id}/check-in` (Bearer-Auth).
- Backend validiert Signatur + Meeting-ID + Teilnehmerschaft. Sobald
  beide gescannt haben, wechselt der Meeting-Status auf
  `both_checked_in`.
- Bei offline-Backend: lokaler Fallback, der zumindest prüft, ob der
  gescannte Token dem Meeting-QR entspricht.

### 11. Block & Report (Safety)
- Neue Tabellen `blocks` (`blocker_id`, `blocked_id`, `reason`) und
  `reports` (`reporter_id`, `reported_id`, `match_id`, `reason`, `details`,
  `status`).
- **Block ist symmetrisch im Matching**: ein Block in eine Richtung
  versteckt das Paar in beide Richtungen
  (`block_service.blocked_pair_ids` plug-in im Matching-Loop).
- **Report blockiert automatisch mit** — Reports bedeuten in der Praxis
  „ich will diese Person nicht mehr sehen", und nicht zu blockieren
  wäre eine Überraschung.
- Frontend: `UserActionsSheet`-Komponente (Modal mit Block + Report-
  Optionen) im Header von `LimitedChatScreen`. Confirm-Dialog vorm
  Block (Web: `window.confirm`; Native: `Alert.alert`). Report-Modal
  mit Grund-Picker (6 Gründe inkl. „Etwas anderes") + Details-Textarea
  + Safety-Card mit Hinweis auf die Polizei für akute Fälle.
- API: `POST/DELETE /api/blocks/{user_id}`, `GET /api/blocks`,
  `POST /api/reports`. Self-Block/Self-Report → 400. Unbekannte
  Report-Reasons → 400.

### 12. Mehrere Verfügbarkeiten + Treffen-Management
- `add_availability` ist append-only — User können mehrere Zeitfenster
  parallel hinterlegen (z. B. „Mi 18-20 in Mitte" + „Sa 14-16 in
  Reutlingen"). Neuer `DELETE /api/availability/{id}` mit User-Guard.
- `AvailabilityEditScreen` zeigt die eigenen Slots oben mit Trash-Icon,
  drunter ein Add-Form. Duplikat-Erkennung verhindert die gleiche
  Kombination zweimal.
- **Treffen absagen** und **verschieben** sind echte Aktionen:
  `PATCH /api/meetings/{id}` ist auth-pflichtig, prüft Teilnehmerschaft,
  triggert eine Push an die andere Seite mit Café-Name bzw. neuem
  Termin. Eigener `MeetingRescheduleScreen` mit 14-Tage-Picker und
  Uhrzeit-Chips.
- **Profil im Nachhinein editieren**: neuer `ProfileEditScreen` deckt
  alle Felder aus dem Onboarding ab (Pseudonym, Bio, Alter, Treffenstyp,
  Interessen, Privacy-Toggles). Save-Button ist disabled wenn nichts
  geändert wurde.

### 13. UX-Polish: Pull-to-Refresh + Empty States
- `Screen`-Komponente nimmt optional `onRefresh` → `RefreshControl`
  baked-in für Home, Matches, Treffen.
- Neue `EmptyState`-Komponente (Icon + Headline + Description + bis zu
  2 CTAs) ersetzt die generischen „Hier ist noch nichts"-Karten. Der
  Matches-Screen unterscheidet zwischen „Du hast noch keine
  Verfügbarkeit" (CTA: Slot anlegen) und „aktuell keine offenen
  Vorschläge" (CTA: Verfügbarkeit erweitern + Erneut suchen).

### 14. Push-Notifications (nativ)
- Backend speichert pro User einen `expo_push_token` und schickt Pushes
  via Expo's Public Push Gateway (`exp.host/--/api/v2/push/send`).
- Trigger:
  - **Match angenommen** (`PATCH /matches/{id}/status` → `accepted`) → die
    andere Seite bekommt „X möchte mit dir auf einen Kaffee."
  - **Treffen bestätigt** (`POST /meetings`) → Push mit Café-Name.
  - **Treffen abgesagt** (`PATCH /meetings/{id}` → `cancelled`) →
    „X hat das Treffen abgesagt."
  - **Treffen verschoben** (`PATCH /meetings/{id}` mit neuem
    Datum/Café) → Push mit neuem Termin.
  - **Chat-Nachricht** (nicht blockiert) → Push mit Pseudonym + Vorschau.
  - **Check-In-Erinnerung 1 h vorher**: ein asyncio-Reminder-Loop
    (`reminder_service`) im FastAPI-Lifespan tickt alle 5 Min, sucht
    Meetings im 55–75-Min-Fenster ohne `reminder_sent_at`, pusht beide
    Teilnehmer und stempelt den Sent-Timestamp.
- Frontend (`src/services/pushService.ts`):
  - holt sich die Permission, ruft `getExpoPushTokenAsync` und meldet
    den Token via `PUT /api/users/me/push-token` an.
  - Beim Logout wird der Token serverseitig wieder geleert.
  - **Nur nativ.** Web-Push ist nicht implementiert (Expo unterstützt es
    nicht out-of-the-box); im Browser werden Pushes silently übersprungen.
- Tap-Routing in [`App.tsx`](App.tsx) leitet je nach `data.type` zum
  Chat, zur Matches-Liste oder zum QR-Check-In.

---

## Demo-Flow

1. Onboarding → **Registrieren** (Pseudonym + Email + Passwort)
2. Profil einrichten → Interessen → Verfügbarkeit speichern (gerne
   mehrere Slots in mehreren Bereichen — z. B. Mitte und Reutlingen)
3. Auf Home erscheinen Matches — auf einen tippen → Café-Vorschlag →
   echte OSM-/Google-Maps-Karte mit Google-Places-Cafés → optional
   Atmosphäre/Rating-Filter setzen → Café wählen → Treffen bestätigen
4. **Pull-to-Refresh** auf Home/Matches/Treffen lädt frische Vorschläge
5. QR-Check-in: **„QR-Code scannen"** öffnet die Kamera → richte sie auf
   den QR-Code → eingecheckt. (Nativ am Handy am komfortabelsten.)
6. Chat öffnen → Icebreaker oben rechts (Claude-Haiku-generiert wenn
   `ANTHROPIC_API_KEY` gesetzt) → 3 Nachrichten schreiben → Filter
   testet z. B. mit *„Schreib mir auf Instagram @niki"* (wird geblockt)
7. „⋯"-Menü im Chat-Header → **Block** oder **Melden** → User
   verschwindet aus Match-Vorschlägen
8. Treffen-Tab → **Verschieben** (14-Tage-Picker) oder **Absagen**
   (Confirm-Dialog) → die andere Seite kriegt eine Push
9. Profil → **Profil bearbeiten** ändert Pseudonym/Bio/Interessen ohne
   Re-Registrieren
10. Profil → **Abmelden** → **Passwort vergessen?** → Reset-Code aus dem
    Backend-Log eingeben → mit neuem Passwort anmelden — alle alten
    Refresh-Tokens des Users sind revoked
11. Nach 1 Stunde Wartezeit auf einem geplanten Treffen → automatische
    Check-In-Erinnerung als Push an beide

Für Push-Notifications-Demo: zweites Gerät (oder Browser-Tab) als Match
nutzen — sobald die andere Seite Chat schickt oder das Treffen bestätigt,
poppt am Handy ein Banner auf.

---

## Deployment (Backend → Render, Web → Vercel)

Beide Configs liegen im Repo:
- [`render.yaml`](render.yaml) — Blueprint für den Backend-Web-Service
- [`vercel.json`](vercel.json) — SPA-Routing + Static-Cache-Header für den Web-Build

### Backend → Render (Free-Tier)

1. **<https://dashboard.render.com>** → **New → Blueprint**
2. GitHub-Repo `Niklasr06/sipsocial` verbinden — Render liest `render.yaml` automatisch
3. **Secrets eintragen** (das, was als `sync: false` markiert ist):
   - `DATABASE_URL` — dein Neon-Connection-String
   - `JWT_SECRET` — `python -c 'import secrets; print(secrets.token_urlsafe(48))'`
   - `CHAT_ENCRYPTION_KEY` — `python -c 'from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())'`
   - `GOOGLE_MAPS_API_KEY` — optional
   - `ANTHROPIC_API_KEY` — optional
4. **„Apply"** → Build läuft (~3 Min), HTTPS-URL erscheint im Format `https://sipsocial-backend.onrender.com`
5. **Verifizieren:** `curl https://sipsocial-backend-XXXX.onrender.com/api/health` muss `{"ok": true, "db_alive": true, ...}` zurückgeben

> **Free-Tier-Caveat:** der Dyno schläft nach 15 Min Inaktivität ein. Der erste Request nach dem Schlaf braucht 30–50 s. Für produktive Nutzung auf **Starter ($7/Mo)** upgraden — Sleep raus, ~16 GB RAM-Quota, custom Domain.

### Web-Frontend → Vercel

1. **<https://vercel.com>** → **Add New → Project** → GitHub-Repo importieren
2. **Framework:** `Other` (Vercel erkennt's per `vercel.json`)
3. **Environment Variable:** `EXPO_PUBLIC_API_URL` = `https://sipsocial-backend-XXXX.onrender.com` (deine Render-URL aus Schritt 4 oben — **ohne** trailing slash)
4. **Deploy** → Build läuft (`npm install && npm run build:web`), Ergebnis liegt unter `https://<projektname>.vercel.app`
5. **Diese URL** in Render unter `BACKEND_CORS_ORIGINS` eintragen, dann Render-Service einmal **Manual Deploy → Clear build cache & deploy** triggern, damit die neue CORS-Origin greift.

Vercel-Preview-Deployments (PR-Branches) sind über das `BACKEND_CORS_ORIGIN_REGEX` in `render.yaml` schon erlaubt — kein Re-Deploy nötig wenn du auf einem Feature-Branch arbeitest.

### Lokaler Build-Test

Falls du den Web-Build vorab lokal sehen willst:

```bash
npm run build:web              # erzeugt dist/
cd dist && python3 -m http.server 4321
# Browser: http://localhost:4321
```

Das ist genau der Output den Vercel ausliefert.

### Was noch fehlt für „echtes" Production

- **Native Apps** über EAS Build (`eas build --platform ios` / `--platform android`). Kostet $99/Jahr Apple Developer Account + $25 einmalig Play Console.
- **Custom Domain** (Render und Vercel können beide direkt CNAMEs aufnehmen, je ~2 Min).
- **Sentry oder ähnlich** für Error-Tracking — bisher nichts angeschlossen.
- **Email-Provider** (Postmark/SES/Mailgun) für den Passwort-Reset-Token, der derzeit ins Backend-Log statt in eine Mail geht.

---

## Troubleshooting

| Symptom                                                | Ursache / Fix                                                                 |
| ------------------------------------------------------ | ----------------------------------------------------------------------------- |
| `/api/health` zeigt `db_error`                         | `DATABASE_URL` falsch, oder Neon-Compute pausiert (im Neon-Dashboard wecken)  |
| Google Places liefert nur Mock-Cafés                   | Backend-Log prüfen — meistens `403 blocked` (siehe Key-Restriktionen oben)    |
| Backend startet, `health` ok, aber CORS-Fehler im Web  | Frontend-Origin in `BACKEND_CORS_ORIGINS` ergänzen                            |
| App am Handy: „Backend nicht erreichbar"               | Siehe „Auf dem Handy testen" — LAN-IP in `.env`, Backend an `0.0.0.0`, macOS-Firewall erlauben |
| `401` auf geschütztem Endpunkt                         | Access-Token abgelaufen → apiClient sollte automatisch via `/auth/refresh` retryen; wenn das auch 401 gibt, ist der Refresh-Token revoked → erneut anmelden |
| `429` auf Login/Register                               | Rate-Limit ausgelöst → IP wartet 1 Min. Im Dev: warten oder Backend neu starten löscht den slowapi-Bucket |
| Passwort-Reset-Email kommt nicht an                    | E-Mail-Versand ist noch nicht angeschlossen — der Token steht im Backend-Log unter `[password-reset] token issued` |
| Expo zeigt weißen Screen                               | Browser-Console öffnen — typisch ist ein fehlendes `npm install`              |
| `bcrypt`-Fehler beim Login                             | bcrypt ≥ 4.3 nutzen (`pip install -U bcrypt`)                                 |
| QR-Scan reagiert nicht                                 | Kamera-Permission erteilt? Im Web manchmal blockiert → am Handy via Expo Go testen |
| Push-Notifications kommen nicht                        | Funktioniert nur auf echten Geräten (kein Simulator, kein Web), Permission „Erlauben" erforderlich |
| Icebreaker wirken generisch / wie Templates           | `ANTHROPIC_API_KEY` setzen — sonst Fallback auf Template-Bank (per Design)    |
| Render: erster Request nach Pause dauert 30–50 s      | Free-Tier-Schlaf — auf **Starter ($7/Mo)** upgraden, dann bleibt der Dyno warm |
| Vercel-App: Web-Login schlägt mit CORS-Fehler         | Vercel-URL exakt (kein trailing slash) in Render's `BACKEND_CORS_ORIGINS` eintragen und Service neu deployen |
| Vercel-Build crasht mit "Cannot find module 'expo'"   | `installCommand` in `vercel.json` muss `npm install` sein (default), nicht `npm ci` ohne Lockfile |
| Render-Build schlägt fehl: bcrypt-Compile-Error       | `PYTHON_VERSION` muss in `render.yaml` gesetzt sein (default ist sonst Python 3.10, dort ist bcrypt 4.x wheel buggy) |

---

## Bekannte Vereinfachungen

- Im Mock-Only-Modus persistiert das Backend keine Schreibvorgänge.
- Der Google-Places-Cache läuft nie ab; in Produktion sollte ein TTL ergänzt
  werden.
- **Passwort-Reset ohne Email-Versand.** Der Token landet im
  Backend-Log statt in einer echten Mail. SES/Postmark/Mailgun-Hook ist
  trivial nachzurüsten (`logger.warning(...)` in
  `app/api/auth.py:password_reset_request` ist der einzige Punkt).
- **Push-Notifications nur nativ.** Web-Push würde Service-Worker + VAPID
  brauchen — bewusst weggelassen für den MVP.
- Pro User nur **ein** Expo-Push-Token (eine Geräteinstallation). Mehrere
  Devices pro User würden eine eigene Tabelle brauchen.
- QR-Tokens werden auch nach erfolgreichem Check-In nicht invalidiert —
  Re-Scans während des 24-h-Fensters wären weiter möglich.
- Rate-Limit ist **IP-basiert** (slowapi) und in-process — taugt für
  einen einzelnen uvicorn-Worker, hinter Load-Balancern braucht es eine
  geteilte Backing-Store (Redis) und einen Header-basierten Key-Func.
- **Block/Report ohne Moderations-Dashboard.** Reports landen in der DB,
  werden aber nicht aktiv geprüft — der nächste Schritt wäre ein
  internes Admin-UI.
- **Kein Email-Versand** für Auth-Flows insgesamt (Verification,
  Welcome-Mail) — alles passiert direkt nach Register/Reset.
