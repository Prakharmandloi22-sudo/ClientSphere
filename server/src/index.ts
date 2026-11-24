import { app } from './app';

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`[ClientSphere Core API] Server running on http://localhost:${PORT}`);
  console.log(`[ClientSphere Core API] Health endpoint available at http://localhost:${PORT}/health`);
});

// Graceful Shutdown
const handleShutdown = (signal: string) => {
  console.log(`[ClientSphere Core API] Received ${signal}. Starting graceful shutdown...`);
  server.close(() => {
    console.log('[ClientSphere Core API] HTTP server closed cleanly.');
    process.exit(0);
  });
};

process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));
