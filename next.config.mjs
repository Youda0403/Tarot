const isGitHubPages = process.env.GITHUB_ACTIONS === "true";

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  basePath: isGitHubPages ? "/Tarot" : "",
  assetPrefix: isGitHubPages ? "/Tarot/" : "",
  trailingSlash: true,
  images: { unoptimized: true },
};

export default nextConfig;
