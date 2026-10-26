// A single user intent keeps its key across ambiguous network failures.
// This does not replace server-side idempotency or transactional integrity.
export class RequestIntent {
  #signature = "";
  #key = "";
  keyFor(payload: unknown) {
    const signature = JSON.stringify(payload);
    if (this.#signature !== signature || !this.#key) {
      this.#signature = signature;
      this.#key = crypto.randomUUID();
    }
    return this.#key;
  }
  complete() {
    this.#key = "";
    this.#signature = "";
  }
}
