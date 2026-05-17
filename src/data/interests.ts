export const ALL_INTERESTS: { label: string; emoji: string }[] = [
  // Coffee / Lifestyle
  { label: 'Kaffee', emoji: '☕️' },
  { label: 'Kochen', emoji: '🍳' },
  { label: 'Backen', emoji: '🧁' },
  { label: 'Restaurants', emoji: '🍽️' },
  { label: 'Wein', emoji: '🍷' },
  { label: 'Craft Beer', emoji: '🍺' },

  // Outdoor / Sport
  { label: 'Reisen', emoji: '🌍' },
  { label: 'Wandern', emoji: '🥾' },
  { label: 'Radfahren', emoji: '🚴' },
  { label: 'Sport', emoji: '🏃' },
  { label: 'Yoga', emoji: '🧘' },
  { label: 'Fitness', emoji: '💪' },
  { label: 'Fußball', emoji: '⚽️' },
  { label: 'Klettern', emoji: '🧗' },
  { label: 'Skifahren', emoji: '⛷️' },
  { label: 'Natur', emoji: '🌿' },

  // Kultur
  { label: 'Musik', emoji: '🎵' },
  { label: 'Konzerte', emoji: '🎤' },
  { label: 'Filme', emoji: '🎬' },
  { label: 'Serien', emoji: '📺' },
  { label: 'Bücher', emoji: '📚' },
  { label: 'Theater', emoji: '🎭' },
  { label: 'Museen', emoji: '🏛️' },
  { label: 'Kunst', emoji: '🎨' },
  { label: 'Fotografie', emoji: '📷' },
  { label: 'Mode', emoji: '👗' },

  // Tech / Wissen
  { label: 'Startups', emoji: '🚀' },
  { label: 'Technologie', emoji: '💡' },
  { label: 'KI', emoji: '🤖' },
  { label: 'Programmieren', emoji: '💻' },
  { label: 'Gaming', emoji: '🎮' },
  { label: 'Studium', emoji: '🎓' },
  { label: 'Business', emoji: '💼' },
  { label: 'Finanzen', emoji: '📈' },
  { label: 'Wissenschaft', emoji: '🔬' },
  { label: 'Geschichte', emoji: '📜' },
  { label: 'Philosophie', emoji: '🤔' },
  { label: 'Psychologie', emoji: '🧠' },

  // Soziales / Werte
  { label: 'Politik', emoji: '🗳️' },
  { label: 'Nachhaltigkeit', emoji: '🌱' },
  { label: 'Sprachen', emoji: '🗣️' },
  { label: 'Religion', emoji: '🙏' },
  { label: 'Ehrenamt', emoji: '❤️' },

  // Hobbies
  { label: 'Tanzen', emoji: '💃' },
  { label: 'Brettspiele', emoji: '🎲' },
  { label: 'DIY / Basteln', emoji: '🛠️' },
  { label: 'Gartenarbeit', emoji: '🌻' },
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
