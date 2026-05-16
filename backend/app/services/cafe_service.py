"""Café service with Google Places integration and graceful fallback.

If ``GOOGLE_MAPS_API_KEY`` is set we hit the Places "Nearby Search" endpoint
to enrich the café catalogue. Results are persisted to the ``cafes`` table
(deduped by ``place_id``) so subsequent lookups don't re-bill the API.

Without a key — or when the API errors out — we fall back to the seeded
mock cafés so the rest of the system keeps working.
"""

from __future__ import annotations

import logging
from typing import List, Optional

import httpx

from app.core.config import get_settings
from app.db.postgres import get_pool
from app.schemas.cafe import Cafe, CafeSearchQuery
from app.schemas.common import CafeLocation
from app.services import mock_data

logger = logging.getLogger("sipsocial.cafe")


GOOGLE_NEARBY_URL = "https://places.googleapis.com/v1/places:searchNearby"

# Field mask tells the new Places API exactly which fields to return — it's
# required and also keeps the response (and the billing tier) small.
GOOGLE_FIELD_MASK = ",".join(
    [
        "places.id",
        "places.displayName",
        "places.formattedAddress",
        "places.shortFormattedAddress",
        "places.location",
        "places.rating",
        "places.types",
        "places.primaryType",
        "places.regularOpeningHours.weekdayDescriptions",
    ]
)


AREA_CENTERS: dict[str, tuple[float, float]] = {
    "Stuttgart-Mitte": (48.7758, 9.1770),
    "Stuttgart-West": (48.7726, 9.1577),
    "Stuttgart-Ost": (48.7798, 9.1972),
    "Stuttgart-Vaihingen": (48.7286, 9.1129),
    "Böblingen": (48.6852, 9.0117),
    "Esslingen": (48.7395, 9.3060),
    "Ludwigsburg": (48.8975, 9.1929),
    "Reutlingen": (48.4914, 9.2043),
}


def _area_for_location(lat: float, lng: float) -> str:
    best = "Stuttgart-Mitte"
    best_d = float("inf")
    for area, (alat, alng) in AREA_CENTERS.items():
        d = (alat - lat) ** 2 + (alng - lng) ** 2
        if d < best_d:
            best_d = d
            best = area
    return best


def _row_to_cafe(row) -> Cafe:
    loc = None
    if row["lat"] is not None and row["lng"] is not None:
        loc = CafeLocation(lat=row["lat"], lng=row["lng"])
    return Cafe(
        id=row["id"],
        place_id=row["place_id"],
        name=row["name"],
        address=row["address"] or "",
        area=row["area"],
        opening_hours=row["opening_hours"] or "",
        rating=row["rating"] or 0.0,
        atmosphere=list(row["atmosphere"] or []),
        distance_mock=row["distance_mock"] or "",
        emoji=row["emoji"] or "☕️",
        location=loc,
        source=row["source"] or "mock",
    )


async def get_cached_cafes(area: Optional[str] = None) -> List[Cafe]:
    pool = get_pool()
    if pool is None:
        return [c for c in mock_data.MOCK_CAFES if not area or c.area == area]
    async with pool.acquire() as conn:
        if area:
            rows = await conn.fetch("SELECT * FROM cafes WHERE area = $1 ORDER BY rating DESC", area)
        else:
            rows = await conn.fetch("SELECT * FROM cafes ORDER BY rating DESC")
    if not rows:
        return [c for c in mock_data.MOCK_CAFES if not area or c.area == area]
    return [_row_to_cafe(r) for r in rows]


async def get_cafe(cafe_id: str) -> Optional[Cafe]:
    pool = get_pool()
    if pool is None:
        for c in mock_data.MOCK_CAFES:
            if c.id == cafe_id:
                return c
        return None
    async with pool.acquire() as conn:
        row = await conn.fetchrow("SELECT * FROM cafes WHERE id = $1", cafe_id)
    if row:
        return _row_to_cafe(row)
    for c in mock_data.MOCK_CAFES:
        if c.id == cafe_id:
            return c
    return None


async def cache_cafes(cafes: List[Cafe]) -> None:
    pool = get_pool()
    if pool is None or not cafes:
        return
    async with pool.acquire() as conn:
        async with conn.transaction():
            for cafe in cafes:
                await conn.execute(
                    """
                    INSERT INTO cafes
                        (id, place_id, name, address, area, opening_hours,
                         rating, atmosphere, distance_mock, emoji, lat, lng, source)
                    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
                    ON CONFLICT (id) DO UPDATE SET
                        place_id      = EXCLUDED.place_id,
                        name          = EXCLUDED.name,
                        address       = EXCLUDED.address,
                        area          = EXCLUDED.area,
                        opening_hours = EXCLUDED.opening_hours,
                        rating        = EXCLUDED.rating,
                        atmosphere    = EXCLUDED.atmosphere,
                        distance_mock = EXCLUDED.distance_mock,
                        emoji         = EXCLUDED.emoji,
                        lat           = EXCLUDED.lat,
                        lng           = EXCLUDED.lng,
                        source        = EXCLUDED.source,
                        updated_at    = now()
                    """,
                    cafe.id,
                    cafe.place_id,
                    cafe.name,
                    cafe.address,
                    cafe.area,
                    cafe.opening_hours,
                    cafe.rating,
                    list(cafe.atmosphere),
                    cafe.distance_mock,
                    cafe.emoji,
                    cafe.location.lat if cafe.location else None,
                    cafe.location.lng if cafe.location else None,
                    cafe.source,
                )


async def search_cafes_near_location(query: CafeSearchQuery) -> List[Cafe]:
    settings = get_settings()
    lat = query.lat
    lng = query.lng
    area = query.area
    if (lat is None or lng is None) and area and area in AREA_CENTERS:
        lat, lng = AREA_CENTERS[area]

    if settings.has_google_maps and lat is not None and lng is not None:
        try:
            cafes = await _fetch_google_places(lat, lng, query.radius_m, query.limit, settings.GOOGLE_MAPS_API_KEY)
            if cafes:
                await cache_cafes(cafes)
                return cafes
        except Exception as exc:
            logger.warning("Google Places lookup failed (%s); falling back to cached/mock.", exc)

    return await get_cached_cafes(area)


async def _fetch_google_places(
    lat: float, lng: float, radius_m: int, limit: int, api_key: str
) -> List[Cafe]:
    """Call Google's new Places API (``v1/places:searchNearby``).

    The legacy ``maps/api/place/nearbysearch/json`` endpoint is no longer
    enabled for new projects. The new API uses POST + a field mask + a JSON
    body — and rate-limits ``maxResultCount`` to 20.
    """
    headers = {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": api_key,
        "X-Goog-FieldMask": GOOGLE_FIELD_MASK,
    }
    # Ask Google for the API's hard max (20). After filtering out
    # tankstellen/eishallen we keep up to ``limit`` of the survivors,
    # so over-fetching ensures we don't end up with too few real cafés.
    body = {
        "includedTypes": ["cafe", "coffee_shop", "bakery"],
        "maxResultCount": 20,
        "locationRestriction": {
            "circle": {
                "center": {"latitude": lat, "longitude": lng},
                "radius": float(radius_m),
            },
        },
        "languageCode": "de",
    }
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.post(GOOGLE_NEARBY_URL, headers=headers, json=body)
    if resp.status_code >= 400:
        # Surface the API's error message so we don't silently fall back.
        try:
            err = resp.json().get("error", {}).get("message", "")
        except ValueError:
            err = resp.text
        raise RuntimeError(f"Google Places HTTP {resp.status_code}: {err}")

    data = resp.json()
    out: list[Cafe] = []
    for place in data.get("places") or []:
        place_id = place.get("id")
        if not place_id:
            continue
        types = set(place.get("types") or [])
        primary = place.get("primaryType") or ""

        # Strictest signal first: the place's *primary* type must be
        # something coffee-ish. This kills hotels, restaurants, bars and
        # tankstellen even when Google offers ``cafe`` as a secondary type.
        if primary and primary not in _CAFE_LIKE:
            continue
        # Backup for the rare result without a primary type at all.
        if not primary:
            if types & _NOT_A_CAFE:
                continue
            if not (types & _CAFE_LIKE):
                continue

        loc = place.get("location") or {}
        rlat = float(loc.get("latitude", lat))
        rlng = float(loc.get("longitude", lng))
        display = place.get("displayName") or {}
        opening = place.get("regularOpeningHours") or {}
        weekday = opening.get("weekdayDescriptions") or []
        cafe = Cafe(
            id=f"google_{place_id}",
            place_id=place_id,
            name=display.get("text") or "Café",
            address=place.get("shortFormattedAddress") or place.get("formattedAddress", ""),
            area=_area_for_location(rlat, rlng),
            opening_hours=weekday[0] if weekday else "",
            rating=float(place.get("rating", 0.0) or 0.0),
            atmosphere=[
                t for t in (place.get("types") or [])
                if t not in _BORING_TYPES
            ][:3],
            distance_mock="",
            emoji="☕️",
            location=CafeLocation(lat=rlat, lng=rlng),
            source="google",
        )
        out.append(cafe)
        if len(out) >= limit:
            break
    return out


# A place qualifies as café-ish only if at least one of these is in its types.
_CAFE_LIKE = {
    "cafe",
    "coffee_shop",
    "bakery",  # a lot of German "Konditoreien" sit here and serve coffee on tables
    "pastry_shop",
    "tea_house",
    "dessert_shop",
}

# If any of these are present, it's not really a café — Google sometimes
# fits ``cafe`` as a secondary type onto gas stations, ice rinks, hotels…
_NOT_A_CAFE = {
    "gas_station",
    "ice_skating_rink",
    "indoor_playground",
    "lodging",
    "hotel",
    "convenience_store",
    "supermarket",
    "car_wash",
    "movie_theater",
    "fast_food_restaurant",
}

# Types that aren't useful as "atmosphere" tags in the UI.
_BORING_TYPES = {
    "cafe",
    "coffee_shop",
    "point_of_interest",
    "establishment",
    "food",
    "store",
    "food_store",
}


async def get_by_place_id(place_id: str) -> Optional[Cafe]:
    pool = get_pool()
    if pool is None:
        return None
    async with pool.acquire() as conn:
        row = await conn.fetchrow("SELECT * FROM cafes WHERE place_id = $1", place_id)
    return _row_to_cafe(row) if row else None


async def choose_best_cafe_for_match(
    area: Optional[str], lat: Optional[float] = None, lng: Optional[float] = None
) -> Optional[Cafe]:
    cafes = await search_cafes_near_location(CafeSearchQuery(area=area, lat=lat, lng=lng))
    if not cafes:
        return None
    return sorted(cafes, key=lambda c: c.rating, reverse=True)[0]
