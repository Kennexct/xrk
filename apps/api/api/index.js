// Vercel serverless entry point — wraps the Express app as a serverless function.
// WebSocket and scheduler features are unavailable in serverless mode.
const { createApp } = require('../dist/app');

const app = createApp();

module.exports = app;
