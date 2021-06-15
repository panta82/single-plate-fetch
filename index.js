/**
 * @template T
 * @param {string|URL} url
 * @param {{auth: string, method: 'GET'|'POST'|'PUT'|'DELETE'|'PATCH', body: *, headers: object, timeout: number, responseDetails: boolean}} options
 * @returns {Promise<T|{statusCode: number, statusMessage: string, headers: object, data: T, rawData: Buffer}>}
 */
function fetch(url, options = undefined) {
  options = options ? { ...fetch.DEFAULT_OPTIONS, ...options } : fetch.DEFAULT_OPTIONS;
  const libHttp = url.toString().startsWith('http://') ? require('http') : require('https');
  return new Promise((resolve, reject) => {
    const headers = options.headers || {};
    let body = options.body;
    const isStream = body && typeof body.pipe === 'function';
    if (body && typeof body === 'object' && !isStream) {
      try {
        body = JSON.stringify(body);
      } catch (err) {
        return reject(err);
      }
      headers['content-type'] = 'application/json';
    }
    const chunks = [];
    const req = libHttp.request(url, { ...options, headers, timeout: options.timeout }, (res) => {
      res.on('data', (chunk) => {
        chunks.push(chunk);
      });
      res.on('end', () => {
        const rawData = Buffer.concat(chunks);
        let result = rawData;

        const contentType = res.headers['content-type'] || '';
        if (contentType.startsWith('text')) {
          result = result.toString('utf8');
        } else {
          try {
            result = JSON.parse(result.toString('utf8'));
          } catch (_) {}
        }

        if (options.responseDetails) {
          result = {
            statusCode: res.statusCode,
            statusMessage: res.statusMessage,
            headers: res.headers,
            data: result,
            rawData,
          };
        }

        resolve(result);
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.on('timeout', () => {
      const error = new Error(`Request has timed out after ${options.timeout}ms`);
      error.request = req;
      error.code = 'fetch_request_time_out';
      reject(error);
    });

    if (isStream) {
      body.pipe(req);
    } else {
      if (body) {
        req.write(body);
      }
      req.end();
    }
  });
}
fetch.DEFAULT_OPTIONS = {
  timeout: 60 * 1000, // 1 minute
};

fetch.fetch = fetch;
module.exports = fetch;
