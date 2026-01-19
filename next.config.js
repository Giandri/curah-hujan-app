/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['puppeteer'],
  // Force Node.js runtime for scraper API routes
  generateBuildId: async () => {
    return 'build-' + Date.now()
  },
}

module.exports = nextConfig
