import { describe, expect, test } from "bun:test";
import { generatePackKeys, signPack, verifyPack } from "../../cli/sign";

const encoder = new TextEncoder();

function pack(): Record<string, Uint8Array> {
  return {
    "index.html": encoder.encode("<h1>Quiz</h1>"),
    "quiz.trivia": encoder.encode("Quiz => Signed\n"),
    "sw.js": encoder.encode("self.addEventListener('install', () => {});"),
  };
}

describe("signed packs", () => {
  test("a signed pack verifies with its own public key", () => {
    const keys = generatePackKeys();
    const signature = signPack(pack(), keys.privateKey);
    expect(signature.algorithm).toBe("ed25519");
    expect(Object.keys(signature.files).length).toBe(3);
    expect(verifyPack(pack(), signature).ok).toBe(true);
  });

  test("one changed byte is caught", () => {
    const keys = generatePackKeys();
    const signature = signPack(pack(), keys.privateKey);
    const changed = {
      ...pack(),
      "quiz.trivia": encoder.encode("Quiz => Changed\n"),
    };
    const check = verifyPack(changed, signature);
    expect(check.ok).toBe(false);
    expect(check.problems.join(" ")).toContain("quiz.trivia");
  });

  test("a missing file is named", () => {
    const keys = generatePackKeys();
    const signature = signPack(pack(), keys.privateKey);
    const missing = { ...pack() };
    delete missing["sw.js"];
    const check = verifyPack(missing, signature);
    expect(check.ok).toBe(false);
    expect(check.problems.join(" ")).toContain("sw.js is missing");
  });

  test("another key does not pass", () => {
    const mine = generatePackKeys();
    const other = generatePackKeys();
    const signature = signPack(pack(), mine.privateKey);
    const forged = { ...signature, publicKey: other.publicKey };
    expect(verifyPack(pack(), forged).ok).toBe(false);
  });
});
