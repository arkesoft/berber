import type { Booking } from "./domain.js";
import type { CatalogSnapshot } from "../salon/index.js";
import type { Actor } from "../../kernel/actor.js";
export type Catalog = CatalogSnapshot;
export interface BookingStore {
  catalog(): Promise<Catalog>;
  busy(): Promise<Booking[]>;
  find(id: string): Promise<Booking | null>;
  insert(value: Booking): Promise<void>;
  save(value: Booking): Promise<void>;
  list(actor: Actor, date?: string): Promise<Booking[]>;
  page(
    actor: Actor,
    query: {
      date?: string;
      period: "all" | "upcoming" | "past";
      page: number;
      pageSize: number;
    },
  ): Promise<{ items: Booking[]; total: number }>;
  event(value: Booking, topic: string): Promise<void>;
  audit(action: string, id: string): Promise<void>;
}
export interface BookingTransactions {
  execute<T>(
    scope: string,
    key: string,
    body: unknown,
    work: (store: BookingStore) => Promise<T>,
  ): Promise<T>;
  read<T>(work: (store: BookingStore) => Promise<T>): Promise<T>;
}
