export const ALL_INTERESTS: { label: string; emoji: string }[] = [
  // Essen & Trinken
  { label: 'Kaffee', emoji: '☕️' },
  { label: 'Kochen', emoji: '🍳' },
  { label: 'Backen', emoji: '🧁' },
  { label: 'Restaurants', emoji: '🍽️' },
  { label: 'Wein', emoji: '🍷' },

  // Outdoor & Sport
  { label: 'Reisen', emoji: '🌍' },
  { label: 'Wandern', emoji: '🥾' },
  { label: 'Radfahren', emoji: '🚴' },
  { label: 'Sport', emoji: '🏃' },
  { label: 'Fitness', emoji: '💪' },
  { label: 'Yoga', emoji: '🧘' },
  { label: 'Natur', emoji: '🌿' },

  // Kultur
  { label: 'Musik', emoji: '🎵' },
  { label: 'Konzerte', emoji: '🎤' },
  { label: 'Filme', emoji: '🎬' },
  { label: 'Serien', emoji: '📺' },
  { label: 'Bücher', emoji: '📚' },
  { label: 'Kunst', emoji: '🎨' },
  { label: 'Fotografie', emoji: '📷' },
  { label: 'Mode', emoji: '👗' },

  // Tech & Wissen
  { label: 'Startups', emoji: '🚀' },
  { label: 'Technologie', emoji: '💡' },
  { label: 'KI', emoji: '🤖' },
  { label: 'Gaming', emoji: '🎮' },
  { label: 'Wissenschaft', emoji: '🔬' },
  { label: 'Psychologie', emoji: '🧠' },

  // Soziales & Werte
  { label: 'Sprachen', emoji: '🗣️' },
  { label: 'Nachhaltigkeit', emoji: '🌱' },
  { label: 'Ehrenamt', emoji: '❤️' },

  // Hobbies
  { label: 'Brettspiele', emoji: '🎲' },
  { label: 'Tanzen', emoji: '💃' },
  { label: 'Haustiere', emoji: '🐾' },
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
  'Reutlingen',
] as const;

export const AGE_RANGES = ['18-24', '25-34', '35-44', '45+'] as const;
