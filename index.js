import express from 'express';
import fetch from 'node-fetch';

const app = express();
app.use(express.json({limit: '10mb'}));

const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
const PROXY_SECRET = process.env.PROXY_SECRET || 'voyah-proxy-2026';

app.post('/v1/messages', async (req, res) => {
  if (req.headers['x-proxy-secret'] !== PROXY_SECRET) {
    return res.status(403).json({error: 'Forbidden'});
  }
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
    res.status(500).json({error: e.message});
  }
});

app.listen(process.env.PORT || 3000, () => console.log('Proxy running'));
