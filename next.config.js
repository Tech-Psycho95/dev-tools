const path = require('path');
const runtimeCaching = require('next-pwa/cache');
let nextConfig = {
  // This tells the app it lives inside this subpath
  basePath: '/development-tools',
  assetPrefix: '/development-tools',
  reactStrictMode: true,
  sassOptions: {
    includePaths: [path.join(__dirname, 'styles')],
  },
  env: {
    NEXT_ENV: process.env.NEXT_ENV,
  },
  poweredByHeader: false,
  images: {
    domains: ['betterbug-storage.s3.amazonaws.com'],
  },
};

if (process.env.NEXT_ENV !== 'local') {
  const withPWA = require('next-pwa')({
    dest: 'public',
    runtimeCaching,
  });

  module.exports = withPWA(nextConfig);
} else {
  module.exports = nextConfig;
}
