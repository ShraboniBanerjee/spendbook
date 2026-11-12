// Local development server: `npm run dev` then open http://localhost:3000
import http from 'node:http';
import handler from './api/index.js';

const port = process.env.PORT || 3000;
http.createServer((req, res) => handler(req, res)).listen(port, () => {
  console.log(`Spendbook running at http://localhost:${port}`);
});
