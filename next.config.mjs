/** @type {import('next').NextConfig} */
const nextConfig = {
  // Permite que pdf.js e mammoth funcionem client-side
  webpack: (config) => {
    config.resolve.alias.canvas = false
    config.resolve.alias.encoding = false
    return config
  },
}

export default nextConfig
