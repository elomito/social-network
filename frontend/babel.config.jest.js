// This config is intentionally NOT named babel.config.js.
//
// Next.js auto-detects a babel.config.js (or .babelrc) at the project root
// and, if present, falls back from SWC/Turbopack to Babel for compiling the
// app. Babel doesn't understand jsconfig.json's "paths" alias mapping, so
// every "@/..." import in the app would silently fail to resolve as soon as
// this file existed at the Next root — which is exactly what happened here.
//
// Jest still needs a Babel config (see jest.config.js -> babel-jest), so
// this file is kept, just renamed and pointed to explicitly by Jest's
// "transform" config instead of being auto-discovered by Next.
module.exports = {
  presets: ['@babel/preset-env', ['@babel/preset-react', { runtime: 'automatic' }]],
}