export const convertTimeToString = (time: number) => {
  const components = [];
  const hours = Math.floor(time / 60 / 60);
  if (hours != 0) {
    let str = "";
    if (hours < 10) {
      str += "0";
    }
    str += hours.toString();
    components.push(str);
  }

  const minutes = Math.floor(time / 60);
  let str = "";
  if (minutes < 10) {
    str += "0";
  }
  str += minutes.toString();
  components.push(str);

  const seconds = time % 60;
  let str2 = "";
  if (seconds < 10) {
    str2 += "0";
  }
  str2 += seconds.toString();
  components.push(str2);

  return components.join(":");
};

export enum TimerStrategy {
  NOTHING = "nothing",
  AUTO_CONTINUE = "autoContinue",
  STAY_BUT_HIDE = "stayButHide",
}

export type TimerCallback = (timer: Timer) => void;
export interface TimerParams {
  hidden?: boolean;
  default?: number;
  strategy?: TimerStrategy;
  countDown?: boolean;
}

export class Timer {
  hidden: boolean;
  defaultDuration: number;
  strategy: TimerStrategy;
  countDown: boolean;

  duration: number;
  time: number;
  updateHandler: number;
  running: boolean;

  node: HTMLElement;

  refreshCallback: TimerCallback;
  timeoutCallback: TimerCallback;

  constructor(params: TimerParams) {
    this.hidden = params.hidden ?? false;
    this.defaultDuration = params.default ?? Infinity;
    this.strategy = params.strategy ?? TimerStrategy.NOTHING;
    this.countDown = params.countDown ?? false;
  }

  setNode(node: HTMLElement) {
    this.node = node;
  }

  addRefreshListener(callback: TimerCallback) {
    this.refreshCallback = callback;
  }

  addTimeoutListener(callback: TimerCallback) {
    this.timeoutCallback = callback;
  }

  isRunning() {
    return this.running;
  }

  isDone() {
    if (this.countDown) {
      return this.time <= 0;
    }
    return this.time >= this.duration;
  }

  toPercentage() {
    return Math.round((this.time / this.duration) * 10000) / 10000.0;
  }

  toString() {
    return convertTimeToString(this.time);
  }

  refresh() {
    if (this.refreshCallback) {
      this.refreshCallback(this);
    }
    if (this.node) {
      this.node.style.display = this.hidden ? "none" : "block";
      this.node.innerHTML = this.toString();
    }
  }

  update() {
    this.time += this.countDown ? -1 : +1;
    this.refresh();
    if (!this.isDone()) {
      return;
    }
    this.timeout();
  }

  timeout() {
    if (this.timeoutCallback) {
      this.timeoutCallback(this);
    }
    this.stop();
  }

  reset() {
    this.time = this.countDown ? this.duration : 0;
    this.refresh();
  }

  start(duration: number = null) {
    this.duration = duration ?? this.defaultDuration ?? 0;
    if (this.duration <= 0) {
      return;
    }

    this.time = 0;
    if (this.countDown) {
      this.time = this.duration;
    }

    this.updateHandler = setInterval(this.update.bind(this), 1000);
    this.running = true;
    this.refresh();
  }

  stop() {
    clearInterval(this.updateHandler);
    this.running = false;
    this.refresh();
  }
}
