import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';

const app = express();
const PORT = 3001; // You can change this port if needed

app.use(cors()); // Enable CORS for all routes

app.get('/locationiq-proxy', async (req, res) => {
  try {
    const { query } = req.query;
    if (!query) {
      return res.status(400).json({ error: 'Query parameter is required' });
    }

    const LOCATIONIQ_API_KEY = 'pk.ef423b51534f51549c9d54f6fbd88d65'; // Your LocationIQ API Key
    const locationIqUrl = `https://us1.locationiq.com/v1/search.php?key=${LOCATIONIQ_API_KEY}&q=${encodeURIComponent(query)}&format=json&limit=5`;
    console.log(`Proxying request to LocationIQ: ${locationIqUrl}`);

    const response = await fetch(locationIqUrl, {
      headers: {
        'User-Agent': 'RemixOfSereneRouteApp/1.0 (your-email@example.com)', // Replace with your actual app name and email
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`LocationIQ API error: ${response.status} - ${errorText}`);
      return res.status(response.status).json({ error: `LocationIQ API error: ${errorText}` });
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Proxy server error:', error);
    res.status(500).json({ error: 'Internal proxy server error' });
  }
});

app.listen(PORT, () => {
  console.log(`Nominatim Proxy Server running on http://localhost:${PORT}`);
});
