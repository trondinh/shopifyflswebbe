require('dotenv').config();
const express = require('express');
const { shopifyApi, LATEST_API_VERSION } = require('@shopify/shopify-api');
const cors = require('cors');

const app = express();

// Enhanced CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Initialize Shopify API
const shopify = shopifyApi({
  apiKey: process.env.SHOPIFY_API_KEY,
  apiSecretKey: process.env.SHOPIFY_API_SECRET,
  scopes: process.env.SCOPES.split(','),
  hostName: process.env.HOST.replace(/https:\/\//, ''),
  apiVersion: LATEST_API_VERSION,
  isEmbeddedApp: true,
});

// Authentication endpoint
app.post('/auth', (req, res) => {
  const { shop } = req.body;
  
  if (!shop) {
    return res.status(400).json({ error: 'Shop name is required' });
  }

  try {
    const authUrl = shopify.auth.begin({
      shop,
      callbackPath: '/auth/callback',
      isOnline: false,
      callbackUrl: `${process.env.HOST}/auth/callback`
    });

    res.json({ authUrl });
  } catch (error) {
    console.error('Auth begin error:', error);
    res.status(500).json({ 
      error: 'Failed to start OAuth process',
      details: error.message 
    });
  }
});

// Fixed auth callback with complete rawResponse
app.get('/auth/callback', async (req, res) => {
  try {
    const { shop, host } = req.query;
    
    // Create complete rawResponse object
    const rawResponse = {
      statusCode: 200,
      statusMessage: 'OK',
      getHeader: (name) => res.get(name),
      setHeader: (name, value) => res.set(name, value),
      write: (chunk) => res.write(chunk),
      end: () => {
        res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth-success?shop=${shop}&host=${host}`);
      }
    };

    await shopify.auth.callback({
      rawRequest: {
        headers: req.headers,
        method: req.method,
        url: req.originalUrl,
        query: req.query,
        body: req.body,
        getHeader: (name) => req.get(name),
        protocol: req.protocol,
        hostname: req.hostname,
      },
      rawResponse
    });

  } catch (error) {
    console.error('Auth callback error:', error);
    if (!res.headersSent) {
      res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth-error?message=${encodeURIComponent(error.message)}`);
    }
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});