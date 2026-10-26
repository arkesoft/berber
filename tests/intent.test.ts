import { expect, it } from "vitest";
import { RequestIntent } from "../app/shared/api/intent";
it("keeps the mutation key for a retry, changes it only for a new intent", () => {
  const intent = new RequestIntent(),
    request = { action: "cancel", version: 1 };
  const key = intent.keyFor(request);
  expect(intent.keyFor({ ...request })).toBe(key);
  expect(intent.keyFor({ ...request, version: 2 })).not.toBe(key);
  const completed = intent.keyFor(request);
  intent.complete();
  expect(intent.keyFor(request)).not.toBe(completed);
});
