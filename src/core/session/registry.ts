/**
 * Two small registries the player reads: custom views and custom actions.
 *
 * Values are opaque on purpose. Core never touches a DOM node, so the renderer
 * is whatever the host wants to return; the Preact view knows what to do with
 * it. Actions are plain callbacks with a label.
 */

import type { ScreenKind, ScreenViewModel } from "./viewModel";

export type ViewRenderer = (screen: ScreenViewModel, quiz: unknown) => unknown;

export class ViewRegistry {
  readonly #renderers = new Map<ScreenKind, ViewRenderer>();

  /** Returns an unsubscribe, so a component can own its override. */
  set(kind: ScreenKind, renderer: ViewRenderer): () => void {
    this.#renderers.set(kind, renderer);
    return () => this.delete(kind, renderer);
  }

  get(kind: ScreenKind): ViewRenderer | undefined {
    return this.#renderers.get(kind);
  }

  delete(kind: ScreenKind, renderer?: ViewRenderer): void {
    if (renderer === undefined || this.#renderers.get(kind) === renderer) {
      this.#renderers.delete(kind);
    }
  }

  clear(): void {
    this.#renderers.clear();
  }
}

export interface ToolbarAction {
  readonly id: string;
  readonly label: string;
  readonly title?: string;
  /** Pinned actions stay put when a host trims the toolbar. */
  readonly pinned?: boolean;
  run(quiz: unknown): void;
}

export class ActionRegistry {
  readonly #actions = new Map<string, ToolbarAction>();

  add(action: ToolbarAction): () => void {
    this.#actions.set(action.id, action);
    return () => this.remove(action.id);
  }

  remove(id: string): void {
    this.#actions.delete(id);
  }

  get(id: string): ToolbarAction | undefined {
    return this.#actions.get(id);
  }

  /** Pinned first, then in add order. */
  list(): ToolbarAction[] {
    const actions = [...this.#actions.values()];
    return [
      ...actions.filter((action) => action.pinned === true),
      ...actions.filter((action) => action.pinned !== true),
    ];
  }

  clear(): void {
    this.#actions.clear();
  }
}
