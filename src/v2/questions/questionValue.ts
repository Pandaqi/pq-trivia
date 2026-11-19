export enum QValType {
  ALL = "all",
  QUESTION = "question",
  ANSWER = "answer",
}

export class QVal {
  value: string;
  type: QValType;
  keepAsIs: boolean;
  raw: string;

  constructor(val: string = "", type = QValType.ALL, asIs = false) {
    this.value = val;
    this.raw = this.value;
    this.type = type;
    this.keepAsIs = asIs;
  }

  set(v: string) {
    this.value = v;
  }
  setRaw(v: string) {
    this.raw = v;
  }
  get() {
    return this.value;
  }
  getRaw() {
    return this.raw;
  }
  isValid(): boolean {
    return this.value && this.value.length >= 1;
  }
}
