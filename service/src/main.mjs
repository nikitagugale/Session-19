// `npm run serve`: start the service on PORT (default 4000).
import { startService } from './server.mjs';

const port = Number(process.env.PORT ?? 4000);
const svc = await startService({ port });
console.log(`marlow-faq listening on ${svc.url}  (log file: ${svc.deps.config.logFile})`);
