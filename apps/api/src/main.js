import { createServer } from './server.js';

const port = Number(process.env.API_PORT || 4000);
const server = createServer();

server.listen(port, () => {
  console.log(`API listening on http://localhost:${port}`);
});
