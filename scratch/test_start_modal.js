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
const tmpDir = path.join(os.tmpdir(), 'edge_modal_profile_' + Date.now());
const proc = spawn(edgePath, [
  '--headless',
  '--user-data-dir=' + tmpDir,
  '--window-size=390,844',
  '--remote-debugging-port=9229',
  'http://localhost:3000'
]);

setTimeout(() => {
  http.get('http://127.0.0.1:9229/json', (res) => {
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
          send({
            id: 5,
            method: 'Page.captureScreenshot',
            params: { format: 'png' }
          });
        }, 800);

      }, (json) => {
        if (json.id === 5 && json.result && json.result.data) {
          fs.writeFileSync('scratch/start_modal_mobile.png', Buffer.from(json.result.data, 'base64'));
          console.log('Start modal screenshot saved to scratch/start_modal_mobile.png');
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
