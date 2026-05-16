"""Mock dataset used as a fallback when MongoDB is unavailable.

This mirrors the frontend mock data so the API can return realistic responses
even without a database.
"""

from __future__ import annotations

from datetime import date, timedelta
from typing import Dict, List

from app.schemas.cafe import Cafe
from app.schemas.common import CafeLocation
from app.schemas.user import User
from app.schemas.availability import Availability


def _today_iso() -> str:
    return date.today().isoformat()


def _plus(n: int) -> str:
    return (date.today() + timedelta(days=n)).isoformat()


MOCK_CAFES: List[Cafe] = [
    Cafe(
        id="cafe_1",
        name="Herbert'z Espresso Bar",
        address="Calwer Str. 41, 70173 Stuttgart",
        area="Stuttgart-Mitte",
        opening_hours="Mo–Sa · 08:00 – 19:00",
        rating=4.7,
        atmosphere=["zentral", "lebhaft", "spezialitätenkaffee"],
        distance_mock="0,4 km",
        emoji="☕️",
        location=CafeLocation(lat=48.7758, lng=9.1733),
        source="mock",
    ),
    Cafe(
        id="cafe_2",
        name="Mókuska Caffè",
        address="Reuchlinstr. 4, 70178 Stuttgart",
        area="Stuttgart-West",
        opening_hours="Di–So · 09:00 – 18:00",
        rating=4.8,
        atmosphere=["ruhig", "industrial", "third wave"],
        distance_mock="1,2 km",
        emoji="🍵",
        location=CafeLocation(lat=48.7726, lng=9.1577),
        source="mock",
    ),
    Cafe(
        id="cafe_3",
        name="Café Königsbau",
        address="Königstr. 28, 70173 Stuttgart",
        area="Stuttgart-Mitte",
        opening_hours="Täglich · 09:30 – 20:00",
        rating=4.4,
        atmosphere=["klassisch", "zentral", "gemütlich"],
        distance_mock="0,7 km",
        emoji="🥐",
        location=CafeLocation(lat=48.7793, lng=9.1769),
        source="mock",
    ),
    Cafe(
        id="cafe_4",
        name="Café DA",
        address="Wagenburgstr. 4, 70184 Stuttgart",
        area="Stuttgart-Ost",
        opening_hours="Mi–So · 09:00 – 17:00",
        rating=4.6,
        atmosphere=["ruhig", "klein", "persönlich"],
        distance_mock="2,1 km",
        emoji="🌿",
        location=CafeLocation(lat=48.7798, lng=9.1972),
        source="mock",
    ),
    Cafe(
        id="cafe_5",
        name="Kaffeehaus Stuttgart",
        address="Eberhardstr. 35, 70173 Stuttgart",
        area="Stuttgart-Mitte",
        opening_hours="Mo–Sa · 08:30 – 19:00",
        rating=4.5,
        atmosphere=["gemütlich", "zentral", "kuchen"],
        distance_mock="0,9 km",
        emoji="🍰",
        location=CafeLocation(lat=48.7745, lng=9.1782),
        source="mock",
    ),
    Cafe(
        id="cafe_6",
        name="Café Emil",
        address="Bahnhofstr. 12, 71032 Böblingen",
        area="Böblingen",
        opening_hours="Mo–Sa · 08:00 – 18:00",
        rating=4.3,
        atmosphere=["hell", "ruhig", "familiär"],
        distance_mock="0,3 km",
        emoji="☀️",
        location=CafeLocation(lat=48.6852, lng=9.0117),
        source="mock",
    ),
    Cafe(
        id="cafe_7",
        name="Café Maille",
        address="Innere Brücke 4, 73728 Esslingen",
        area="Esslingen",
        opening_hours="Di–So · 09:00 – 19:00",
        rating=4.7,
        atmosphere=["altstadt", "romantisch", "gemütlich"],
        distance_mock="0,5 km",
        emoji="🏛️",
        location=CafeLocation(lat=48.7395, lng=9.3060),
        source="mock",
    ),
]


def _mock_user(uid: str, pseudonym: str, age, interests, pref, color, initials) -> User:
    return User(
        id=uid,
        pseudonym=pseudonym,
        email=f"{pseudonym.lower()}@example.com",
        age_range=age,
        bio="",
        interests=interests,
        meeting_preference=pref,
        initials=initials,
        accent_color=color,
    )


MOCK_USERS: List[User] = [
    _mock_user("user_2", "Lena", "25-34", ["Kaffee", "Kunst", "Startups", "Reisen", "Bücher"], "one_on_one", "#C77752", "LE"),
    _mock_user("user_3", "Jakob", "25-34", ["Technologie", "Kaffee", "Filme", "Gaming", "Startups"], "both", "#7A4E2D", "JA"),
    _mock_user("user_4", "Sophie", "18-24", ["Studium", "Sprachen", "Reisen", "Musik", "Kaffee"], "group", "#6F8F72", "SO"),
    _mock_user("user_5", "Mara", "35-44", ["Bücher", "Natur", "Kochen", "Musik", "Sport"], "one_on_one", "#B85C4A", "MA"),
    _mock_user("user_6", "Tim", "25-34", ["Kaffee", "Business", "Startups", "Reisen", "Kochen"], "one_on_one", "#7A4E2D", "TI"),
    _mock_user("user_7", "Aylin", "25-34", ["Kunst", "Reisen", "Bücher", "Natur", "Kaffee"], "both", "#C77752", "AY"),
    _mock_user("user_8", "Felix", "18-24", ["Musik", "Studium", "Kochen", "Filme", "Sport"], "group", "#6F8F72", "FE"),
    _mock_user("user_9", "Noor", "35-44", ["Kunst", "Reisen", "Kaffee", "Natur", "Bücher"], "one_on_one", "#7A4E2D", "NO"),
]


MOCK_AVAILABILITIES: List[Availability] = [
    Availability(id="av_2", user_id="user_2", date=_plus(1), start_time="15:00", end_time="17:30", area="Stuttgart-Mitte"),
    Availability(id="av_3", user_id="user_3", date=_plus(1), start_time="16:00", end_time="18:00", area="Stuttgart-Mitte"),
    Availability(id="av_4", user_id="user_4", date=_plus(2), start_time="10:00", end_time="12:00", area="Stuttgart-West"),
    Availability(id="av_5", user_id="user_5", date=_plus(2), start_time="14:00", end_time="16:00", area="Stuttgart-Ost"),
    Availability(id="av_6", user_id="user_6", date=_plus(1), start_time="15:30", end_time="17:00", area="Stuttgart-Mitte"),
    Availability(id="av_7", user_id="user_7", date=_plus(3), start_time="11:00", end_time="13:00", area="Stuttgart-West"),
    Availability(id="av_8", user_id="user_8", date=_plus(2), start_time="15:00", end_time="17:00", area="Stuttgart-Vaihingen"),
    Availability(id="av_9", user_id="user_9", date=_plus(3), start_time="10:00", end_time="12:30", area="Esslingen"),
]


def index_by_id(items) -> Dict[str, object]:
    return {getattr(i, "id"): i for i in items}
