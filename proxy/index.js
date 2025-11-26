const express = require('express');
const cors = require('cors');
const axios = require('axios');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

app.post('/webhook', async (req, res) => {
  try {
    const targetUrl = req.headers['x-target-url'];

    if (!targetUrl) {
      console.error('Missing x-target-url header');
      return res.status(400).json({ error: 'Missing x-target-url header' });
    }

    console.log(`Forwarding webhook to: ${targetUrl}`);

    // Forward the request
    const response = await axios.post(targetUrl, req.body, {
      headers: {
        'Content-Type': 'application/json',
        // Forward Authorization header if present
        ...(req.headers.authorization && { 'Authorization': req.headers.authorization }),
        // Forwarding User-Agent or other headers might be useful but risking CORS or other issues.
        // For now keeping it simple.
      }
    });

    console.log(`Forwarded successfully. Status: ${response.status}`);
    res.status(response.status).send(response.data);

  } catch (error) {
    console.error('Error forwarding webhook:', error.message);
    if (error.response) {
      // The target server responded with a status code outside the 2xx range
      res.status(error.response.status).send(error.response.data);
    } else if (error.request) {
      // The request was made but no response was received
      res.status(502).json({ error: 'Bad Gateway - No response from target' });
    } else {
      // Something happened in setting up the request that triggered an Error
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }
});

app.get('/health', (req, res) => {
  res.send('OK');
});

app.listen(PORT, () => {
  console.log(`Proxy server running on port ${PORT}`);
});

