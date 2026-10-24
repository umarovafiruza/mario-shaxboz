const http = require('http');
const crypto = require('crypto');
const fs = require('fs');
const { spawn } = require('child_process');
const os = require('os');
const path = require('path');

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

const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const tmpDir = path.join(os.tmpdir(), 'edge_gp_profile_' + Date.now());
const proc = spawn(edgePath, [
  '--headless',
  '--user-data-dir=' + tmpDir,
  '--window-size=390,844',
  '--remote-debugging-port=9230',
  'http://localhost:3000'
]);

setTimeout(() => {
  http.get('http://127.0.0.1:9230/json', (res) => {
    let d = '';
    res.on('data', c => d += c);
    res.on('end', () => {
      const tabs = JSON.parse(d);
      const page = tabs.find(t => t.type === 'page' && t.url.includes('3000'));
      if (!page) { console.log('Page not found'); proc.kill(); process.exit(1); }
      connectWS(page.webSocketDebuggerUrl, (send) => {
        send({ id: 1, method: 'Runtime.enable' });
        send({ id: 2, method: 'Page.enable' });

        send({
          id: 3,
          method: 'Emulation.setDeviceMetricsOverride',
          params: {
            width: 390,
            height: 844,
            deviceScaleFactor: 2,
            mobile: true
          }
        });

        setTimeout(() => {
          // Start game
          send({
            id: 4,
            method: 'Runtime.evaluate',
            params: {
              expression: `
                document.getElementById('btn-start-game').click();
                if (window.game.handleResize) window.game.handleResize();
              `
            }
          });

          // Simulate pressing D-Pad Right for 1.5 seconds and jumping
          setTimeout(() => {
            send({
              id: 10,
              method: 'Runtime.evaluate',
              params: {
                expression: `
                  const rightBtn = document.getElementById('dpad-right');
                  const jumpBtn = document.getElementById('btn-action-jump');
                  rightBtn.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
                  setTimeout(() => {
                    jumpBtn.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
                    setTimeout(() => {
                      jumpBtn.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
                    }, 100);
                  }, 400);
                `
              }
            });

            setTimeout(() => {
              // Check Mario's new position after running and jumping
              send({
                id: 20,
                method: 'Runtime.evaluate',
                params: {
                  expression: `
                    const rightBtn = document.getElementById('dpad-right');
                    rightBtn.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
                    ({
                      startX: 60,
                      currentX: Math.round(window.game.player.x),
                      currentY: Math.round(window.game.player.y),
                      score: window.game.player.score,
                      coins: window.game.player.coins,
                      isAlive: window.game.player.isAlive
                    })
                  `,
                  returnByValue: true
                }
              });

              setTimeout(() => {
                send({
                  id: 30,
                  method: 'Page.captureScreenshot',
                  params: { format: 'png' }
                });
              }, 400);
            }, 1500);
          }, 500);

        }, 800);

      }, (json) => {
        if (json.id === 20) {
          console.log('Gameplay test results:', JSON.stringify(json.result.value));
        }
        if (json.id === 30 && json.result && json.result.data) {
          fs.writeFileSync('scratch/gameplay_action.png', Buffer.from(json.result.data, 'base64'));
          console.log('Action screenshot saved to scratch/gameplay_action.png');
          proc.kill();
          process.exit(0);
        }
      });
    });
  }).on('error', (err) => {
    console.error('Error connecting to edge:', err);
    proc.kill();
    process.exit(1);
  });
}, 1500);
