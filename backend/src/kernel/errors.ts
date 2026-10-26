export class DomainError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status = 422,
  ) {
    super(message);
    this.name = "DomainError";
  }
}
export function ensure(
  condition: unknown,
  code: string,
  message: string,
  status = 422,
): asserts condition {
  if (!condition) throw new DomainError(code, message, status);
}
