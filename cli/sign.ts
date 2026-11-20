/**
 * Signed packs. A hash says nothing changed. A signature says who shipped it.
 *
 * Ed25519 through Node's crypto, which Bun carries. No new dependency. The
 * private key never reaches the pack; the public key does, so anyone can check.
 */

import {
  createHash,
  createPublicKey,
  generateKeyPairSync,
  sign,
  verify,
} from "node:crypto";

export const SIGNATURE_FORMAT = "pq-pack-signature";
export const SIGNATURE_VERSION = 1;
export const SIGNATURE_ALGORITHM = "ed25519";

export interface PackSignature {
  readonly format: typeof SIGNATURE_FORMAT;
  readonly version: typeof SIGNATURE_VERSION;
  readonly algorithm: typeof SIGNATURE_ALGORITHM;
  /** Path to SHA-256, hex, for every file in the pack. */
  readonly files: Readonly<Record<string, string>>;
  readonly publicKey: string;
  /** Ed25519 over the canonical `files` text below. Base64. */
  readonly signature: string;
}

export interface PackVerification {
  readonly ok: boolean;
  readonly problems: readonly string[];
}

export function sha256(text: string | Uint8Array): string {
  return createHash("sha256").update(text).digest("hex");
}

/** Path and hash, sorted, one per line. Same input, same bytes, everywhere. */
export function hashList(files: Readonly<Record<string, string>>): string {
  return Object.keys(files)
    .sort()
    .map((path) => `${path} ${files[path] ?? ""}`)
    .join("\n");
}

export function hashFiles(
  files: Readonly<Record<string, Uint8Array>>,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [path, content] of Object.entries(files)) {
    out[path] = sha256(content);
  }
  return out;
}

export function generatePackKeys(): {
  readonly privateKey: string;
  readonly publicKey: string;
} {
  const pair = generateKeyPairSync("ed25519", {
    privateKeyEncoding: { type: "pkcs8", format: "pem" },
    publicKeyEncoding: { type: "spki", format: "pem" },
  });
  return { privateKey: pair.privateKey, publicKey: pair.publicKey };
}

export function signPack(
  files: Readonly<Record<string, Uint8Array>>,
  privateKey: string,
): PackSignature {
  const hashes = hashFiles(files);
  const text = hashList(hashes);
  const signature = sign(null, Buffer.from(text, "utf8"), privateKey);
  return {
    format: SIGNATURE_FORMAT,
    version: SIGNATURE_VERSION,
    algorithm: SIGNATURE_ALGORITHM,
    files: hashes,
    publicKey: derivePublicKey(privateKey),
    signature: signature.toString("base64"),
  };
}

/**
 * Check every file the signature names, and check that none went missing.
 * Extra files are fine: a `signature.json` next to a photo does not lie.
 */
export function verifyPack(
  files: Readonly<Record<string, Uint8Array>>,
  signature: PackSignature,
): PackVerification {
  const problems: string[] = [];
  if (
    signature.format !== SIGNATURE_FORMAT ||
    signature.version !== SIGNATURE_VERSION ||
    signature.algorithm !== SIGNATURE_ALGORITHM
  ) {
    return { ok: false, problems: ["This is not a pack signature."] };
  }
  for (const [path, wanted] of Object.entries(signature.files)) {
    const content = files[path];
    if (content === undefined) {
      problems.push(`${path} is missing.`);
      continue;
    }
    if (sha256(content) !== wanted) {
      problems.push(`${path} changed after it was signed.`);
    }
  }
  let signed = false;
  try {
    signed = verify(
      null,
      Buffer.from(hashList(signature.files), "utf8"),
      signature.publicKey,
      Buffer.from(signature.signature, "base64"),
    );
  } catch {
    signed = false;
  }
  if (!signed) {
    problems.push("The signature does not match the file hashes.");
  }
  return { ok: problems.length === 0, problems };
}

/** The public half of a PEM private key, so the pack can carry its own check. */
function derivePublicKey(privateKey: string): string {
  // `createPublicKey` accepts the private key and gives back the public one.
  return createPublicKey(privateKey)
    .export({ type: "spki", format: "pem" })
    .toString();
}
