"""Icebreaker prompts tied to shared interests.

When a match is created we materialize a set of icebreaker cards from the
shared interests. Cards are cached per match in the ``icebreakers`` table so
users see the same prompts across sessions.
"""

from __future__ import annotations

import random
from typing import List, Optional

from app.db.postgres import get_pool
from app.schemas.icebreaker import Icebreaker
from app.services import llm_icebreaker
from app.services.repo import new_id


QUESTION_BANK: dict[str, list[str]] = {
    "Reisen": [
        "Was war bisher dein schönster Reise-Moment?",
        "Welche Stadt würdest du gerne nochmal besuchen?",
        "Bist du eher Strand, Berge oder Städtetrip?",
    ],
    "Startups": [
        "Welche App-Idee findest du aktuell spannend?",
        "Würdest du lieber gründen oder in einem Startup arbeiten?",
        "Welche digitale Lösung fehlt dir im Alltag?",
    ],
    "Kaffee": [
        "Wie trinkst du deinen Kaffee am liebsten?",
        "Was macht für dich ein gutes Café aus?",
        "Bist du Team Cappuccino, Espresso oder Flat White?",
    ],
    "Sport": [
        "Welche Sportart machst du am liebsten?",
        "Trainierst du lieber allein oder mit anderen?",
        "Was motiviert dich, aktiv zu bleiben?",
    ],
    "Musik": [
        "Welcher Song läuft bei dir aktuell rauf und runter?",
        "Gehst du lieber auf Konzerte oder Festivals?",
        "Welche Musikrichtung passt am besten zu einem entspannten Kaffee?",
    ],
    "Technologie": [
        "Welche App nutzt du jeden Tag?",
        "Welche Technologie findest du gerade besonders spannend?",
        "KI im Alltag: hilfreich oder eher zu viel?",
    ],
    "Filme": [
        "Welcher Film hat dich zuletzt richtig gepackt?",
        "Serien-Marathon oder Kino-Abend?",
        "Welche Filmfigur trifft deinen Humor?",
    ],
    "Bücher": [
        "Was liest du gerade?",
        "Welches Buch hat deine Sicht auf etwas verändert?",
        "Lieber Roman, Sachbuch oder Biografie?",
    ],
    "Studium": [
        "Was studierst du oder was hat dich am meisten geprägt?",
        "Welches Thema würdest du gerne unterrichten?",
        "Was war dein bisher bester Lern-Hack?",
    ],
    "Business": [
        "Welche Person inspiriert dich beruflich gerade?",
        "Was hat dich in deiner Branche zuletzt überrascht?",
        "Welche Karriere-Entscheidung war für dich richtig?",
    ],
    "Kunst": [
        "Welcher Ort hat dich künstlerisch zuletzt beeindruckt?",
        "Lieber Museum oder Street-Art?",
        "Welche Form von Kunst entspannt dich?",
    ],
    "Gaming": [
        "Welches Spiel würdest du jedem empfehlen?",
        "Single-Player-Story oder Multiplayer-Chaos?",
        "Welches Spiel hat dich am meisten geprägt?",
    ],
    "Kochen": [
        "Was kochst du, wenn Freunde überraschend vorbeikommen?",
        "Welches Gericht klappt bei dir nie?",
        "Hast du ein Lieblingsrezept aus der Kindheit?",
    ],
    "Natur": [
        "Welcher Ort in der Natur erdet dich?",
        "Bist du Frühaufsteher oder eher Sonnenuntergangs-Typ?",
        "Wandern, Klettern oder einfach spazieren?",
    ],
    "Sprachen": [
        "Welche Sprache würdest du gerne sprechen können?",
        "Welches Wort aus einer anderen Sprache liebst du?",
        "Wie hast du angefangen, eine Sprache zu lernen?",
    ],
}


FALLBACK_QUESTIONS = [
    "Was hat deinen Tag heute besonders gemacht?",
    "Wofür könntest du dich endlos begeistern?",
    "Was wäre dein idealer freier Nachmittag?",
]


def get_questions_for_interests(interests: List[str], max_per_interest: int = 2) -> List[Icebreaker]:
    bundles: list[Icebreaker] = []
    for interest in interests:
        pool = QUESTION_BANK.get(interest, [])
        if not pool:
            continue
        chosen = random.sample(pool, min(len(pool), max_per_interest))
        bundles.append(
            Icebreaker(
                id=new_id("ice"),
                match_id="",
                interest=interest,
                questions=chosen,
            )
        )
    if not bundles:
        bundles.append(
            Icebreaker(
                id=new_id("ice"),
                match_id="",
                interest="Allgemein",
                questions=random.sample(FALLBACK_QUESTIONS, len(FALLBACK_QUESTIONS)),
            )
        )
    return bundles


def _row_to_icebreaker(row) -> Icebreaker:
    return Icebreaker(
        id=row["id"],
        match_id=row["match_id"],
        interest=row["interest"],
        questions=list(row["questions"] or []),
    )


async def generate_icebreakers_for_match(match_id: str, shared_interests: List[str]) -> List[Icebreaker]:
    """Generate icebreakers for a match.

    Tries Claude Haiku first (one bundle that mixes all shared interests,
    so the questions feel cohesive). Falls back to the per-interest
    template bank if the LLM is disabled or fails.
    """
    bundles: list[Icebreaker] = []
    llm_qs = await llm_icebreaker.generate_questions(shared_interests)
    if llm_qs:
        bundles.append(
            Icebreaker(
                id=new_id("ice"),
                match_id=match_id,
                interest="Eure Themen",
                questions=llm_qs,
            )
        )
    else:
        bundles = get_questions_for_interests(shared_interests)
        for b in bundles:
            b.match_id = match_id
    pool = get_pool()
    if pool is not None:
        async with pool.acquire() as conn:
            async with conn.transaction():
                await conn.execute("DELETE FROM icebreakers WHERE match_id = $1", match_id)
                for b in bundles:
                    await conn.execute(
                        """
                        INSERT INTO icebreakers (id, match_id, interest, questions)
                        VALUES ($1, $2, $3, $4)
                        """,
                        b.id, match_id, b.interest, list(b.questions),
                    )
    return bundles


async def get_icebreakers_by_match(
    match_id: str,
    shared_interests: Optional[List[str]] = None,
) -> List[Icebreaker]:
    pool = get_pool()
    if pool is None:
        return get_questions_for_interests(shared_interests or [])
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            "SELECT * FROM icebreakers WHERE match_id = $1 ORDER BY interest",
            match_id,
        )
    out = [_row_to_icebreaker(r) for r in rows]
    if not out and shared_interests:
        out = await generate_icebreakers_for_match(match_id, shared_interests)
    return out
