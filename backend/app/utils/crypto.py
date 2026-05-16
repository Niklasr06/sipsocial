"""Symmetric encryption for chat messages.

Uses Fernet (AES-128 in CBC + HMAC) from the ``cryptography`` package. The
key is loaded from the ``CHAT_ENCRYPTION_KEY`` environment variable. If the
key is missing, we generate an ephemeral one **for the current process only**
so the backend can still run in dev; persisted ciphertexts would not be
decryptable after a restart, which is logged loudly.
"""

from __future__ import annotations

import base64
import hashlib
import logging
from functools import lru_cache

from cryptography.fernet import Fernet, InvalidToken

from app.core.config import get_settings

logger = logging.getLogger("sipsocial.crypto")


def _normalize_key(raw: str) -> bytes:
    """Accept either a real Fernet key or any string we hash into one.

    Real Fernet keys are 44-char base64. Any other input is SHA-256-hashed
    and re-encoded so users can drop in a passphrase without worrying about
    formatting.
    """
    raw = raw.strip()
    if not raw:
        raise ValueError("empty key")
    try:
        Fernet(raw.encode())
        return raw.encode()
    except (ValueError, TypeError):
        digest = hashlib.sha256(raw.encode()).digest()
        return base64.urlsafe_b64encode(digest)


@lru_cache(maxsize=1)
def get_cipher() -> Fernet:
    settings = get_settings()
    raw = settings.CHAT_ENCRYPTION_KEY
    if not raw.strip():
        ephemeral = Fernet.generate_key()
        logger.warning(
            "CHAT_ENCRYPTION_KEY not set — using an ephemeral key. Existing "
            "ciphertexts will not be decryptable after restart.",
        )
        return Fernet(ephemeral)
    return Fernet(_normalize_key(raw))


def encrypt_message(plain: str) -> str:
    return get_cipher().encrypt(plain.encode("utf-8")).decode("ascii")


def decrypt_message(cipher: str) -> str:
    try:
        return get_cipher().decrypt(cipher.encode("ascii")).decode("utf-8")
    except InvalidToken:
        return "[Nachricht konnte nicht entschlüsselt werden]"
