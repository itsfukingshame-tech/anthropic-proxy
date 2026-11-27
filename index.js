import { createHash, timingSafeEqual } from 'node:crypto';
import express from 'express';
import fetch from 'node-fetch';

const app = express();

const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
const PROXY_SECRET = process.env.PROXY_SECRET;
if (!ANTHROPIC_KEY?.trim() || !PROXY_SECRET?.trim()) {
  console.error('ANTHROPIC_API_KEY and PROXY_SECRET must be configured');
  process.exit(1);
}

const digest = value => createHash('sha256').update(value).digest();
const expectedSecret = digest(PROXY_SECRET);

function authorize(req, res, next) {
  const providedSecret = req.headers['x-proxy-secret'];
  if (typeof providedSecret !== 'string' || !timingSafeEqual(digest(providedSecret), expectedSecret)) {
    return res.status(403).json({error: 'Forbidden'});
  }
  next();
}

app.post('/v1/messages', authorize, express.json({limit: '10mb'}), async (req, res) => {
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_KEY,
        'anthropic-version': req.headers['anthropic-version'] || '2023-06-01',
        'anthropic-beta': req.headers['anthropic-beta'] || ''
      },
      body: JSON.stringify(req.body)
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch(e) {
    res.status(502).json({error: 'Upstream request failed'});
  }
});

app.listen(process.env.PORT || 3000, () => console.log('Proxy running'));
