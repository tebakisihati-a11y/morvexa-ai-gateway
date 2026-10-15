/**
 * Isomorphic hashing and randomness.
 *
 * Both the server and the browser expose the Web Crypto API, so using it here
 * avoids importing node:crypto. That import is what made webpack bundle the
 * ~98 kB gzipped crypto-browserify polyfill into the client-rendered owner
 * console, even though every one of these calls happens on the server.
 *
 * Everything is async because SubtleCrypto.digest is.
 */

const encoder = new TextEncoder();

function webCrypto(): Crypto {
  const available = globalThis.crypto;
  if (!available?.subtle) {
    throw new Error(
      "Web Crypto API is unavailable in this runtime. Node 19+ or a modern browser is required."
    );
  }
  return available;
}

function toHex(bytes: Uint8Array): string {
  let out = "";
  for (const byte of bytes) out += byte.toString(16).padStart(2, "0");
  return out;
}

/** SHA-256 hex digest of a UTF-8 string. */
export async function sha256Hex(input: string): Promise<string> {
  const digest = await webCrypto().subtle.digest("SHA-256", encoder.encode(input));
  return toHex(new Uint8Array(digest));
}

/** Cryptographically secure random bytes rendered as lowercase hex. */
export function randomHex(byteLength: number): string {
  const buffer = new Uint8Array(byteLength);
  webCrypto().getRandomValues(buffer);
  return toHex(buffer);
}

/**
 * Cryptographically secure random bytes rendered as base64url, which is safe to
 * place in a URL query string without further escaping.
 */
export function randomBase64Url(byteLength: number): string {
  const buffer = new Uint8Array(byteLength);
  webCrypto().getRandomValues(buffer);

  let binary = "";
  for (const byte of buffer) binary += String.fromCharCode(byte);

  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
