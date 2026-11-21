/**
 * Every structured question keeps its content on paper.
 *
 * These are the same shapes the read-aloud player shows. A print sheet that
 * only says "put these in order" is a sheet with no options.
 */

import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import {
  mountPrintSheet,
  type MountedPrintSheet,
} from "../../src/renderers/preact/print/mountPrint";
import { Quiz } from "../../src/renderers/preact/quiz";
import { installDom, settleDom, type TestDom } from "./dom";

const TEXT = `Title => Print options test
Seed => print-options
Policy => permissive

Question => Mark the claims.
Media => map.png { alt="A matrix of claims" }
Answers => True | False
Rows => The sky is blue | Water is dry
Correct => True | False
Type => Matrix

Question => Label the door.
Media => map.png { alt="A diagram of a door" }
Answers => Handle | Hinge
Targets => Handle spot @ 30,50 | Hinge spot @ 70,50
Correct => Handle @ Handle spot | Hinge @ Hinge spot
Type => Diagram

Question => Put the fruit and veg away.
Media => map.png { alt="A fruit and vegetable diagram" }
Answers => Apple | Carrot
Buckets => Fruit | Vegetable
Correct => Apple @ Fruit | Carrot @ Vegetable
Type => Classification

Question => Which one is not a planet?
Media => map.png { alt="A diagram of the planets" }
Answers => Mars | Venus | Pluto
Type => OddOneOut
Correct => Pluto

Question => Rank these.
Media => map.png { alt="A ranking diagram" }
Answers => One | Two | Three
Type => Rank

Question => Sort these.
Media => map.png { alt="A sorting diagram" }
Answers => Ant | Dog | Whale
Type => Sort

Question => Name the band and the singer.
Media => map.png { alt="A band diagram" }
Parts => open: Band: 2 | open: Singer: 1
Answers => The Beatles || Paul McCartney
Type => Parts
`;

let dom: TestDom;
let quiz: Quiz;
let sheet: MountedPrintSheet;

function pageFor(title: string): Element {
  const page = [...document.querySelectorAll(".pq-print-question")].find(
    (element) => element.textContent?.includes(title) === true,
  );
  if (page === undefined) {
    throw new Error(`the print page is missing: ${title}`);
  }
  return page;
}

beforeAll(async () => {
  dom = installDom();
  quiz = new Quiz({ text: TEXT });
  await quiz.loading;
  const host = document.createElement("div");
  document.body.append(host);
  sheet = mountPrintSheet(quiz, host);
});

afterAll(async () => {
  sheet?.destroy();
  quiz?.destroy();
  await settleDom();
  dom?.uninstall();
});

describe("print options", () => {
  test("matrix prints its rows and scale", () => {
    const page = pageFor("Mark the claims.");
    const table = page.querySelector(".pq-matrix-static");
    expect(table).not.toBeNull();
    expect(table?.textContent).toContain("The sky is blue");
    expect(table?.textContent).toContain("Water is dry");
    expect(table?.textContent).toContain("True");
    expect(table?.textContent).toContain("False");
    expect(table?.querySelectorAll("input").length).toBe(0);
  });

  test("diagram prints the labels and lettered targets", () => {
    const page = pageFor("Label the door.");
    expect(page.querySelector(".pq-labels-static")?.textContent).toContain(
      "Handle",
    );
    expect(page.querySelector(".pq-labels-static")?.textContent).toContain(
      "Hinge",
    );
    expect(page.querySelectorAll(".pq-print-target").length).toBe(2);
    expect(page.querySelector(".pq-media img")).not.toBeNull();
  });

  test("classification prints the items and buckets", () => {
    const page = pageFor("Put the fruit and veg away.");
    expect(page.querySelector(".pq-classification-static")).not.toBeNull();
    const text = page.textContent ?? "";
    expect(text).toContain("Apple");
    expect(text).toContain("Carrot");
    expect(text).toContain("Fruit");
    expect(text).toContain("Vegetable");
  });

  test("odd one out prints every option", () => {
    const page = pageFor("Which one is not a planet?");
    expect(page.querySelectorAll(".pq-answer").length).toBe(3);
    expect(page.textContent).toContain("Pluto");
  });

  test("rank and sort print the options as cards", () => {
    for (const title of ["Rank these.", "Sort these."]) {
      const page = pageFor(title);
      expect(page.querySelectorAll(".pq-answer").length).toBe(3);
      expect(page.querySelector(".pq-answers-plain")).toBeNull();
    }
    const rank = pageFor("Rank these.");
    expect(rank.querySelector(".pq-media img")).not.toBeNull();
  });

  test("parts prints every label and writing line", () => {
    const page = pageFor("Name the band and the singer.");
    const parts = page.querySelector(".pq-parts-static");
    expect(parts?.textContent).toContain("Band");
    expect(parts?.textContent).toContain("Singer");
    expect(parts?.querySelectorAll(".pq-part-line").length).toBe(2);
  });

  test("media never hides the six structured option shapes", () => {
    const cases = [
      ["Mark the claims.", ".pq-matrix-static"],
      ["Which one is not a planet?", ".pq-answers"],
      ["Rank these.", ".pq-answers"],
      ["Sort these.", ".pq-answers"],
      ["Put the fruit and veg away.", ".pq-classification-static"],
      ["Name the band and the singer.", ".pq-parts-static"],
    ] as const;
    for (const [title, selector] of cases) {
      const page = pageFor(title);
      expect(page.querySelector(`.pq-split-left ${selector}`)).not.toBeNull();
      expect(
        page.querySelector(".pq-split-right .pq-media img"),
      ).not.toBeNull();
    }
  });

  test("the answer sheet fills in the structured answers", () => {
    const host = document.createElement("div");
    document.body.append(host);
    const answers = mountPrintSheet(quiz, host, { variant: "answers" });
    const page = [...host.querySelectorAll(".pq-print-question")].find(
      (element) => element.textContent?.includes("Mark the claims.") === true,
    );
    expect(page?.querySelectorAll(".pq-print-mark").length).toBe(2);

    const buckets = [...host.querySelectorAll(".pq-print-question")].find(
      (element) => element.textContent?.includes("Put the fruit") === true,
    );
    expect(buckets?.querySelector(".pq-bucket")?.textContent).toContain(
      "Apple",
    );

    const parts = [...host.querySelectorAll(".pq-print-question")].find(
      (element) => element.textContent?.includes("Name the band") === true,
    );
    expect(parts?.querySelector(".pq-answer-key")?.textContent).toContain(
      "The Beatles",
    );
    answers.destroy();
    host.remove();
  });
});
