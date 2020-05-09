/**
 * @param {string|URL} url
 * @param {{auth, method, body, headers}} options
 * @returns {Promise<*>}
 */
function fetch(url, options = {}) {
	const libHttp = url.startsWith('http://') ? require('http') : require('https');
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
		const req = libHttp.request(url, { ...options, headers }, (res) => {
			res.on('data', (chunk) => {
				chunks.push(chunk);
			});
			res.on('end', () => {
				let result = Buffer.concat(chunks);
				const contentType = res.headers['content-type'] || '';
				if (contentType.startsWith('text')) {
					return resolve(result.toString('utf8'));
				}
				try {
					result = JSON.parse(result.toString('utf8'));
				} catch (_) {}
				resolve(result);
			});
		});

		req.on('error', (error) => {
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

fetch.fetch = fetch;
module.exports = fetch;
