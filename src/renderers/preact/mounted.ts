/** What mounting gives you back. Kept alone so mounts can share the type. */

export interface MountedQuiz {
  readonly destroy: () => void;
}
