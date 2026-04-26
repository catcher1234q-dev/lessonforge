import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@supabase/ssr", "@supabase/supabase-js"],
};

export default nextConfig;
