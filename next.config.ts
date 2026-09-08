import type { NextConfig } from "next";
import { withSerwist } from "@serwist/turbopack";

const nextConfig: NextConfig = {
  transpilePackages: ["@zxing/browser", "@zxing/library"],
};

export default withSerwist(nextConfig);
