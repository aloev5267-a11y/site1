/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
  },
  async headers() {
    return [
      {
        // The embeddable widget loader must never be cached aggressively, or
        // browsers/CDNs keep serving an old (possibly broken) copy after we
        // ship a fix. Force a revalidation on every load so updates land
        // immediately on every site that embeds it.
        source: '/livechat.js',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=0, must-revalidate',
          },
        ],
      },
    ]
  },
}

export default nextConfig
