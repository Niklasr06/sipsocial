/**
 * Vorlagen für Impressum, Datenschutz und Nutzungsbedingungen.
 *
 * WICHTIG: Die Texte sind Templates und MÜSSEN mit deinen echten Daten
 * ausgefüllt werden, bevor du die App an Fremde teilst. Such nach den
 * ``{{TODO_*}}``-Markern und ersetze sie.
 *
 * - Impressum: TMG §5 — Pflicht in DE, Klarname + Anschrift.
 * - Datenschutz: DSGVO Art. 13/14 — wer verarbeitet welche Daten wofür.
 * - Nutzungsbedingungen: Hausordnung — kein Dating, Block/Report,
 *   Account-Löschung.
 */

export interface LegalSection {
  heading?: string;
  paragraphs: string[];
}

export interface LegalDocument {
  title: string;
  lastUpdated: string;
  sections: LegalSection[];
}

const IMPRESSUM: LegalDocument = {
  title: 'Impressum',
  lastUpdated: '2026-05-19',
  sections: [
    {
      heading: 'Angaben gemäß § 5 TMG',
      paragraphs: [
        '{{TODO_BETREIBER_NAME}}',
        '{{TODO_STRASSE_NR}}',
        '{{TODO_PLZ_ORT}}',
        'Deutschland',
      ],
    },
    {
      heading: 'Kontakt',
      paragraphs: [
        'E-Mail: {{TODO_KONTAKT_EMAIL}}',
      ],
    },
    {
      heading: 'Verantwortlich für den Inhalt nach § 55 Abs. 2 RStV',
      paragraphs: [
        '{{TODO_BETREIBER_NAME}}',
        '{{TODO_STRASSE_NR}}, {{TODO_PLZ_ORT}}',
      ],
    },
    {
      heading: 'Haftung für Inhalte',
      paragraphs: [
        'Die Inhalte dieser App wurden mit größtmöglicher Sorgfalt erstellt. Für die Richtigkeit, Vollständigkeit und Aktualität der Inhalte können wir jedoch keine Gewähr übernehmen. Als Diensteanbieter sind wir gemäß § 7 Abs. 1 TMG für eigene Inhalte auf diesen Seiten nach den allgemeinen Gesetzen verantwortlich.',
      ],
    },
    {
      heading: 'Haftung für Links',
      paragraphs: [
        'Unser Angebot enthält Links zu externen Websites Dritter, auf deren Inhalte wir keinen Einfluss haben. Deshalb können wir für diese fremden Inhalte auch keine Gewähr übernehmen.',
      ],
    },
  ],
};

const DATENSCHUTZ: LegalDocument = {
  title: 'Datenschutzerklärung',
  lastUpdated: '2026-05-19',
  sections: [
    {
      heading: '1. Verantwortlicher',
      paragraphs: [
        'Verantwortlicher im Sinne der DSGVO ist:',
        '{{TODO_BETREIBER_NAME}}, {{TODO_STRASSE_NR}}, {{TODO_PLZ_ORT}}',
        'E-Mail: {{TODO_KONTAKT_EMAIL}}',
      ],
    },
    {
      heading: '2. Welche Daten wir verarbeiten',
      paragraphs: [
        'Beim Anlegen eines Accounts speichern wir: Name (selbst gewähltes Pseudonym), E-Mail-Adresse und ein bcrypt-Hash deines Passworts. Die Mail nutzen wir ausschließlich für Passwort-Reset.',
        'Beim Pflegen deines Profils speichern wir: Alter in ganzen Jahren (kein Geburtsdatum, keine Adresse), Bio (freiwillig), Interessen, Treffenpräferenzen und Datenschutz-Einstellungen. Standardmäßig zeigen wir anderen Nutzern nur deinen Altersbereich (z. B. 25-34); den Toggle „Genaues Alter verbergen" kannst du selbst umlegen.',
        'Beim Eintragen von Verfügbarkeiten speichern wir: Datum, Uhrzeit, Stadtteil — keinen exakten Standort.',
        'Bei Matches und Chat speichern wir: Match-Status, Café-Vorschlag, bis zu 3 Chat-Nachrichten pro Person und Match. Die Nachrichten sind im Backend mit Fernet symmetrisch verschlüsselt.',
        'Beim Treffen: QR-Code-Check-in mit Zeitstempel, optionaler No-Show-Marker.',
      ],
    },
    {
      heading: '3. Zwecke und Rechtsgrundlage',
      paragraphs: [
        'Vertragserfüllung (Art. 6 Abs. 1 lit. b DSGVO): Bereitstellung der Match-, Chat- und Meeting-Funktionen.',
        'Berechtigtes Interesse (Art. 6 Abs. 1 lit. f DSGVO): Missbrauchsprävention (Blocks, Reports, Rate-Limiting), Crash-Reporting via Sentry (nur User-ID, keine PII).',
        'Einwilligung (Art. 6 Abs. 1 lit. a DSGVO): Push-Benachrichtigungen.',
      ],
    },
    {
      heading: '4. Datenweitergabe',
      paragraphs: [
        'Wir nutzen folgende Auftragsverarbeiter:',
        '— Neon Database (EU, Frankfurt): Datenbank-Hosting.',
        '— Render (Frankfurt): Backend-Hosting.',
        '— Vercel (USA, mit DPF-Zertifizierung): Frontend-Hosting.',
        '— Postmark: Versand von Passwort-Reset-Mails.',
        '— Sentry: Fehler- und Crash-Tracking (anonymisiert, ohne PII).',
        '— Google Places API (optional, deaktivierbar): Café-Vorschläge.',
        '— Anthropic Claude (optional): Generierung von Icebreaker-Fragen aus deinen Interessen-Schlagworten.',
      ],
    },
    {
      heading: '5. Speicherdauer',
      paragraphs: [
        'Account-Daten bleiben bestehen, bis du den Account löschst (Profil → "Account löschen"). Dann werden alle zugehörigen Daten unwiderruflich entfernt (Art. 17 DSGVO).',
        'Chat-Nachrichten leben so lange wie der Match. Verfällt ein Match (Decline / 30 Tage ohne Aktivität), werden die Nachrichten mit gelöscht.',
        'Refresh-Tokens werden nach 90 Tagen Inaktivität widerrufen.',
      ],
    },
    {
      heading: '6. Deine Rechte',
      paragraphs: [
        'Du hast jederzeit das Recht auf Auskunft (Art. 15), Berichtigung (Art. 16), Löschung (Art. 17), Einschränkung (Art. 18), Datenübertragbarkeit (Art. 20) und Widerspruch (Art. 21).',
        'Schreib uns dafür eine E-Mail an {{TODO_KONTAKT_EMAIL}}. Die Löschung kannst du auch direkt in der App unter Profil → "Account löschen" anstoßen.',
        'Beschwerderecht: Du kannst dich bei einer Datenschutz-Aufsichtsbehörde beschweren. Zuständig in Baden-Württemberg ist der Landesbeauftragte für den Datenschutz und die Informationsfreiheit Baden-Württemberg (lfdi.de).',
      ],
    },
    {
      heading: '7. Cookies und lokaler Speicher',
      paragraphs: [
        'Wir setzen keine Tracking-Cookies. Wir speichern auf deinem Gerät einen JWT-Access-Token und einen Refresh-Token, damit du nicht bei jedem App-Start neu einloggen musst. Diese kannst du jederzeit über "Abmelden" löschen.',
      ],
    },
  ],
};

const NUTZUNGSBEDINGUNGEN: LegalDocument = {
  title: 'Nutzungsbedingungen',
  lastUpdated: '2026-05-19',
  sections: [
    {
      heading: '1. Zweck der App',
      paragraphs: [
        'SipSocial bringt Menschen für kurze Café-Treffen zusammen — basierend auf Verfügbarkeit, Bereich und gemeinsamen Interessen.',
        'SipSocial ist KEINE Dating-App. Anbahnungsversuche romantischer oder sexueller Art können zu sofortiger Account-Sperre führen.',
      ],
    },
    {
      heading: '2. Verhaltenskodex',
      paragraphs: [
        'Sei respektvoll. Keine Beleidigungen, kein Rassismus, keine Diskriminierung. Persönliche Kontaktdaten (Telefon, Social-Media-Handles) erst nach dem persönlichen Treffen tauschen.',
        'Erscheine zu vereinbarten Treffen. Nach drei No-Shows wird dein Account eingeschränkt.',
        'Melde Verstöße über das Drei-Punkte-Menü im Chat oder Match.',
      ],
    },
    {
      heading: '3. Account und Sicherheit',
      paragraphs: [
        'Du bist verantwortlich für die Sicherheit deines Passworts. Gib deine Zugangsdaten nicht weiter.',
        'Wir behalten uns vor, Accounts bei Verstößen gegen den Verhaltenskodex zu sperren oder zu löschen.',
      ],
    },
    {
      heading: '4. Beschränkter Chat',
      paragraphs: [
        'Pro Match sind maximal 3 Nachrichten pro Person erlaubt. Das ist Absicht — wir wollen, dass ihr euch persönlich kennenlernt, nicht endlos chattet.',
      ],
    },
    {
      heading: '5. Haftungsausschluss',
      paragraphs: [
        'SipSocial vermittelt nur Kontakte. Wir sind nicht Teil eures Treffens und haften nicht für das Verhalten anderer Nutzer oder den Zustand der vorgeschlagenen Cafés.',
        'Triff dich nur an öffentlichen Orten. Informiere bei Bedarf eine Vertrauensperson über Zeit und Ort.',
      ],
    },
    {
      heading: '6. Änderungen',
      paragraphs: [
        'Wir können diese Bedingungen aktualisieren. Wesentliche Änderungen kündigen wir in der App an.',
      ],
    },
  ],
};

export const LEGAL_DOCUMENTS = {
  impressum: IMPRESSUM,
  datenschutz: DATENSCHUTZ,
  nutzungsbedingungen: NUTZUNGSBEDINGUNGEN,
} as const;

export type LegalDocumentKey = keyof typeof LEGAL_DOCUMENTS;
