import type { ImageAsset } from "@/entities/studio";

export type MasterStatus = "draft" | "published" | "archived";

/**
 * Runtime master record after locale resolution. The DB row carries
 * en/ru/be triples; this is the single-locale projection consumed by
 * UI. `serviceIds` is the master's specialty list; consumers use it
 * for the "X services" badge in admin and for eligibility checks at
 * the booking step (Phase 2).
 */
export interface Master {
  id: string;
  name: string;
  role: string;
  bio: string;
  quote: string;
  years: number;
  sortOrder: number;
  status: MasterStatus;
  image?: ImageAsset;
  serviceIds: string[];
}
