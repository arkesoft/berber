import type { z } from "zod";
import type * as s from "../../../../app/contracts/schemas.js";
export type CatalogSnapshot = {
  paymentSettings: z.infer<typeof s.paymentSettings>;
  salon: z.infer<typeof s.salon>;
  buffer: number;
  services: z.infer<typeof s.service>[];
  staff: z.infer<typeof s.staff>[];
  chairs: z.infer<typeof s.chair>[];
  schedules: z.infer<typeof s.schedule>[];
  intervals: z.infer<typeof s.schedule>[];
  closedDates: string[];
};
