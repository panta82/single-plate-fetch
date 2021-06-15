const libHttp = require('http');
const libFs = require('fs');
const libPath = require('path');

const express = require('express');
const bodyParser = require('body-parser');

const { fetch } = require('./index');

const PORT = 31854;
const URL = `http://localhost:${PORT}`;

describe('fetch', () => {
  let app;
  let server;
  let sockets;

  beforeAll(() => {
    app = express();
    app.use(bodyParser.json());

    app.use((req, res, next) => {
      res.set('Connection', 'close');
      return next();
    });

    app.get('/json/:param', (req, res) => {
      return res.send({
        param: req.params.param,
        query: req.query,
      });
    });

    app.get('/binary', (req, res) => {
      res.set('content-type', 'image/jpeg');
      return res.send(Buffer.from([1, 2, 3, 4, 5]));
    });

    app.patch('/patch/json', (req, res) => {
      return res.send({
        body: req.body,
        bodyKeys: Object.keys(req.body),
      });
    });

    app.post('/post/binary', (req, res, next) => {
      const chunks = [];
      req.on('data', (chunk) => chunks.push(chunk));
      req.on('error', (err) => next(err));
      req.on('end', () => {
        const data = Buffer.concat(chunks).toString('utf8');
        res.send({
          data,
        });
      });
    });

    app.get('/bad-callback', (req, res) => {
      // Nothing gets returned
    });

    server = libHttp.createServer(app);
    sockets = new Set();
    server.on('connection', (socket) => {
      sockets.add(socket);
      socket.on('close', () => {
        sockets.delete(socket);
      });
    });

    return new Promise((resolve) => {
      server.listen(PORT, resolve);
    });
  });

  afterAll(() => {
    if (server) {
      server.close();
      server = null;
    }
    if (sockets) {
      for (const socket of sockets.values()) {
        socket.destroy();
      }
      sockets = null;
    }
  });

  it('can fetch JSON-s', () => {
    return fetch(`${URL}/json/test123?a=b`).then((result) => {
      expect(result).toEqual({
        param: 'test123',
        query: {
          a: 'b',
        },
      });
    });
  });

  it('can fetch buffers', () => {
    return fetch(`${URL}/binary`).then((result) => {
      expect(result).toEqual(Buffer.from([1, 2, 3, 4, 5]));
    });
  });

  it('can patch JSON data', () => {
    return fetch(`${URL}/patch/json`, {
      method: 'PATCH',
      body: {
        a: 'A',
        b: 'B',
      },
    }).then((result) => {
      expect(result).toEqual({
        body: {
          a: 'A',
          b: 'B',
        },
        bodyKeys: ['a', 'b'],
      });
    });
  });

  it('can post a stream', () => {
    return fetch(`${URL}/post/binary`, {
      method: 'POST',
      headers: {
        'content-type': 'text/plain',
      },
      body: libFs.createReadStream(libPath.resolve(__dirname, './index.test.sample-file.txt')),
    }).then((result) => {
      expect(result).toEqual({
        data: 'line 1\nline 2\n',
      });
    });
  });

  it('can time out', () => {
    return fetch(`${URL}/bad-callback`, {
      timeout: 100,
    }).then(
      (result) => {
        throw new Error(`We shouldn't get here`);
      },
      (err) => {
        expect({ ...err }).toEqual({
          code: 'fetch_request_time_out',
          request: expect.any(Object),
        });
        expect(err.message).toEqual('Request has timed out after 100ms');
      }
    );
  });

  it('can return response details', () => {
    return fetch(`${URL}/json/test123?a=b`, {
      responseDetails: true,
    }).then((result) => {
      expect(result).toEqual({
        data: {
          param: 'test123',
          query: {
            a: 'b',
          },
        },
        headers: {
          connection: 'close',
          'content-length': '37',
          'content-type': 'application/json; charset=utf-8',
          date: expect.any(String),
          etag: 'W/"25-NByt0zcf3egdH/7z+jGSLV+SpMM"',
          'x-powered-by': 'Express',
        },
        rawData: expect.any(Buffer),
        statusCode: 200,
        statusMessage: 'OK',
      });
    });
  });
});
