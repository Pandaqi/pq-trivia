import { describe, expect, test } from "bun:test";
import { createQuiz } from "../../src/core/quiz";
import { ResponseKind } from "../../src/core/session/responses";
import { createRoomCode, isRoomCode } from "../../src/multiplayer/code";
import { QuestionType } from "../../src/core/model/question";
import { createHost } from "../../src/multiplayer/host";
import { createPlayer } from "../../src/multiplayer/player";
import {
  createRateLimiter,
  isResponse,
  parseEnvelope,
} from "../../src/multiplayer/protocol";
import type { MemoryNetwork } from "../../src/multiplayer/transport/memory";
import { memoryNetwork } from "../../src/multiplayer/transport/memory";
import {
  MessageType,
  RevealMode,
  RoomPhase,
  type LiveQuestion,
} from "../../src/multiplayer/types";

const TEXT = `
Title => Live test
Seed => live

Question => Pick B
Answers => A | B | C
Type => Choice
Correct => B
Explanation => B is the one.

Question => Say hello
Answers => hello
`;

const tick = (): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, 0));

const ROUNDS = `
Title => Modes
Seed => modes

## First

Question => One
Answers => A | B
Type => Choice
Correct => B

Question => Two
Answers => A | B
Type => Choice
Correct => B

## Second

Question => Three
Answers => A | B
Type => Choice
Correct => B
`;

async function quizFrom(text: string): Promise<ReturnType<typeof createQuiz>> {
  const quiz = createQuiz();
  await quiz.load({ type: "text", text });
  return quiz;
}

async function loadedQuiz(): Promise<ReturnType<typeof createQuiz>> {
  return quizFrom(TEXT);
}

/** Past the 250ms rate limit, so the next answer from this player lands. */
const breathe = (): Promise<void> => Bun.sleep(260);

function choice(id: string) {
  return { kind: ResponseKind.Choice as const, selected: [id] };
}

describe("room codes", () => {
  test("four characters, no O, 0, I or 1", () => {
    for (let index = 0; index < 200; index += 1) {
      const code = createRoomCode();
      expect(isRoomCode(code)).toBe(true);
      expect(code).not.toMatch(/[O0I1]/);
    }
    expect(isRoomCode("ABCD")).toBe(true);
    expect(isRoomCode("ABC")).toBe(false);
  });
});

describe("protocol", () => {
  test("an envelope must be v1 with a known type", () => {
    const good = {
      v: 1,
      type: MessageType.Join,
      id: "x",
      ts: Date.now(),
      from: "peer",
      payload: {},
    };
    expect(parseEnvelope(good)).not.toBeNull();
    expect(parseEnvelope({ ...good, v: 2 })).toBeNull();
    expect(parseEnvelope({ ...good, type: "nope" })).toBeNull();
    expect(parseEnvelope({ ...good, id: undefined })).toBeNull();
  });

  test("custom widget responses never cross the wire", () => {
    expect(isResponse({ kind: ResponseKind.Custom, value: 1 })).toBe(false);
    expect(isResponse({ kind: ResponseKind.Open, text: "hi" })).toBe(true);
    expect(isResponse({ kind: ResponseKind.Choice, selected: [1] })).toBe(
      false,
    );
  });

  test("the rate limiter drops a burst", () => {
    const limit = createRateLimiter(100);
    expect(limit.allow("a", 0)).toBe(true);
    expect(limit.allow("a", 50)).toBe(false);
    expect(limit.allow("a", 150)).toBe(true);
    expect(limit.allow("b", 151)).toBe(true);
  });
});

describe("a live round", () => {
  test("host and player see the same question, never the answer", async () => {
    const network = memoryNetwork();
    const host = await createHost({
      quiz: await loadedQuiz(),
      transport: network,
      code: "ABCD",
    });
    const ada = await createPlayer({
      transport: network,
      code: "ABCD",
      name: "Ada",
    });
    await ada.join();
    expect(host.state().players.length).toBe(1);
    expect(host.state().phase).toBe(RoomPhase.Lobby);

    host.start();
    await tick();
    const question = ada.state().question;
    expect(question?.title).toBe("Pick B");
    expect(question?.answers.length).toBe(3);
    expect(JSON.stringify(question)).not.toContain("correct");
    expect(ada.state().phase).toBe(RoomPhase.Question);
    host.leave();
    ada.leave();
  });

  test("a correct answer scores, a reveal shows it, the end ends", async () => {
    const network = memoryNetwork();
    const host = await createHost({
      quiz: await loadedQuiz(),
      transport: network,
      code: "WXYZ",
    });
    const ada = await createPlayer({
      transport: network,
      code: "WXYZ",
      name: "Ada",
    });
    await ada.join();
    host.start();
    await tick();

    const correct = ada
      .state()
      .question?.answers.find((answer) => answer.text === "B");
    expect(correct).toBeDefined();
    ada.submit(choice(correct?.id ?? ""));
    await tick();
    expect(host.state().players[0]?.answered).toBe(true);

    host.reveal();
    await tick();
    const reveal = ada.state().reveal;
    expect(reveal?.correct).toEqual(["B"]);
    expect(reveal?.results[ada.state().id ?? ""]?.points).toBe(1);
    expect(ada.state().leaderboard[0]?.score).toBe(1);

    host.end();
    await tick();
    expect(ada.state().phase).toBe(RoomPhase.Ended);
    host.leave();
    ada.leave();
  });

  test("a stranger cannot submit, and a closed question is late", async () => {
    const network = memoryNetwork();
    const host = await createHost({
      quiz: await loadedQuiz(),
      transport: network,
      code: "LMNO",
    });
    const stranger = await createPlayer({
      transport: network,
      code: "ZZZZ",
      name: "Mallory",
      joinTimeoutMs: 40,
    });
    await stranger.join().catch(() => undefined);
    stranger.submit({ kind: ResponseKind.Open, text: "nope" });
    expect(host.state().players.length).toBe(0);

    const ada = await createPlayer({
      transport: network,
      code: "LMNO",
      name: "Ada",
    });
    await ada.join();
    host.start();
    await tick();
    host.close();
    await tick();
    const answer = ada
      .state()
      .question?.answers.find((entry) => entry.text === "B");
    ada.submit(choice(answer?.id ?? ""));
    await tick();
    host.reveal();
    await tick();
    const result = ada.state().reveal?.results[ada.state().id ?? ""];
    expect(result?.late).toBe(true);
    expect(result?.points).toBe(0);
    host.leave();
    ada.leave();
    stranger.leave();
  });

  test("one answer per question, unless the host allows changes", async () => {
    const network = memoryNetwork();
    const host = await createHost({
      quiz: await loadedQuiz(),
      transport: network,
      code: "EFGH",
    });
    const ada = await createPlayer({
      transport: network,
      code: "EFGH",
      name: "Ada",
    });
    await ada.join();
    host.start();
    await tick();
    const answers = ada.state().question?.answers ?? [];
    const b = answers.find((entry) => entry.text === "B");
    const c = answers.find((entry) => entry.text === "C");
    ada.submit(choice(b?.id ?? ""));
    await tick();
    // Past the rate limit, but still a second answer to the same question.
    await Bun.sleep(260);
    ada.submit(choice(c?.id ?? ""));
    await tick();
    host.reveal();
    await tick();
    const result = ada.state().reveal?.results[ada.state().id ?? ""];
    expect(result?.correct).toBe(true);
    expect(result?.points).toBe(1);
    host.leave();
    ada.leave();
  });

  test("a reconnect token restores the player and the score", async () => {
    const network = memoryNetwork();
    const host = await createHost({
      quiz: await loadedQuiz(),
      transport: network,
      code: "PQRS",
    });
    const first = await createPlayer({
      transport: network,
      code: "PQRS",
      name: "Ada",
    });
    await first.join();
    const token = first.token;
    expect(token).not.toBeNull();
    host.start();
    await tick();
    const correct = first
      .state()
      .question?.answers.find((entry) => entry.text === "B");
    first.submit(choice(correct?.id ?? ""));
    await tick();
    host.reveal();
    await tick();
    expect(first.state().leaderboard[0]?.score).toBe(1);
    first.leave();
    await tick();

    const again = await createPlayer({
      transport: network,
      code: "PQRS",
      name: "Ada",
      token,
    });
    await again.join();
    await tick();
    expect(again.state().joined).toBe(true);
    expect(again.state().id).not.toBeNull();
    expect(again.state().question?.title).toBe("Pick B");
    expect(again.state().leaderboard[0]?.score).toBe(1);
    host.leave();
    again.leave();
  });
});

describe("reveal modes", () => {
  function answerB(question: LiveQuestion | null): string {
    return question?.answers.find((answer) => answer.text === "B")?.id ?? "";
  }

  async function join(code: string, network: MemoryNetwork) {
    const player = await createPlayer({
      transport: network,
      code,
      name: "Ada",
    });
    await player.join();
    return player;
  }

  test("round mode keeps the answers until the round ends", async () => {
    const network = memoryNetwork();
    const host = await createHost({
      quiz: await quizFrom(ROUNDS),
      transport: network,
      code: "RND1",
      reveal: RevealMode.Round,
    });
    const ada = await join("RND1", network);
    host.start();
    await tick();
    expect(host.state().revealMode).toBe(RevealMode.Round);
    // The round card reaches the phone too, so nobody thinks it froze.
    expect(ada.state().question?.type).toBe(QuestionType.Section);
    expect(host.state().total).toBe(5);

    host.next();
    await tick();
    expect(ada.state().question?.title).toBe("One");
    ada.submit(choice(answerB(ada.state().question)));
    await tick();

    host.next();
    await tick();
    expect(ada.state().question?.title).toBe("Two");
    expect(ada.state().reveal).toBeNull();

    await breathe();
    ada.submit(choice(answerB(ada.state().question)));
    await tick();
    host.next();
    await tick();
    const reveal = ada.state().reveal;
    expect(reveal?.items.length).toBe(2);
    expect(reveal?.leaderboard[0]?.score).toBe(2);

    host.next();
    await tick();
    expect(ada.state().question?.type).toBe(QuestionType.Section);
    host.next();
    await tick();
    expect(ada.state().question?.title).toBe("Three");
    host.leave();
    ada.leave();
  });

  test("the host sets the mode and the round cards in the lobby", async () => {
    const network = memoryNetwork();
    const host = await createHost({
      quiz: await quizFrom(ROUNDS),
      transport: network,
      code: "SET1",
    });
    const ada = await join("SET1", network);
    expect(host.state().sections).toBe(true);

    host.setRevealMode(RevealMode.Pass);
    host.setSections(false);
    await tick();
    expect(host.state().revealMode).toBe(RevealMode.Pass);
    expect(host.state().total).toBe(3);

    host.start();
    await tick();
    expect(ada.state().question?.title).toBe("One");

    // Too late now: the flow positions would move under everyone.
    host.setSections(true);
    expect(host.state().sections).toBe(false);
    host.leave();
    ada.leave();
  });

  test("end mode says nothing until the quiz is over", async () => {
    const network = memoryNetwork();
    const host = await createHost({
      quiz: await loadedQuiz(),
      transport: network,
      code: "END1",
      reveal: RevealMode.End,
    });
    const ada = await join("END1", network);
    host.start();
    await tick();
    ada.submit(choice(answerB(ada.state().question)));
    await tick();
    host.reveal();
    expect(ada.state().reveal).toBeNull();

    host.next();
    await tick();
    await breathe();
    ada.submit({ kind: ResponseKind.Open, text: "hello" });
    await tick();
    host.next();
    await tick();

    expect(ada.state().phase).toBe(RoomPhase.Ended);
    expect(ada.state().reveal).toBeNull();
    expect(ada.state().leaderboard[0]?.score).toBe(2);
    host.leave();
    ada.leave();
  });

  test("pass mode replays the quiz with everyone's answers", async () => {
    const network = memoryNetwork();
    const host = await createHost({
      quiz: await loadedQuiz(),
      transport: network,
      code: "PASS",
      reveal: RevealMode.Pass,
    });
    const ada = await join("PASS", network);
    host.start();
    await tick();
    ada.submit(choice(answerB(ada.state().question)));
    await tick();
    host.reveal();
    expect(ada.state().reveal).toBeNull();

    host.next();
    await tick();
    await breathe();
    ada.submit({ kind: ResponseKind.Open, text: "hello" });
    await tick();
    host.next();
    await tick();

    expect(host.state().phase).toBe(RoomPhase.Answers);
    expect(host.state().index).toBe(0);
    expect(ada.state().phase).toBe(RoomPhase.Answers);
    expect(ada.state().question?.title).toBe("Pick B");

    host.reveal();
    await tick();
    const first = ada.state().reveal?.items[0];
    expect(first?.results[ada.state().id ?? ""]?.given).toBe("B");

    host.next();
    await tick();
    host.reveal();
    await tick();
    expect(ada.state().reveal?.items[0]?.correct).toEqual(["hello"]);

    host.next();
    await tick();
    expect(ada.state().phase).toBe(RoomPhase.Ended);
    expect(ada.state().leaderboard[0]?.score).toBe(2);
    host.leave();
    ada.leave();
  });
});
