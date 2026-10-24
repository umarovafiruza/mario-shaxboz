const http = require('http');
const crypto = require('crypto');
const { spawn } = require('child_process');

function connectWS(url, onOpen, onMsg) {
  const u = new URL(url);
  const key = crypto.randomBytes(16).toString('base64');
  const req = http.request({
    hostname: u.hostname,
    port: u.port,
    path: u.pathname,
    headers: {
      'Connection': 'Upgrade',
      'Upgrade': 'websocket',
      'Sec-WebSocket-Key': key,
      'Sec-WebSocket-Version': '13'
    }
  });

  req.on('upgrade', (res, socket, head) => {
    function send(obj) {
      const data = Buffer.from(JSON.stringify(obj));
      let len = data.length;
      let header;
      const mask = crypto.randomBytes(4);
      if (len < 126) {
        header = Buffer.from([0x81, 0x80 | len]);
      } else if (len < 65536) {
        header = Buffer.alloc(4);
        header[0] = 0x81; header[1] = 0x80 | 126; header.writeUInt16BE(len, 2);
      } else {
        header = Buffer.alloc(10);
        header[0] = 0x81; header[1] = 0x80 | 127; header.writeBigUInt64BE(BigInt(len), 2);
      }
      const masked = Buffer.alloc(len);
      for (let i = 0; i < len; i++) masked[i] = data[i] ^ mask[i % 4];
      socket.write(Buffer.concat([header, mask, masked]));
    }

    let buffer = Buffer.alloc(0);
    socket.on('data', (buf) => {
      buffer = Buffer.concat([buffer, buf]);
      while (buffer.length >= 2) {
        const lenByte = buffer[1] & 0x7f;
        let offset = 2;
        let payloadLen = lenByte;
        if (lenByte === 126) {
          if (buffer.length < 4) return;
          payloadLen = buffer.readUInt16BE(2);
          offset = 4;
        } else if (lenByte === 127) {
          if (buffer.length < 10) return;
          payloadLen = Number(buffer.readBigUInt64BE(2));
          offset = 10;
        }
        if (buffer.length < offset + payloadLen) return;
        const payload = buffer.slice(offset, offset + payloadLen).toString('utf8');
        buffer = buffer.slice(offset + payloadLen);
        try {
          const json = JSON.parse(payload);
          onMsg(json, send);
        } catch(e) {}
      }
    });

    onOpen(send);
  });
  req.end();
}

const edgePath = 'C:\\\\Program Files (x86)\\\\Microsoft\\\\Edge\\\\Application\\\\msedge.exe';
const proc = spawn(edgePath, [
  '--headless',
  '--window-size=1200,900',
  '--remote-debugging-port=9226',
  'http://localhost:3000'
]);

setTimeout(() => {
  http.get('http://127.0.0.1:9226/json', (res) => {
    let d = '';
    res.on('data', c => d += c);
    res.on('end', () => {
      const tabs = JSON.parse(d);
      const page = tabs.find(t => t.type === 'page' && t.url.includes('3000'));
      if (!page) { console.log('Page not found'); proc.kill(); process.exit(1); }
      connectWS(page.webSocketDebuggerUrl, (send) => {
        send({ id: 1, method: 'Runtime.enable' });

        setTimeout(() => {
          send({
            id: 10,
            method: 'Runtime.evaluate',
            params: {
              expression: `
                document.getElementById('btn-start-game').click();
                const g = window.game;
                
                // 1. Test hitting question block
                const qBlock = g.blocks.find(b => b.type === 'QUESTION' && b.content === 'COIN');
                const initialCoins = g.totalCoins;
                qBlock.bump(g.player, g);
                const blockAfter = qBlock.type;
                const coinsAfter = g.totalCoins;

                // 2. Test stomping Goomba
                const goomba = g.enemies.find(e => e instanceof Goomba);
                g.player.vy = -5;
                goomba.stomp(g.player, g);
                const goombaStomped = goomba.isStomped;
                const scoreAfter = g.player.score;

                // 3. Test Luigi jumping
                g.player2.isGrounded = true;
                g.player2.jump(g);
                const luigiVy = g.player2.vy;

                ({
                  blockAfter,
                  coinGain: coinsAfter - initialCoins,
                  goombaStomped,
                  scoreAfter,
                  luigiVy
                });
              `,
              returnByValue: true
            }
          });
        }, 1200);

      }, (msg) => {
        if (msg.id === 10) {
          console.log('PHYSICS & MECHANICS RESULT:', JSON.stringify(msg.result.result.value, null, 2));
          proc.kill();
          process.exit(0);
        }
      });
    });
  });
}, 1500);
