/**
 * The media appendix: every image, sound and clip in one list.
 *
 * A reference sheet for the person setting up the room. Paths are resolved
 * with the same folder, link prefixes and formats the player uses, so what is
 * printed is what will load.
 */

import type { JSX } from "preact";
import { answerRefs } from "../../../core/model/answers";
import type { QuestionModel } from "../../../core/model/question";
import { toMediaViewModel } from "../../../core/session/viewModel";
import {
  MediaKind,
  mediaForConfig,
  parseMediaDescriptor,
  type MediaDescriptor,
  type MediaOptions,
} from "../../../core/values/media";
import { useT } from "../i18n";

interface MediaEntry {
  readonly number: number;
  readonly question: string;
  readonly round: string | null;
  readonly path: string;
  readonly kind: MediaKind;
  readonly alt: string | null;
  readonly credit: string | null;
}

export function PrintMedia({
  questions,
  roundName,
  media = {},
}: {
  readonly questions: readonly QuestionModel[];
  readonly roundName: (roundId: string | null) => string | null;
  readonly media?: MediaOptions;
}): JSX.Element {
  const t = useT();
  const entries: MediaEntry[] = [];

  questions.forEach((question, index) => {
    const add = (descriptor: MediaDescriptor): void => {
      const resolved = mediaForConfig(descriptor, media);
      if (resolved.kind === MediaKind.File) {
        return;
      }
      const view = toMediaViewModel(descriptor, question.alt, media);
      entries.push({
        number: index + 1,
        question: question.text[0]?.text ?? question.id,
        round: roundName(question.round),
        path: view.path,
        kind: view.kind,
        alt: view.alt,
        credit: view.credit,
      });
    };
    for (const descriptor of question.media) {
      add(descriptor);
    }
    for (const ref of answerRefs(question)) {
      if (!ref.value.keepAsIs) {
        add(parseMediaDescriptor(ref.value.text));
      }
    }
  });

  return (
    <section class="pq-print-page pq-print-media">
      <div class="pq-print-page-inner">
        <h1 class="pq-print-media-title">{t("printMediaOnly")}</h1>
        {entries.length === 0 ? (
          <p class="pq-description">{t("printMediaNone")}</p>
        ) : (
          <table class="pq-media-table">
            <thead>
              <tr>
                <th scope="col">#</th>
                <th scope="col">{t("printQuestion")}</th>
                <th scope="col">{t("roundWord")}</th>
                <th scope="col">Media</th>
                <th scope="col">{t("printNotes")}</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry, index) => (
                <tr key={`${entry.path}-${index}`}>
                  <td>{entry.number}</td>
                  <td>{entry.question}</td>
                  <td>{entry.round ?? t("quizWord")}</td>
                  <td>
                    <code>{entry.path}</code>{" "}
                    <span class="pq-media-kind">{entry.kind}</span>
                  </td>
                  <td>
                    {[entry.alt, entry.credit].filter(Boolean).join(" · ")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}
