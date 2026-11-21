/**
 * Read-aloud play still has to show the things a host reads.
 *
 * Every type used to hide its input and forget the content with it. These
 * tests mount the real player with inputs off and check the actual surfaces.
 */

import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { Quiz } from "../../src/core/quiz/class";
import { mountQuiz, type MountedQuiz } from "../../src/renderers/preact/mount";
import { installDom, settleDom, type TestDom } from "./dom";

const TEXT = `Title => Options test
Seed => options-test
Policy => permissive

Question => Mark each claim.
Answers => True | False
Rows => The sky is blue | Water is dry
Correct => True | False
Type => Matrix

Question => Label the parts.
Media => map.png { alt="A diagram of a door" }
Answers => Handle | Hinge
Targets => Handle spot @ 30,50 | Hinge spot @ 70,50
Correct => Handle @ Handle spot | Hinge @ Hinge spot
Type => Diagram

Question => Put these in the right bucket.
Answers => Apple | Carrot
Buckets => Fruit | Vegetable
Correct => Apple @ Fruit | Carrot @ Vegetable
Type => Classification

Question => Which one is not a planet?
Answers => Mars | Venus | Pluto
Type => OddOneOut
Correct => Pluto

Question => Rank these.
Answers => One | Two | Three
Type => Rank

Question => Sort these.
Answers => Ant | Dog | Whale
Type => Sort

Question => Name the band and the singer.
Parts => open: Band: 2 | open: Singer: 1
Answers => The Beatles || Paul McCartney
Type => Parts

Question => How far away is the moon?
Answers => 384400
Type => Estimate
Tolerance => 500
Unit => km

Question => How many years did the wall stand?
Answers => 28
Type => Range
Range => 1
Unit => years
`;

const LIFELINES = `Title => Lifeline test
Seed => lifeline-test
Policy => permissive

Question => Pick one.
Answers => A | B | C
Correct => A
Type => Choice

Question => Mark each row.
Answers => True | False
Rows => One | Two
Correct => True | False
Type => Matrix

Question => Pick one before time runs out.
Answers => A | B
Correct => A
Type => Choice
Timer => 30
`;

async function waitFor(ready: () => boolean): Promise<void> {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (ready()) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
}

async function go(quiz: Quiz, index: number): Promise<void> {
  quiz.goTo(index);
  await waitFor(() => document.querySelector(".pq-screen-question") !== null);
}

let dom: TestDom;
let mounted: MountedQuiz;

async function open(
  text: string,
  lifelines: readonly string[] = [],
): Promise<Quiz> {
  mounted?.destroy();
  document.body.replaceChildren();
  const host = document.createElement("div");
  document.body.append(host);
  const quiz = new Quiz({ text, config: { lifelines } });
  mounted = mountQuiz(quiz, host, { attempts: false, printSheet: false });
  await quiz.loading;
  await waitFor(() => document.querySelector(".pq-screen-start") !== null);
  return quiz;
}

beforeAll(() => {
  dom = installDom();
});

afterAll(async () => {
  mounted?.destroy();
  await settleDom();
  dom?.uninstall();
});

describe("read-aloud options", () => {
  test("matrix keeps its statements and scale", async () => {
    const quiz = await open(TEXT);
    quiz.setInteractive(false);
    await go(quiz, 0);

    const table = document.querySelector(".pq-matrix-static");
    expect(table).not.toBeNull();
    expect(table?.textContent).toContain("The sky is blue");
    expect(table?.textContent).toContain("Water is dry");
    expect(table?.textContent).toContain("True");
    expect(table?.textContent).toContain("False");
    expect(table?.querySelectorAll("input").length).toBe(0);
  });

  test("diagram keeps the labels to place", async () => {
    const quiz = await open(TEXT);
    quiz.setInteractive(false);
    await go(quiz, 1);

    expect(document.querySelector(".pq-labels-static")?.textContent).toContain(
      "Handle",
    );
    expect(document.querySelector(".pq-labels-static")?.textContent).toContain(
      "Hinge",
    );
    expect(document.querySelector(".pq-media img")).not.toBeNull();
  });

  test("classification keeps items and buckets", async () => {
    const quiz = await open(TEXT);
    quiz.setInteractive(false);
    await go(quiz, 2);

    const body = document.querySelector(".pq-classification-static");
    expect(body).not.toBeNull();
    expect(body?.textContent).toContain("Apple");
    expect(body?.textContent).toContain("Carrot");
    expect(body?.textContent).toContain("Fruit");
    expect(body?.textContent).toContain("Vegetable");
  });

  test("odd one out keeps all options", async () => {
    const quiz = await open(TEXT);
    quiz.setInteractive(false);
    await go(quiz, 3);

    const cards = document.querySelectorAll(".pq-options .pq-answer");
    expect(cards.length).toBe(3);
    expect([...cards].map((card) => card.textContent).join(" ")).toContain(
      "Pluto",
    );
  });

  test("rank and sort use the same big cards as a choice", async () => {
    const quiz = await open(TEXT);
    quiz.setInteractive(false);

    await go(quiz, 4);
    expect(document.querySelectorAll(".pq-options .pq-answer").length).toBe(3);
    expect(document.querySelector(".pq-answers-plain")).toBeNull();

    await go(quiz, 5);
    expect(document.querySelectorAll(".pq-options .pq-answer").length).toBe(3);
    expect(document.querySelector(".pq-answers-plain")).toBeNull();
  });

  test("parts keeps every label", async () => {
    const quiz = await open(TEXT);
    quiz.setInteractive(false);
    await go(quiz, 6);

    const parts = document.querySelector(".pq-parts-static");
    expect(parts?.textContent).toContain("Band");
    expect(parts?.textContent).toContain("Singer");
    expect(parts?.querySelectorAll(".pq-part-line").length).toBe(2);
  });

  test("estimate uses a unit sentence, not a glued-on word", async () => {
    const quiz = await open(TEXT);
    quiz.setInteractive(false);
    await go(quiz, 7);
    await waitFor(() => document.querySelector(".pq-type-hint") !== null);

    const hint = document.querySelector(".pq-type-hint")?.textContent ?? "";
    expect(hint).toContain("(in km)");
    expect(hint).not.toContain("numberkm");
  });

  test("a range with a unit uses a unit sentence too", async () => {
    const quiz = await open(TEXT);
    quiz.setInteractive(false);
    await go(quiz, 8);
    await waitFor(() => document.querySelector(".pq-type-hint") !== null);

    const hint = document.querySelector(".pq-type-hint")?.textContent ?? "";
    expect(hint).toContain("(in years)");
    expect(hint).not.toContain("numberyears");
  });

  test("interactive matrix still has its controls", async () => {
    const quiz = await open(TEXT);
    quiz.setInteractive(true);
    await go(quiz, 0);

    expect(document.querySelector(".pq-matrix-static")).toBeNull();
    expect(document.querySelectorAll(".pq-matrix input").length).toBe(4);
  });
});

describe("lifelines fit the question", () => {
  const button = (name: string): Element | null =>
    document.querySelector(`[data-pq-lifeline="${name}"]`);

  test("50/50 is only on pick-one questions", async () => {
    const quiz = await open(LIFELINES, ["50/50"]);

    await go(quiz, 0);
    expect(button("50-50")).not.toBeNull();

    await go(quiz, 1);
    expect(button("50-50")).toBeNull();
  });

  test("extra time is only on timed questions", async () => {
    const quiz = await open(LIFELINES, ["extra-time"]);

    await go(quiz, 0);
    expect(button("extra-time")).toBeNull();

    await go(quiz, 2);
    expect(button("extra-time")).not.toBeNull();
  });
});
