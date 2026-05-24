import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { createSerwistRoute } from "@serwist/turbopack";

// `revision` busts the precache when the build's git SHA changes. In
// non-git contexts (Docker, sparse clones) we fall back to a random
// uuid so the SW is rebuilt per cold start.
const gitSha = spawnSync("git", ["rev-parse", "HEAD"], {
  encoding: "utf-8",
}).stdout?.trim();
const revision = gitSha || randomUUID();

export const { dynamic, dynamicParams, revalidate, generateStaticParams, GET } =
  createSerwistRoute({
    swSrc: "app/sw.ts",
    additionalPrecacheEntries: [
      { url: "/en/offline", revision },
      { url: "/ru/offline", revision },
      { url: "/by/offline", revision },
    ],
    useNativeEsbuild: true,
  });
