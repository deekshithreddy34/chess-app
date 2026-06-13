import { WebSocketServer } from 'ws';
import { GameManager } from './GameManager';
import url from 'url';
import http from 'http';
import { extractAuthUser } from './auth';

const PORT = process.env.PORT || 8080;

const server = http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }));
    return;
  }
  res.writeHead(404);
  res.end('Not found');
});

const wss = new WebSocketServer({ server });

const gameManager = new GameManager();

wss.on('connection', function connection(ws, req) {
  //@ts-ignore
  const token: string = url.parse(req.url, true).query.token;
  const user = extractAuthUser(token, ws);
  gameManager.addUser(user);

  ws.on('close', () => {
    gameManager.removeUser(ws);
  });
});

server.listen(PORT, () => {
  console.log(`WS server running on port ${PORT}`);
});
