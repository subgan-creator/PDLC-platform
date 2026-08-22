// Nest CLI's default webpack build treats every node_modules dependency as
// external (assumes it's `npm install`-able at runtime) via
// webpack-node-externals — including @pdlc/* workspace packages, since
// they're resolved through node_modules symlinks like any other
// dependency. That default is exactly wrong for us: @pdlc/* is raw,
// unbuilt TypeScript source with no compiled dist/ output anyone
// actually consumes (see apps/worker and apps/web, which both import it
// as source too) — a production `node dist/main.js` that still has a
// runtime `require('@pdlc/config')` fails, because there's no real JS
// file for Node to resolve to at that path.
//
// This config keeps real npm packages external (correct — things like
// @prisma/client and the OpenTelemetry auto-instrumentation package do
// their own dynamic requires/native-binary loading at runtime and must
// NOT be bundled) while pulling @pdlc/* workspace packages' source
// directly into the compiled bundle, resolved via the tsconfig "paths"
// mapping in tsconfig.base.json. The result: dist/main.js is fully
// self-contained for anything workspace-internal — no runtime
// resolution of raw TS across a module-format boundary needed at all.
const nodeExternals = require('webpack-node-externals');
const { TsconfigPathsPlugin } = require('tsconfig-paths-webpack-plugin');

module.exports = function (options) {
  return {
    ...options,
    externals: [
      nodeExternals({
        allowlist: [/^@pdlc\//],
      }),
    ],
    resolve: {
      ...options.resolve,
      extensions: [...new Set([...(options.resolve?.extensions ?? []), '.ts', '.js'])],
      plugins: [
        ...(options.resolve?.plugins ?? []),
        new TsconfigPathsPlugin({ configFile: require('path').resolve(__dirname, 'tsconfig.json') }),
      ],
    },
  };
};
