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

    socket.on('data', (buf) => {
      if (buf.length < 2) return;
      let len = buf[1] & 0x7f;
      let offset = 2;
      if (len === 126) { len = buf.readUInt16BE(2); offset = 4; }
      else if (len === 127) { len = Number(buf.readBigUInt64BE(2)); offset = 10; }
      const payload = buf.slice(offset, offset + len).toString();
      try {
        const json = JSON.parse(payload);
        onMsg(json, send);
      } catch(e) {}
    });

    onOpen(send);
  });
  req.end();
}

const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const proc = spawn(edgePath, [
  '--headless',
  '--remote-debugging-port=9222',
  'http://localhost:3000'
]);

setTimeout(() => {
  http.get('http://127.0.0.1:9222/json', (res) => {
    let d = '';
    res.on('data', c => d += c);
    res.on('end', () => {
      const tabs = JSON.parse(d);
      const page = tabs.find(t => t.type === 'page' && t.url.includes('3000'));
      if (!page) { console.log('Page not found'); proc.kill(); process.exit(1); }
      console.log('Connecting to page:', page.webSocketDebuggerUrl);
      connectWS(page.webSocketDebuggerUrl, (send) => {
        send({ id: 1, method: 'Runtime.enable' });
        send({ id: 2, method: 'Log.enable' });
        send({ id: 3, method: 'Console.enable' });
        setTimeout(() => {
          send({ id: 4, method: 'Runtime.evaluate', params: { expression: 'JSON.stringify({ is3D: window.game.is3D, threeEnabled: window.game.threeRenderer ? window.game.threeRenderer.enabled : false, state: window.game.state, error: window.__lastErr })' } });
        }, 1200);
        setTimeout(() => {
          proc.kill();
          process.exit(0);
        }, 4000);
      }, (msg) => {
        if (msg.method === 'Runtime.consoleAPICalled' || msg.method === 'Log.entryAdded' || msg.method === 'Runtime.exceptionThrown') {
          console.log('BROWSER LOG / EXCEPTION:', JSON.stringify(msg));
        }
        if (msg.id === 4) {
          console.log('EVAL RESULT:', JSON.stringify(msg.result));
        }
      });
    });
  });
}, 1500);
