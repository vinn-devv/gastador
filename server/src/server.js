import 'dotenv/config';
import { createApp } from './app.js';
import { pool } from './db/pool.js';

const app = createApp();
const port = Number(process.env.PORT || 4000);
const server = app.listen(port, () => console.log(`Gastador server listening on http://localhost:${port}`));

async function shutdown(signal) {
  console.log(`${signal} received; shutting down...`);
  server.close(async () => {
    await pool.end();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10_000).unref();
}
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
