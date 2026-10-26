export type Actor = {
  id: string;
  role: "customer" | "manager" | "staff";
  staffId: string | null;
  customerId: string | null;
};
export type RequestContext = {
  actor: Actor | null;
  sessionId: string;
  requestId: string;
  guestToken?: string;
};
