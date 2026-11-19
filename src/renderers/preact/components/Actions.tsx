/** Host-registered buttons, pinned ones first. Empty means nothing renders. */

import type { JSX } from "preact";
import type { Quiz } from "../../../core/session/quiz";

export function Actions({ quiz }: { readonly quiz: Quiz }): JSX.Element | null {
  const actions = quiz.actions.list();
  if (actions.length === 0) {
    return null;
  }
  return (
    <>
      {actions.map((action) => (
        <button
          key={action.id}
          type="button"
          class="pq-action"
          data-pq-action={action.id}
          title={action.title ?? action.label}
          onClick={() => action.run(quiz)}
        >
          {action.label}
        </button>
      ))}
    </>
  );
}
