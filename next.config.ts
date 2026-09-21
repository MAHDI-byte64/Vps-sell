import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Produces a self-contained server bundle, which is what the Dockerfile runs.
  output: "standalone",
  // Next 16 writes AGENTS.md/CLAUDE.md into the repo on first dev run; this
  // project documents itself in README.md instead.
  agentRules: false,
};

export default nextConfig;
