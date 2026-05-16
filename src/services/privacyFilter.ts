/**
 * Mirror of the backend privacy filter so the chat still warns the user when
 * the API is offline. Kept regex-based and intentionally conservative.
 */

export interface PrivacyVerdict {
  blocked: boolean;
  warnings: string[];
  sanitized: string;
}

const PATTERNS: { kind: string; label: string; pattern: RegExp; hardBlock: boolean }[] = [
  { kind: 'phone', label: 'Telefonnummer', pattern: /(?<!\d)(\+?\d[\d\s/().\-]{7,}\d)(?!\d)/g, hardBlock: true },
  { kind: 'email', label: 'E-Mail-Adresse', pattern: /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, hardBlock: true },
  { kind: 'url', label: 'Link', pattern: /\b(?:https?:\/\/|www\.)[^\s]+/gi, hardBlock: true },
  {
    kind: 'social',
    label: 'Social-Media-Hinweis',
    pattern: /\b(insta(gram)?|snap(chat)?|tiktok|telegram|signal|fb|facebook|discord)\b/gi,
    hardBlock: false,
  },
  { kind: 'whatsapp', label: 'WhatsApp-Hinweis', pattern: /\b(whats[\s-]?app|wa)\b/gi, hardBlock: true },
  {
    kind: 'handle',
    label: 'Social-Media Handle',
    pattern: /(^|[^A-Za-z0-9_])@[A-Za-z0-9_.]{3,}/g,
    hardBlock: true,
  },
  {
    kind: 'address',
    label: 'Wohnadresse',
    pattern: /\b[A-ZÄÖÜ][a-zäöüß]+(?:[- ][A-ZÄÖÜ][a-zäöüß]+)*\s?(?:str(?:aße|\.)|weg|allee|platz|gasse)\s*\d+/g,
    hardBlock: true,
  },
  {
    kind: 'directions',
    label: 'Aufforderung zu externer Plattform',
    pattern:
      /\b(schreib|adde|add|schick|f(ü|u)g)\b.{0,30}\b(whatsapp|wa|insta|instagram|snap|tiktok|nummer|handy|telegram|signal)\b/gi,
    hardBlock: true,
  },
];

export const PRIVACY_HINT =
  'Zum Schutz deiner Privatsphäre solltest du persönliche Kontaktdaten erst nach dem Treffen teilen.';

export function evaluateMessage(text: string): PrivacyVerdict {
  const warnings: string[] = [];
  let sanitized = text;
  let blocked = false;
  for (const p of PATTERNS) {
    if (p.pattern.test(text)) {
      if (!warnings.includes(p.label)) warnings.push(p.label);
      if (p.hardBlock) {
        blocked = true;
        sanitized = sanitized.replace(p.pattern, `[entfernt: ${p.label}]`);
      }
    }
    p.pattern.lastIndex = 0; // reset global regex state
  }
  return { blocked, warnings, sanitized };
}
