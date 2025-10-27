/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // 增加body大小限制，支持大文件上传
  serverExternalPackages: ['@supabase/supabase-js'],
  experimental: {
    // 禁用body parser以支持大文件上传
    bodyParser: false,
  },
}

export default nextConfig
