/**
 * Sentry-Init über ``@sentry/react-native``. Auf nativ iOS/Android nutzt
 * es den nativen Sentry-SDK, auf Web fällt es auf ``@sentry/browser``
 * zurück — ein SDK, beide Plattformen, kein Drop-In später nötig.
 *
 * DSN kommt aus ``EXPO_PUBLIC_SENTRY_DSN``. Ohne DSN bleibt Sentry stumm
 * (keine Init, keine Events), damit lokale Entwicklung nichts schickt.
 */
import * as Sentry from '@sentry/react-native';

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
