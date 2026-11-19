/**
 * JSON v3. The save format.
 *
 * It carries a `$schema`, a schema version and answers as IDs, so a consumer
 * can validate it before trusting it. Readable by default, compact on request.
 */

import type { QuizModel } from "../model/quiz";
import {
  fromEmbedded,
  toEmbedded,
  toEmbeddedJson,
  EMBEDDED_SCHEMA_URL,
  EMBEDDED_VERSION,
  type EmbeddedOptions,
  type ImportResult,
} from "./embedded";

export const JSON_SCHEMA_URL = EMBEDDED_SCHEMA_URL;
export const JSON_SCHEMA_VERSION = EMBEDDED_VERSION;

export interface JsonOptions extends EmbeddedOptions {
  readonly pretty?: boolean;
}

export function toQuizJson(quiz: QuizModel, options: JsonOptions = {}): string {
  return toEmbeddedJson(quiz, options);
}

export function fromQuizJson(input: unknown): ImportResult {
  return fromEmbedded(input);
}

/** A small, honest schema. Enough for editors and CI to catch a broken file. */
export function quizJsonSchema(): Readonly<Record<string, unknown>> {
  return {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    $id: JSON_SCHEMA_URL,
    title: "PQ-Trivia quiz",
    type: "object",
    required: ["schemaVersion", "meta", "questions"],
    properties: {
      $schema: { type: "string" },
      schemaVersion: { const: JSON_SCHEMA_VERSION },
      meta: {
        type: "object",
        required: ["title"],
        properties: {
          title: { type: "string" },
          languages: { type: "array", items: { type: "string" } },
          seed: { type: ["string", "null"] },
        },
      },
      config: { type: "object" },
      rounds: {
        type: "array",
        items: {
          type: "object",
          required: ["id", "name", "questions"],
          properties: {
            id: { type: "string" },
            name: { type: "string" },
            secret: { type: ["string", "null"] },
            questions: { type: "array", items: { type: "string" } },
          },
        },
      },
      questions: {
        type: "object",
        additionalProperties: {
          type: "object",
          required: ["id", "type", "text", "answers", "correct", "score"],
          properties: {
            id: { type: "string" },
            type: { type: "string" },
            text: { type: "array", items: { type: "string" } },
            answers: {
              type: "array",
              items: {
                type: "object",
                required: ["id", "text"],
                properties: {
                  id: { type: "string" },
                  text: { type: "string" },
                },
              },
            },
            correct: { type: "array", items: { type: "string" } },
            score: { type: "number" },
          },
        },
      },
    },
  };
}

export { toEmbedded, fromEmbedded };
