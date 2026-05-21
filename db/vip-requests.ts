import { randomBytes } from "node:crypto";

export function generateVipRequestId(): string {
  return `vipreq_${randomBytes(8).toString("hex")}`;
}
