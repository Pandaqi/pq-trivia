import { shuffle } from "../tools/helpers";
import { ItemOrder } from "./question";
import type { QVal } from "./questionValue";

export class QValRandom {
  input: QVal[]; // raw input version, NEVER modified
  stable: QVal[]; // stable-sorted version as seed for output to ensure consistent order
  output: QVal[]; // exact order and output as shown in quiz
  order: ItemOrder;

  constructor(val: QVal[], o: ItemOrder) {
    this.order = o ?? ItemOrder.SHUFFLE;
    this.updateInput(val);
  }

  updateInput(val: QVal[]) {
    if (!val) {
      val = [];
    }
    if (!Array.isArray(val)) {
      val = [val];
    }

    this.input = val;
    this.stable = val;
    this.output = val;
  }

  getRaw() {
    return this.input;
  }
  get() {
    return this.output;
  }
  count() {
    return this.input.length;
  }
  toExport() {
    return { value: this.getRaw().slice(), order: this.order };
  }
  sync(qr: QValRandom) {
    // you can't sync things with different content length
    const canMatch = this.input.length == qr.input.length;
    if (!canMatch) {
      return;
    }

    const arraySynced = [];
    for (const element of qr.input) {
      const oldIndex = qr.input.indexOf(element);
      const newIndex = qr.output.indexOf(element);
      // move the right answer (based on raw load/parse index) to the right location (based on final sorted index of sync question)
      arraySynced[newIndex] = this.input[oldIndex];
    }
    this.output = arraySynced;
  }

  shouldShuffle() {
    return this.order == ItemOrder.SHUFFLE;
  }
  shuffle(rng: Function) {
    this.stableSort();
    this.shuffleOutput(rng);
  }

  stableSort() {
    if (!this.shouldShuffle()) {
      return;
    }
    this.stable = this.input.slice();
    this.stable.sort((a, b) =>
      a.get().localeCompare(b.get(), "en", {
        sensitivity: "variant",
        numeric: true,
      }),
    );
  }

  shuffleOutput(rng: any) {
    if (!this.shouldShuffle()) {
      this.output = this.stable.slice();
      return;
    }
    this.output = shuffle(this.stable.slice(), rng);
  }
}
