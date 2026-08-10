// @ts-check
// Relative require, not `@pdlc/config/eslint` — this package can't import
// its own published entry point.
const base = require('./eslint-preset.cjs');

module.exports = [...base];
