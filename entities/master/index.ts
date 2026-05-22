// Client-safe public surface: types + zod schema only. Server-only
// loaders live in `./api/load.ts`; server components import that path
// directly to avoid leaking the postgres driver into client bundles.
export type { Master, MasterStatus } from "./model/types";
export {
  masterFormSchema,
  masterStatusSchema,
  type MasterFormInput,
} from "./model/schema";
