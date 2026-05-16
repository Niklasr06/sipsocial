# SipSocial

Sichere, anonyme Café-Begegnungen — gebaut als Mobile-App-Prototyp mit
**React Native + Expo (SDK 54)** im Frontend und einem **FastAPI +
Neon Postgres** Backend.

> SipSocial ist **keine** Dating-App. Es geht um echte Treffen bei einem
> Kaffee, mit Datenschutz, klaren Grenzen und einem fairen Vertrauenssystem.

---

## TL;DR

| Setup                | Befehl                                                  |
| -------------------- | ------------------------------------------------------- |
| **Frontend starten** | `npm install && npx expo start`                         |
| **Backend starten** | siehe „Backend lokal starten" weiter unten              |
| **Ohne Backend?**    | App läuft mit den eingebauten Mock-Daten weiter         |
| **Ohne Google Key?** | Café-Vorschläge kommen aus den Mock-Cafés               |
| **Ohne DB?**         | Backend startet im Mock-Only-Modus, kein Datenverlust   |

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
│   ├── services/                # *Api.ts (Backend) + lokale Services
│   │   ├── apiClient.ts         # Zentraler fetch-Wrapper + Bearer-Header
│   │   ├── authApi.ts           # /register, /login, /me
│   │   ├── tokenStore.ts        # AsyncStorage-basiertes Token-Caching
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
        │   └── security.py      # Bearer-Auth-Dependency (JWT)
        ├── db/
        │   ├── postgres.py      # asyncpg-Pool + Schema/Seed-Bootstrap
        │   └── schema.sql       # alle Tabellen, idempotent
        ├── models/              # Re-Exports der Pydantic-Modelle
        ├── schemas/             # Pydantic-Schemas (API + DB)
        ├── services/            # Domain-Logik
        │   ├── auth_service.py        # bcrypt + Session-JWT + QR-Token-JWT
        │   ├── cafe_service.py        # Google Places (v1) + Cache
        │   ├── chat_service.py        # Fernet-verschlüsselter Chat
        │   ├── icebreaker_service.py  # Fragen nach Interessen
        │   ├── matching_service.py    # Score-Berechnung
        │   ├── meeting_service.py
        │   ├── notification_service.py # Expo Push Gateway
        │   ├── privacy_filter.py      # Regex-Schutz
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

## Authentifizierung (Email + Passwort + JWT)

Echte Auth ist live — keine Mock-Logins mehr.

| Endpunkt                | Body                                | Antwort                                  |
| ----------------------- | ----------------------------------- | ---------------------------------------- |
| `POST /api/auth/register` | `{pseudonym, email, password}`    | `{user, token}` — 201, oder 409 wenn Email bereits existiert |
| `POST /api/auth/login`    | `{email, password}`               | `{user, token}` — 200, oder 401 (generisch, um Email-Enumeration zu vermeiden) |
| `GET  /api/auth/me`       | Header `Authorization: Bearer …` | `{user}` — 200                            |

- Passwörter werden mit **bcrypt** (Cost 12) gehasht.
- Tokens sind **JWT HS256**, Default-Lebensdauer **7 Tage** (`JWT_EXPIRES_HOURS`).
- Frontend speichert das Token via `AsyncStorage` (`src/services/tokenStore.ts`)
  und sendet es automatisch im `Authorization`-Header.
- Beim App-Start versucht `AppContext` `/me` → bei Erfolg ist der User
  eingeloggt und die Verfügbarkeit wird aus der DB nachgeladen.

### Geschützte Endpunkte

Die meisten Domain-Endpunkte (User-Profil, Availability, Matches, Chat,
Meetings) erfordern einen gültigen Bearer-Token. Im Mock-Only-Modus
(Backend ohne DB) wird die Auth-Schicht abgeschaltet, damit die App
auch dann läuft.

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
| **Auth**      | `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`     |
| User          | `POST/GET/PATCH /api/users[/{id}]`, `PUT /api/users/me/push-token`        |
| Profile       | `POST/GET/PATCH /api/profiles[/{user_id}]`                                |
| Availability  | `POST /api/availability`, `GET /api/availability/{user_id}`               |
| Matching      | `POST /api/matches/find`, `GET /api/matches/{user_id}`, `PATCH /api/matches/{id}/status` |
| Cafés         | `GET /api/cafes/search`, `/api/cafes/nearby`, `/api/cafes/{id}`           |
| Meetings      | `POST/GET/PATCH /api/meetings[/{id}]`, `POST /api/meetings/{id}/check-in` |
| Chat          | `GET /api/chat/{match_id}`, `POST /api/chat/{match_id}/message`           |
| Icebreaker    | `GET /api/chat/{match_id}/icebreakers`                                    |
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

### 4. Karten-Ansicht
- Auf iOS/Android wird `react-native-maps` dynamisch geladen, falls
  installiert.
- Im Web (und falls die Native-Map nicht verfügbar ist) zeigt SipSocial ein
  designtes Fallback: Café-Marker auf einem relativen Koordinatensystem mit
  Auswahl-Callout, im SipSocial-Farbschema.
- Marker sind anklickbar, das gewählte Café erscheint als Card unter der
  Karte mit „Dieses Café vorschlagen" / „Anderes Café suchen".

### 5. Frontend API-Schicht
- `src/services/apiClient.ts` ist der einzige Ort mit `fetch` und hängt
  automatisch den Bearer-Token an.
- Pro Domäne ein typisierter Service: `authApi`, `userApi`, `profileApi`,
  `availabilityApi`, `matchingApi`, `cafeApi`, `meetingApi`, `chatApi`,
  `icebreakerApi`.
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

### 8. Icebreaker
- Eigener Screen `IcebreakerScreen.tsx`, erreichbar aus dem Chat über den
  „Icebreaker"-Button im Header.
- Backend erzeugt Fragen passend zu den `shared_interests` und cached sie in
  `icebreakers`. Ohne Backend nutzt das Frontend die identische Fragen-Bank
  lokal.
- Karten zeigen *„Passend zu euren gemeinsamen Interessen"* mit Buttons
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

### 11. Push-Notifications (nativ)
- Backend speichert pro User einen `expo_push_token` und schickt Pushes
  via Expo's Public Push Gateway (`exp.host/--/api/v2/push/send`).
- Trigger:
  - **Match angenommen** (`PATCH /matches/{id}/status` → `accepted`) → die
    andere Seite bekommt „X möchte mit dir auf einen Kaffee."
  - **Treffen bestätigt** (`POST /meetings`) → Push mit Café-Name.
  - **Chat-Nachricht** (nicht blockiert) → Push mit Pseudonym + Vorschau.
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
2. Profil einrichten → Interessen → Verfügbarkeit speichern
3. Auf Home erscheinen Matches — auf einen tippen → Café-Vorschlag → Karte
   mit echten Google-Cafés → Café wählen → Treffen bestätigen
4. QR-Check-in: **„QR-Code scannen"** öffnet die Kamera → richte sie auf
   den QR-Code → eingecheckt. (Nativ am Handy am komfortabelsten.)
5. Chat öffnen → 3 Nachrichten schreiben → Filter testet z. B. mit:
   *„Schreib mir auf Instagram @niki"* (wird geblockt)
6. Icebreaker-Button oben rechts → Fragen passend zu Interessen, „Nächste
   Frage" wechselt durch
7. Profil → **Abmelden** → erneut **Anmelden** → User + Verfügbarkeit
   bleiben dank Neon erhalten
8. Im Profil-Tab → „Sicherheit & Datenschutz" + „Vertrauensstatus" zeigen
   das No-Show-System

Für Push-Notifications-Demo: zweites Gerät (oder Browser-Tab) als Match
nutzen — sobald die andere Seite Chat schickt oder das Treffen bestätigt,
poppt am Handy ein Banner auf.

---

## Troubleshooting

| Symptom                                                | Ursache / Fix                                                                 |
| ------------------------------------------------------ | ----------------------------------------------------------------------------- |
| `/api/health` zeigt `db_error`                         | `DATABASE_URL` falsch, oder Neon-Compute pausiert (im Neon-Dashboard wecken)  |
| Google Places liefert nur Mock-Cafés                   | Backend-Log prüfen — meistens `403 blocked` (siehe Key-Restriktionen oben)    |
| Backend startet, `health` ok, aber CORS-Fehler im Web  | Frontend-Origin in `BACKEND_CORS_ORIGINS` ergänzen                            |
| App am Handy: „Backend nicht erreichbar"               | Siehe „Auf dem Handy testen" — LAN-IP in `.env`, Backend an `0.0.0.0`, macOS-Firewall erlauben |
| `401` auf geschütztem Endpunkt                         | Token abgelaufen → ausloggen + neu anmelden, oder `JWT_EXPIRES_HOURS` höher   |
| Expo zeigt weißen Screen                               | Browser-Console öffnen — typisch ist ein fehlendes `npm install`              |
| `bcrypt`-Fehler beim Login                             | bcrypt ≥ 4.3 nutzen (`pip install -U bcrypt`)                                 |
| QR-Scan reagiert nicht                                 | Kamera-Permission erteilt? Im Web manchmal blockiert → am Handy via Expo Go testen |
| Push-Notifications kommen nicht                        | Funktioniert nur auf echten Geräten (kein Simulator, kein Web), Permission „Erlauben" erforderlich |

---

## Bekannte Vereinfachungen

- Im Mock-Only-Modus persistiert das Backend keine Schreibvorgänge.
- Der Google-Places-Cache läuft nie ab; in Produktion sollte ein TTL ergänzt
  werden.
- **Push-Notifications nur nativ.** Web-Push würde Service-Worker + VAPID
  brauchen — bewusst weggelassen für den MVP.
- Pro User nur **ein** Expo-Push-Token (eine Geräteinstallation). Mehrere
  Devices pro User würden eine eigene Tabelle brauchen.
- Kein Refresh-Token-Flow; abgelaufene JWTs erfordern Re-Login.
- QR-Tokens werden auch nach erfolgreichem Check-In nicht invalidiert —
  Re-Scans während des 24-h-Fensters wären weiter möglich.
