/**
 * MutationError — thrown by adapt() when a server action returns a failure
 * result. Carries the typed error code so consumers can pattern-match in
 * React Query's onError without instanceof-checking a generic Error.
 *
 * Deliberately serializable: code and message are plain strings, making it
 * safe to log, display in UI, or forward to error tracking.
 */
export class MutationError<TCode extends string = string> extends Error {
  readonly code: TCode;

  constructor(code: TCode, message: string) {
    super(message);
    this.name = "MutationError";
    this.code = code;

    // Maintain proper prototype chain in environments that transpile classes.
    Object.setPrototypeOf(this, new.target.prototype);
  }

  /**
   * Type guard — narrows an unknown catch value to MutationError.
   * Useful in onError callbacks where the type is unknown.
   *
   * @example
   * onError: (e) => {
   *   if (MutationError.is(e)) {
   *     console.log(e.code); // typed as string
   *   }
   * }
   */
  static is(value: unknown): value is MutationError {
    return value instanceof MutationError;
  }

  /**
   * Narrowed type guard — checks both instanceof and a specific code value.
   *
   * @example
   * if (MutationError.isCode(e, "UNAUTHORIZED")) {
   *   redirectToLogin();
   * }
   */
  static isCode<TCode extends string>(
    value: unknown,
    code: TCode
  ): value is MutationError<TCode> {
    return MutationError.is(value) && value.code === code;
  }
}
