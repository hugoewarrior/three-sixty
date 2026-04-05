//@ts-check

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { composePlugins, withNx } = require('@nx/next');

/**
 * @type {import('@nx/next/plugins/with-nx').WithNxOptions}
 **/
const nextConfig = {
  // Use this to set Nx-specific options
  // See: https://nx.dev/recipes/next/next-config-setup
  nx: {},
  turbopack: {
    root: require('path').join(__dirname, '../..'),
  },
  // Amplify SSR Lambda does not forward Console env vars to the runtime process.
  // Bake them into the standalone config at build time so they are available
  // via process.env when the Lambda cold-starts.
  env: {
    AUTH_SECRET: process.env.AUTH_SECRET,
    AUTH_URL: process.env.AUTH_URL,
    AUTH_COGNITO_CLIENT_ID: process.env.AUTH_COGNITO_CLIENT_ID,
    AUTH_COGNITO_CLIENT_SECRET: process.env.AUTH_COGNITO_CLIENT_SECRET,
    AUTH_COGNITO_ISSUER: process.env.AUTH_COGNITO_ISSUER,
    AUTH_COGNITO_TOKEN_ENDPOINT: process.env.AUTH_COGNITO_TOKEN_ENDPOINT,
  },
};

const plugins = [
  // Add more Next.js plugins to this list if needed.
  withNx,
];

module.exports = composePlugins(...plugins)(nextConfig);
