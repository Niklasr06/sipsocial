/**
 * Local-only icebreaker question bank used as a fallback when the backend is
 * unreachable. Mirrors the question bank in
 * ``backend/app/services/icebreaker_service.py``.
 */

export interface IcebreakerBundle {
  id: string;
  interest: string;
  questions: string[];
}

const BANK: Record<string, string[]> = {
  Reisen: [
    'Was war bisher dein schönster Reise-Moment?',
    'Welche Stadt würdest du gerne nochmal besuchen?',
    'Bist du eher Strand, Berge oder Städtetrip?',
  ],
  Startups: [
    'Welche App-Idee findest du aktuell spannend?',
    'Würdest du lieber gründen oder in einem Startup arbeiten?',
    'Welche digitale Lösung fehlt dir im Alltag?',
  ],
  Kaffee: [
    'Wie trinkst du deinen Kaffee am liebsten?',
    'Was macht für dich ein gutes Café aus?',
    'Bist du Team Cappuccino, Espresso oder Flat White?',
  ],
  Sport: [
    'Welche Sportart machst du am liebsten?',
    'Trainierst du lieber allein oder mit anderen?',
    'Was motiviert dich, aktiv zu bleiben?',
  ],
  Musik: [
    'Welcher Song läuft bei dir aktuell rauf und runter?',
    'Gehst du lieber auf Konzerte oder Festivals?',
    'Welche Musikrichtung passt am besten zu einem entspannten Kaffee?',
  ],
  Technologie: [
    'Welche App nutzt du jeden Tag?',
    'Welche Technologie findest du gerade besonders spannend?',
    'KI im Alltag: hilfreich oder eher zu viel?',
  ],
  Filme: [
    'Welcher Film hat dich zuletzt richtig gepackt?',
    'Serien-Marathon oder Kino-Abend?',
    'Welche Filmfigur trifft deinen Humor?',
  ],
  Bücher: [
    'Was liest du gerade?',
    'Welches Buch hat deine Sicht auf etwas verändert?',
    'Lieber Roman, Sachbuch oder Biografie?',
  ],
  Studium: [
    'Was studierst du oder was hat dich am meisten geprägt?',
    'Welches Thema würdest du gerne unterrichten?',
    'Was war dein bisher bester Lern-Hack?',
  ],
  Business: [
    'Welche Person inspiriert dich beruflich gerade?',
    'Was hat dich in deiner Branche zuletzt überrascht?',
    'Welche Karriere-Entscheidung war für dich richtig?',
  ],
  Kunst: [
    'Welcher Ort hat dich künstlerisch zuletzt beeindruckt?',
    'Lieber Museum oder Street-Art?',
    'Welche Form von Kunst entspannt dich?',
  ],
  Gaming: [
    'Welches Spiel würdest du jedem empfehlen?',
    'Single-Player-Story oder Multiplayer-Chaos?',
    'Welches Spiel hat dich am meisten geprägt?',
  ],
  Kochen: [
    'Was kochst du, wenn Freunde überraschend vorbeikommen?',
    'Welches Gericht klappt bei dir nie?',
    'Hast du ein Lieblingsrezept aus der Kindheit?',
  ],
  Natur: [
    'Welcher Ort in der Natur erdet dich?',
    'Bist du Frühaufsteher oder eher Sonnenuntergangs-Typ?',
    'Wandern, Klettern oder einfach spazieren?',
  ],
  Sprachen: [
    'Welche Sprache würdest du gerne sprechen können?',
    'Welches Wort aus einer anderen Sprache liebst du?',
    'Wie hast du angefangen, eine Sprache zu lernen?',
  ],
};

const FALLBACK = [
  'Was hat deinen Tag heute besonders gemacht?',
  'Wofür könntest du dich endlos begeistern?',
  'Was wäre dein idealer freier Nachmittag?',
];

export function generateIcebreakers(interests: string[]): IcebreakerBundle[] {
  const bundles: IcebreakerBundle[] = [];
  for (const interest of interests) {
    const pool = BANK[interest];
    if (!pool) continue;
    bundles.push({
      id: `ice_${interest}_${Math.random().toString(36).slice(2, 7)}`,
      interest,
      questions: shuffle(pool).slice(0, 3),
    });
  }
  if (bundles.length === 0) {
    bundles.push({
      id: 'ice_fallback',
      interest: 'Allgemein',
      questions: shuffle(FALLBACK),
    });
  }
  return bundles;
}

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}
