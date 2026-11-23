/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: { ignoreDuringBuilds: true },
  // Optional same-origin proxy. Set only after the 5.3 backend is ready.
  async rewrites() {
    const backend = process.env.CHAT_BACKEND_ORIGIN
    return backend ? [{ source: '/api/chat', destination: `${backend.replace(/\/$/, '')}/api/chat` }] : []
  },
}
export default nextConfig
