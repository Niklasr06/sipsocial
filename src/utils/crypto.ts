// Mock encryption for chat messages. NOT secure — only meant to demonstrate
// the concept of encrypted-at-rest message storage in this prototype.
const SECRET = 'sip_social_demo_key';

function xor(text: string, key: string): string {
  let out = '';
  for (let i = 0; i < text.length; i += 1) {
    const c = text.charCodeAt(i) ^ key.charCodeAt(i % key.length);
    out += String.fromCharCode(c);
  }
  return out;
}

function toBase64(input: string): string {
  if (typeof btoa === 'function') return btoa(unescape(encodeURIComponent(input)));
  // React Native (no btoa) — Buffer polyfill fallback
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const b = (globalThis as any).Buffer;
  if (b) return b.from(input, 'binary').toString('base64');
  return input;
}

function fromBase64(input: string): string {
  if (typeof atob === 'function') return decodeURIComponent(escape(atob(input)));
  const b = (globalThis as any).Buffer;
  if (b) return b.from(input, 'base64').toString('binary');
  return input;
}

export function encryptMessage(plain: string): string {
  return toBase64(xor(plain, SECRET));
}

export function decryptMessage(cipher: string): string {
  try {
    return xor(fromBase64(cipher), SECRET);
  } catch {
    return cipher;
  }
}
