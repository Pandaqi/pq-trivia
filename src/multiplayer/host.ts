/**
 * The host. It owns the state, the deadline and the answers.
 *
 * Players only ever receive an allowlisted question. Correct answers leave this
 * file at the reveal, never before it.
 *
 * When that reveal happens is a mode, not a constant: per question, per round,
 * at the end, or a second pass through the whole quiz with everyone's answers.
 *
 * Everything here counts in `slots`: plan positions with the section screens
 * taken out. A phone has no use for a round title as a question, and the
 * numbering on screen should match the numbering a host reads out loud.
 */

import { gradeQuestion } from "../core/grading/grading";
import { round2 } from "../core/grading/parts";
import { settleWager } from "../core/grading/wager";
import { QuestionType, type QuestionModel } from "../core/model/question";
import type { QuizPlan } from "../core/plan/plan";
import { flowSlots, rangeOf, roundRanges } from "./flow";
import { describeResponse, liveQuestion, roundNameOf } from "./present";
import { createEnvelope } from "./protocol";
import { createRoster } from "./roster";
import type { Room } from "./transport/types";
import {
  DEFAULT_REVEAL_MODE,
  MAX_PLAYERS,
  MessageType,
  RevealMode,
  RoomPhase,
  type BuzzPayload,
  type BuzzState,
  type ClosePayload,
  type HostOptions,
  type HostRoom,
  type JoinPayload,
  type LiveQuestion,
  type PlayerResult,
  type QuestionPayload,
  type RevealItem,
  type RevealPayload,
  type RoomStatePayload,
  type ScorePayload,
  type SubmitPayload,
} from "./types";

export async function createHost(options: HostOptions): Promise<HostRoom> {
  const quiz = options.quiz;
  const loadedPlan = quiz.state.plan;
  if (loadedPlan === null || loadedPlan.total === 0) {
    throw new Error("Load a quiz before opening a room.");
  }
  const plan: QuizPlan = loadedPlan;
  const maxPlayers = Math.min(options.maxPlayers ?? MAX_PLAYERS, MAX_PLAYERS);
  const allowChanges = options.allowChanges === true;
  let showSections = options.sections !== false;
  let revealMode = options.reveal ?? DEFAULT_REVEAL_MODE;
  let slots = flowSlots(plan, showSections);
  let rounds = roundRanges(plan, slots);
  let total = slots.length;
  if (total === 0) {
    throw new Error("Load a quiz before opening a room.");
  }
  const room: Room = await options.transport.create(options.code);
  const listeners = new Set<() => void>();
  const graded = new Set<string>();

  let phase = RoomPhase.Lobby;
  let index = -1;
  /** The highest slot whose answers have gone out. */
  let revealedThrough = -1;
  let current: QuestionModel | null = null;
  let currentQuestion: LiveQuestion | null = null;
  let closed = false;
  let deadline: number | null = null;
  let seq = 0;
  let lastQuestion: QuestionPayload | null = null;
  let lastReveal: RevealPayload | null = null;
  /** First buzz on the current question. Cleared when the next one shows. */
  let buzz: BuzzState | null = null;

  const roster = createRoster({
    room,
    maxPlayers,
    allowChanges,
    phase: () => phase,
    current: () => current,
    closed: () => closed,
    deadline: () => deadline,
    sendState,
    publishState,
    replay,
    onBuzz,
  });

  let snapshot = stateOf(null);

  function stateOf(
    you: string | null,
    token: string | null = null,
  ): RoomStatePayload {
    return {
      code: options.code,
      phase,
      revealMode,
      sections: showSections,
      players: roster.live(),
      index,
      total,
      seq,
      you,
      token,
      buzz,
    };
  }

  function notify(): void {
    snapshot = stateOf(null);
    for (const listener of [...listeners]) {
      listener();
    }
  }

  function sendTo(peer: string, type: MessageType, payload: unknown): void {
    room.send(createEnvelope(type, payload, room.selfId), peer);
  }

  function sendState(peer: string, playerId: string | null): void {
    const token =
      playerId === null ? null : (roster.players.get(playerId)?.token ?? null);
    sendTo(peer, MessageType.RoomState, stateOf(playerId, token));
  }

  function broadcast(type: MessageType, payload: unknown): void {
    for (const player of roster.players.values()) {
      if (player.peer !== null) {
        sendTo(player.peer, type, payload);
      }
    }
  }

  function publishState(): void {
    for (const player of roster.players.values()) {
      if (player.peer !== null) {
        sendState(player.peer, player.id);
      }
    }
    notify();
  }

  /** A phone that came back gets the question and the reveal it missed. */
  function replay(peer: string): void {
    if (lastQuestion !== null) {
      seq += 1;
      sendTo(peer, MessageType.QuestionShow, {
        ...lastQuestion,
        seq,
        closed,
      } satisfies QuestionPayload);
    }
    if (lastReveal !== null) {
      seq += 1;
      sendTo(peer, MessageType.AnswerReveal, {
        ...lastReveal,
        seq,
      } satisfies RevealPayload);
    }
  }

  /**
   * The host is the clock. A phone's buzz only counts if it is the first to
   * arrive for the current buzzer question. The timestamp is the receipt.
   */
  function onBuzz(playerId: string, name: string, questionId: string): void {
    if (current === null || phase !== RoomPhase.Question || closed) {
      return;
    }
    if (!current.buzzer || current.id !== questionId || buzz !== null) {
      return;
    }
    buzz = { playerId, name, at: Date.now() };
    broadcast(MessageType.Buzz, {
      questionId,
      ...buzz,
    } satisfies BuzzPayload);
    publishState();
  }

  function questionAt(position: number): QuestionModel | undefined {
    const at = slots[position];
    return at === undefined ? undefined : plan.questions[at];
  }

  /** A round card has no answers to grade and nothing to reveal. */
  function isSection(question: QuestionModel | undefined): boolean {
    return question?.type === QuestionType.Section;
  }

  /**
   * Score one question and collect what everyone said. Called once per
   * question, ever: a second reveal must not pay out twice.
   */
  function gradeOne(question: QuestionModel): Record<string, PlayerResult> {
    const results: Record<string, PlayerResult> = {};
    for (const player of roster.players.values()) {
      const response = player.responses.get(question.id);
      if (response === undefined) {
        continue;
      }
      const grade = gradeQuestion(question, response);
      const late = player.late.has(question.id);
      const correct = grade.correct && !late;
      // The same rule as solo, from the same file. A late answer is wrong, so
      // it loses the stake too.
      const settled = settleWager({
        offered: player.stakes.get(question.id),
        allowed: question.wager,
        // An empty submission is still an empty answer. No bet, no loss.
        answered: grade.answered,
        points: late ? 0 : grade.points,
        maxPoints: grade.maxPoints,
        bank: player.score,
        correct,
      });
      player.score = round2(player.score + settled.points);
      results[player.id] = {
        given: describeResponse(question, response),
        correct,
        points: settled.points,
        late,
        stake: settled.stake > 0 ? settled.stake : null,
      };
    }
    graded.add(question.id);
    return results;
  }

  function gradeRange(start: number, end: number): void {
    for (let position = Math.max(start, 0); position <= end; position += 1) {
      const question = questionAt(position);
      if (
        question === undefined ||
        isSection(question) ||
        graded.has(question.id)
      ) {
        continue;
      }
      gradeOne(question);
    }
  }

  function itemsFor(start: number, end: number): RevealItem[] {
    const items: RevealItem[] = [];
    for (let position = Math.max(start, 0); position <= end; position += 1) {
      const question = questionAt(position);
      if (
        question === undefined ||
        isSection(question) ||
        graded.has(question.id)
      ) {
        continue;
      }
      items.push({
        questionId: question.id,
        index: position,
        title: question.text[0]?.text ?? "",
        correct: question.correct.map((value) => value.text),
        explanation: question.explanation,
        results: gradeOne(question),
      });
    }
    return items;
  }

  function revealRange(start: number, end: number): void {
    const items = itemsFor(start, end);
    const head = items[0];
    if (head === undefined) {
      return;
    }
    // The paper mode's second pass stays a pass. Its reveal is content, not a
    // phase of its own, or the host could never page to the next question.
    const inPass =
      revealMode === RevealMode.Pass && phase === RoomPhase.Answers;
    phase = inPass ? RoomPhase.Answers : RoomPhase.Reveal;
    closed = true;
    revealedThrough = Math.max(revealedThrough, end);
    seq += 1;
    lastReveal = {
      questionId: head.questionId,
      index: head.index,
      correct: head.correct,
      explanation: head.explanation,
      results: head.results,
      leaderboard: roster.leaderboard(),
      seq,
      items,
    };
    broadcast(MessageType.AnswerReveal, lastReveal);
    broadcast(MessageType.ScoreUpdate, {
      leaderboard: lastReveal.leaderboard,
    } satisfies ScorePayload);
    publishState();
  }

  function shown(position: number, phaseValue: RoomPhase): void {
    const question = questionAt(position);
    if (question === undefined) {
      return;
    }
    const at = slots[position] ?? position;
    index = position;
    current = question;
    phase = phaseValue;
    closed = phaseValue === RoomPhase.Answers;
    lastReveal = null;
    buzz = null;
    deadline =
      phaseValue === RoomPhase.Question && question.timerMs !== null
        ? Date.now() + question.timerMs
        : null;
    currentQuestion = liveQuestion(
      question,
      position,
      total,
      roundNameOf(plan, at),
      deadline,
    );
    seq += 1;
    lastQuestion = {
      question: currentQuestion,
      seq,
      allowChanges: phaseValue === RoomPhase.Question && allowChanges,
      closed,
      phase: phaseValue,
    };
    broadcast(MessageType.QuestionShow, lastQuestion);
    publishState();
  }

  function show(nextIndex: number): void {
    shown(nextIndex, RoomPhase.Question);
  }

  /** The paper mode's second pass: the question again, answers on request. */
  function showAnswer(nextIndex: number): void {
    shown(nextIndex, RoomPhase.Answers);
  }

  function reveal(): void {
    if (
      current === null ||
      isSection(current) ||
      revealMode === RevealMode.End
    ) {
      return;
    }
    if (revealMode === RevealMode.Pass) {
      if (phase === RoomPhase.Answers) {
        revealRange(index, index);
      }
      return;
    }
    if (phase !== RoomPhase.Question) {
      return;
    }
    if (revealMode === RevealMode.Round) {
      revealRange(rangeOf(rounds, index).start, index);
      return;
    }
    revealRange(index, index);
  }

  function setRevealMode(mode: RevealMode): void {
    if (phase !== RoomPhase.Lobby) {
      return;
    }
    revealMode = mode;
    publishState();
  }

  function setSections(show: boolean): void {
    if (phase !== RoomPhase.Lobby) {
      return;
    }
    showSections = show;
    slots = flowSlots(plan, showSections);
    rounds = roundRanges(plan, slots);
    total = slots.length;
    publishState();
  }

  function end(): void {
    gradeRange(0, index);
    phase = RoomPhase.Ended;
    closed = true;
    broadcast(MessageType.QuizEnd, {
      leaderboard: roster.leaderboard(),
    } satisfies ScorePayload);
    publishState();
  }

  function next(): void {
    if (phase === RoomPhase.Answers) {
      if (index + 1 < total) {
        showAnswer(index + 1);
        return;
      }
      end();
      return;
    }
    if (phase === RoomPhase.Lobby || phase === RoomPhase.Ended) {
      return;
    }
    if (
      phase === RoomPhase.Question &&
      revealMode === RevealMode.Round &&
      index === rangeOf(rounds, index).end &&
      revealedThrough < index
    ) {
      reveal();
      return;
    }
    if (index + 1 < total) {
      show(index + 1);
      return;
    }
    if (revealMode === RevealMode.Pass) {
      showAnswer(0);
      return;
    }
    end();
  }

  const offMessage = room.onMessage((message) =>
    roster.handle(message.envelope, message.from),
  );
  const offLeave = room.onPeerLeave((peer) => roster.peerLeft(peer));

  return {
    code: options.code,
    state() {
      return snapshot;
    },
    question() {
      return currentQuestion;
    },
    lastReveal() {
      return lastReveal;
    },
    setRevealMode,
    setSections,
    start() {
      if (phase === RoomPhase.Lobby) {
        show(0);
      }
    },
    show,
    close() {
      if (
        current === null ||
        isSection(current) ||
        phase !== RoomPhase.Question
      ) {
        return;
      }
      closed = true;
      broadcast(MessageType.QuestionClose, {
        questionId: current.id,
      } satisfies ClosePayload);
      publishState();
    },
    reveal,
    next,
    end,
    ping() {
      broadcast(MessageType.Ping, { now: Date.now() });
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    leave() {
      offMessage();
      offLeave();
      listeners.clear();
      room.leave();
    },
  };
}

export type { HostOptions, HostRoom, JoinPayload, SubmitPayload };
