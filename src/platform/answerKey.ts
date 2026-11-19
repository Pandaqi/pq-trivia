/**
 * Lock the answers with a passphrase, using Web Crypto.
 *
 * PBKDF2-SHA256 derives a 256-bit key, AES-GCM encrypts the file. Anyone can
 * still read the questions; nobody gets `correct` without the passphrase.
 */

import type { AnswerKey, EncryptedQuizPayload } from "../core/export/embedded";

const ITERATIONS = 150_000;
const SALT_BYTES = 16;
const IV_BYTES = 12;

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

function fromBase64(text: string): Uint8Array<ArrayBuffer> {
  const binary = atob(text);
  const bytes = new Uint8Array(new ArrayBuffer(binary.length));
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

async function deriveKey(
  passphrase: string,
  salt: Uint8Array<ArrayBuffer>,
  usage: ("encrypt" | "decrypt")[],
): Promise<CryptoKey> {
  const material = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(passphrase),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt,
      iterations: ITERATIONS,
      hash: "SHA-256",
    },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    usage,
  );
}

export const browserAnswerKey: AnswerKey = {
  async encrypt(value, passphrase) {
    const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
    const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
    const key = await deriveKey(passphrase, salt, ["encrypt"]);
    const data = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      key,
      new TextEncoder().encode(JSON.stringify(value)),
    );
    return {
      salt: toBase64(salt),
      iv: toBase64(iv),
      data: toBase64(new Uint8Array(data)),
    };
  },

  async unlock(payload, passphrase) {
    const salt = fromBase64(payload.salt);
    const iv = fromBase64(payload.iv);
    const key = await deriveKey(passphrase, salt, ["decrypt"]);
    const plain = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      key,
      fromBase64(payload.data),
    );
    return JSON.parse(new TextDecoder().decode(plain)) as unknown;
  },
};

/** Lock an embedded quiz. Hand the result to `load({ type: "encrypted" })`. */
export async function encryptQuiz(
  quiz: unknown,
  passphrase: string,
): Promise<EncryptedQuizPayload> {
  const parts = await browserAnswerKey.encrypt(quiz, passphrase);
  return { format: "pq-encrypted", version: 1, ...parts };
}
