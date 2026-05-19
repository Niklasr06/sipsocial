/**
 * Sentry-Init. Frontend läuft aktuell als Web-Bundle auf Vercel — daher
 * ``@sentry/react`` statt ``@sentry/react-native``. Wechsel auf den
 * native-SDK ist später ein Drop-In, wenn iOS/Android via EAS kommen.
 *
 * DSN kommt aus ``EXPO_PUBLIC_SENTRY_DSN``. Ohne DSN bleibt Sentry stumm
 * (keine Init, keine Events), damit lokale Entwicklung nichts schickt.
 */
import * as Sentry from '@sentry/react';

const DSN = (process.env.EXPO_PUBLIC_SENTRY_DSN ?? '').trim();
const ENV = (process.env.EXPO_PUBLIC_SENTRY_ENV ?? 'production').trim();

let initialized = false;

export function initSentry(): void {
  if (initialized || !DSN) return;
  Sentry.init({
    dsn: DSN,
    environment: ENV,
    // Sampling: 100% Errors, kleines % Performance — Free-Tier-freundlich.
    tracesSampleRate: 0.1,
    // Wir wollen keine Klartext-URLs / kein PII einsammeln.
    sendDefaultPii: false,
  });
  initialized = true;
}

export function setSentryUser(userId: string | null): void {
  if (!initialized) return;
  if (userId) {
    Sentry.setUser({ id: userId });
  } else {
    Sentry.setUser(null);
  }
}

export const SentryErrorBoundary = Sentry.ErrorBoundary;
