"""Row <-> Pydantic model conversion helpers."""

from __future__ import annotations

import json
import uuid
from datetime import date, datetime, time
from typing import Any, Mapping, Union


def new_id(prefix: str) -> str:
    return f"{prefix}_{uuid.uuid4().hex[:12]}"


def to_date(value: Union[str, date]) -> date:
    """Coerce an ISO-string into a ``datetime.date``.

    asyncpg's date encoder is strict — it needs a real ``date``, not a string,
    even when the SQL cast is ``$1::date``. We funnel every insert through
    this helper so the API layer can keep working in pure strings.
    """
    if isinstance(value, date) and not isinstance(value, datetime):
        return value
    if isinstance(value, datetime):
        return value.date()
    return date.fromisoformat(str(value))


def to_time(value: Union[str, time]) -> time:
    if isinstance(value, time):
        return value
    return time.fromisoformat(str(value))


def _convert(value: Any) -> Any:
    """Normalize asyncpg-native values to JSON-friendly primitives."""
    if isinstance(value, (datetime,)):
        return value.isoformat()
    if isinstance(value, date):
        return value.isoformat()
    if isinstance(value, time):
        return value.strftime("%H:%M")
    return value


def row_to_dict(row: Mapping[str, Any] | None) -> dict[str, Any] | None:
    if row is None:
        return None
    return {key: _convert(value) for key, value in row.items()}


def parse_jsonb(value: Any) -> Any:
    """asyncpg with our codec returns dict already; defensive parse for str."""
    if value is None:
        return None
    if isinstance(value, (dict, list)):
        return value
    if isinstance(value, str):
        try:
            return json.loads(value)
        except ValueError:
            return value
    return value
