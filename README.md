# single-plate-fetch

A simple fetch-like wrapper around node's HTTP/HTTPS library. Really meant to be a part of https://spb.pantas.net, something you can just copy-paste into a script file.

```javascript
const getResult = await fetch('https://some-url.com?a=b');

const postResult = await fetch('https://some-url.com', {
  method: 'POST',
  body: { key: 'this will become JSON' },
  timeout: 1000, // 1 sec
  headers: {
    authorisation: 'Bearer 123',
  },
});

const { statusText, statusCode, headers, data, rawData } = await fetch('https://some-url.com', {
  responseDetails: true,
});
```

Raw code:

### https://raw.githubusercontent.com/panta82/single-plate-fetch/master/index.js

_But you can also get it from npm I guess, I'm not the boss of you._
