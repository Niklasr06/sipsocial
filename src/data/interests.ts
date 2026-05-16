export const ALL_INTERESTS: { label: string; emoji: string }[] = [
  { label: 'Kaffee', emoji: '☕️' },
  { label: 'Startups', emoji: '🚀' },
  { label: 'Reisen', emoji: '🌍' },
  { label: 'Sport', emoji: '🏃' },
  { label: 'Musik', emoji: '🎵' },
  { label: 'Filme', emoji: '🎬' },
  { label: 'Bücher', emoji: '📚' },
  { label: 'Technologie', emoji: '💡' },
  { label: 'Studium', emoji: '🎓' },
  { label: 'Business', emoji: '💼' },
  { label: 'Kunst', emoji: '🎨' },
  { label: 'Gaming', emoji: '🎮' },
  { label: 'Kochen', emoji: '🍳' },
  { label: 'Natur', emoji: '🌿' },
  { label: 'Sprachen', emoji: '🗣️' },
];

export const INTEREST_EMOJI: Record<string, string> = ALL_INTERESTS.reduce(
  (acc, i) => ({ ...acc, [i.label]: i.emoji }),
  {} as Record<string, string>,
);

export const AREAS = [
  'Stuttgart-Mitte',
  'Stuttgart-West',
  'Stuttgart-Ost',
  'Stuttgart-Vaihingen',
  'Böblingen',
  'Esslingen',
  'Ludwigsburg',
] as const;

export const AGE_RANGES = ['18-24', '25-34', '35-44', '45+'] as const;
