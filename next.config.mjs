// GitHub Pages serves a project site under /<repository>/, so the base path has
// to follow the repository name. Reading it from GITHUB_REPOSITORY (set by
// Actions) keeps the deployment working after the repository is renamed; a
// hardcoded name silently breaks every asset URL.
const repository = (process.env.GITHUB_REPOSITORY ?? "").split("/")[1] ?? "";
const isUserPages = repository.toLowerCase().endsWith(".github.io");
const basePath =
  process.env.GITHUB_ACTIONS === "true" && repository && !isUserPages
    ? `/${repository}`
    : "";

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  basePath,
  assetPrefix: basePath ? `${basePath}/` : "",
  trailingSlash: true,
  images: { unoptimized: true },
};

export default nextConfig;
