import { describe, expect, test } from "bun:test";
import { InlineKind } from "../../src/core/format/inline";
import { MediaKind } from "../../src/core/values/media";
import { ScoringMethod } from "../../src/core/model/question";
import { buildQuiz } from "../../src/core/model/quiz";
import { planQuiz } from "../../src/core/plan/plan";
import {
  createSessionState,
  PlayMode,
  progressOf,
  sessionReducer,
} from "../../src/core/session/session";
import { questionScreen } from "../../src/core/session/viewModel";

const plan = planQuiz(
  buildQuiz(`
Question => Pick one
Answers => A | B | C
Type => Choice
Correct => A
Score => 2

Question => Fill [blank] and [blank].
Answers => one | two
Type => Cloze
Score => 4
Scoring => partial
`),
);

const first = plan.questions[0];
if (first === undefined) {
  throw new Error("fixture lost its question");
}

function view(): Parameters<typeof questionScreen>[2] {
  return {
    index: 0,
    total: plan.questions.length,
    progress: progressOf(createSessionState()),
    roundName: null,
    roundSecret: null,
    roundNumber: null,
    isRoundStart: false,
    authorsDiverse: false,
    categoriesDiverse: false,
  };
}

function loaded(): ReturnType<typeof createSessionState> {
  return sessionReducer(
    createSessionState(),
    { type: "load/success", plan },
    0,
  );
}

describe("answer content", () => {
  test("markdown, links and images survive in answers", () => {
    const quiz = planQuiz(
      buildQuiz(
        "Question => Pick\nAnswers => **Bold** [link](https://example.com) | shot.png | ![tiny](dot.svg)\nType => Choice",
      ),
    );
    const question = quiz.questions[0];
    if (question === undefined) {
      throw new Error("fixture lost its question");
    }
    const screen = questionScreen(question, loaded(), view());
    const kinds = (index: number): string[] =>
      screen.answers[index]?.nodes.map((node) => node.kind) ?? [];

    expect(kinds(0)).toContain(InlineKind.Strong);
    expect(kinds(0)).toContain(InlineKind.Link);
    expect(kinds(2)).toContain(InlineKind.Image);
    expect(screen.answers[1]?.media?.path).toBe("shot.png");
    expect(screen.answers[1]?.media?.kind).toBe(MediaKind.Image);
    expect(screen.answers[0]?.media).toBeNull();
  });
});

describe("question options", () => {
  const plan = planQuiz(
    buildQuiz(
      [
        "Question => Shuffle these",
        "Answers => A | B | C | D",
        "AnswersOrder => shuffle",
        "Media => one.png | two.png",
        "MediaOrder => shuffle",
        "Type => Choice",
        "Correct => A",
      ].join("\n"),
    ),
  );
  const question = plan.questions[0];
  if (question === undefined) {
    throw new Error("fixture lost its question");
  }

  test("AnswersOrder => shuffle really shuffles, the same way every time", () => {
    const first = questionScreen(question, loaded(), view()).answers.map(
      (answer) => answer.text,
    );
    const second = questionScreen(question, loaded(), view()).answers.map(
      (answer) => answer.text,
    );
    expect(first).toEqual(second);
    expect(first).not.toEqual(["A", "B", "C", "D"]);
    expect([...first].sort()).toEqual(["A", "B", "C", "D"]);
  });

  test("MediaOrder => shuffle applies to media", () => {
    const screen = questionScreen(question, loaded(), view());
    expect(screen.media.map((item) => item.path)).toEqual([
      "two.png",
      "one.png",
    ]);
  });

  test("FormatText => false leaves text alone", () => {
    const quiz = planQuiz(
      buildQuiz(
        "Question => **Not bold**\nFormatText => false\nAnswers => **Not bold** | $photo.png",
      ),
    );
    const plain = quiz.questions[0];
    if (plain === undefined) {
      throw new Error("fixture lost its question");
    }
    const screen = questionScreen(plain, loaded(), view());
    expect(screen.formatText).toBe(false);
    expect(screen.title.map((node) => node.kind)).toEqual([
      InlineKind.Text,
    ]);
    expect(screen.answers[0]?.nodes[0]?.kind).toBe(InlineKind.Text);
    expect(screen.answers[1]?.media).toBeNull();
  });

  test("audio and video answers are recognised by extension", () => {
    const quiz = planQuiz(
      buildQuiz(
        "Question => Pick\nAnswers => song.mp3 | clip.mp4 | cover.webp | text\nType => Choice",
      ),
    );
    const mediaQuestion = quiz.questions[0];
    if (mediaQuestion === undefined) {
      throw new Error("fixture lost its question");
    }
    const screen = questionScreen(mediaQuestion, loaded(), view());
    expect(
      screen.answers.map((answer) =>
        answer.media === null ? null : answer.media.kind,
      ),
    ).toEqual([
      MediaKind.Audio,
      MediaKind.Video,
      MediaKind.Image,
      null,
    ]);
  });
});

describe("answer points", () => {
  test("question mode carries no points in the view model", () => {
    const screen = questionScreen(first, loaded(), view());
    expect(screen.answers.map((answer) => answer.points)).toEqual([
      null,
      null,
      null,
    ]);
    expect(screen.answers.map((answer) => answer.correct)).toEqual([
      null,
      null,
      null,
    ]);
  });

  test("answer mode puts the score on the correct answer only", () => {
    const state = sessionReducer(
      loaded(),
      { type: "mode/set", mode: PlayMode.Answers },
      0,
    );
    const screen = questionScreen(first, state, view());
    expect(screen.answers.map((answer) => answer.points)).toEqual([
      2,
      null,
      null,
    ]);
  });

  test("partial scoring splits the points between correct answers", () => {
    const cloze = plan.questions[1];
    if (cloze === undefined) {
      throw new Error("fixture lost its question");
    }
    const state = sessionReducer(
      loaded(),
      { type: "mode/set", mode: PlayMode.Answers },
      0,
    );
    expect(cloze.scoring).toBe(ScoringMethod.Partial);
    expect(
      questionScreen(cloze, state, view()).answers.map((a) => a.points),
    ).toEqual([2, 2]);
  });
});
