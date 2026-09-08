import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import { createSerwistRoute } from "@serwist/turbopack";

const revision =
  process.env.VERCEL_GIT_COMMIT_SHA?.trim() ||
  spawnSync("git", ["rev-parse", "HEAD"], { encoding: "utf-8" }).stdout.trim() ||
  randomUUID();

export const { dynamic, dynamicParams, revalidate, generateStaticParams, GET } =
  createSerwistRoute({
    swSrc: "src/app/sw.ts",
    useNativeEsbuild: true,
    additionalPrecacheEntries: [
      { url: "/", revision },
      { url: "/offline", revision },
      { url: "/manifest.webmanifest", revision },
      { url: "/icon-192.png", revision },
      { url: "/icon-512.png", revision },
      { url: "/apple-touch-icon.png", revision },
    ],
  });
