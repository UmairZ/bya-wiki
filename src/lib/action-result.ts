/**
 * Standard result shape returned by server actions.
 *
 * On success, `data` carries an optional payload — it defaults to `null` for
 * actions that only need to signal success (e.g. owner-only mutations). On
 * failure, `error` is a human-readable message safe to surface in a toast.
 *
 * Form actions wired through `useActionState` use their own `{ error } |
 * undefined` state shape instead; this type is for actions invoked directly.
 */
export type ActionResult<T = null> =
  | { ok: true; data: T }
  | { ok: false; error: string };
