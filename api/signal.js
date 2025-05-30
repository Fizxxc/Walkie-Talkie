import { Server } from 'ws';

const rooms = new Map();

export default function handler(req, res) {
  if (!res.socket.server.wss) {
    const wss = new Server({ noServer: true });

    res.socket.server.on('upgrade', (req, socket, head) => {
      const url = new URL(req.url, `http://${req.headers.host}`);
      const roomId = url.searchParams.get("room");
      if (!roomId) return socket.destroy();

      wss.handleUpgrade(req, socket, head, ws => {
        ws.roomId = roomId;

        if (!rooms.has(roomId)) rooms.set(roomId, new Set());
        rooms.get(roomId).add(ws);

        ws.on('message', msg => {
          for (const client of rooms.get(roomId)) {
            if (client !== ws && client.readyState === 1) {
              client.send(msg.toString());
            }
          }
        });

        ws.on('close', () => {
          rooms.get(roomId).delete(ws);
          if (rooms.get(roomId).size === 0) rooms.delete(roomId);
        });
      });
    });

    res.socket.server.wss = wss;
  }

  if (req.method === 'GET') {
    const roomList = Array.from(rooms.keys());
    res.status(200).json({ rooms: roomList });
  } else {
    res.status(405).end();
  }
}
