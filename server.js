require('dotenv').config();
require('@shopify/shopify-api/adapters/node');
const express = require('express');
const { shopifyApi, LATEST_API_VERSION } = require('@shopify/shopify-api');
const cors = require('cors');

const app = express();

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

app.use(express.json());

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

  const authUrl = shopify.auth.begin({
    shop,
    callbackPath: '/auth/callback',
    isOnline: false,
  });

  res.json({ authUrl });
});

// Fixed auth callback
app.get('/auth/callback', async (req, res) => {
  try {
    const { shop, host } = req.query;
    
    // Create proper request and response objects
    const callbackResponse = await shopify.auth.callback({
      rawRequest: {
        headers: req.headers,
        method: req.method,
        url: req.url,
        query: req.query,
      },
      rawResponse: {
        setHeader: res.setHeader.bind(res),
        end: (content) => {
          // After Shopify processes the callback, do our redirect
          res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth-success?shop=${shop}&host=${host}`);
        }
      }
    });

  } catch (error) {
    console.error('Auth callback error:', error);
    
    if (!res.headersSent) {
      res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth-error?message=${encodeURIComponent(error.message)}`);
    }
  }
});

// Products API endpoint
app.get('/api/products', async (req, res) => {
  const { shop } = req.query;
  
  if (!shop) {
    return res.status(400).json({ error: 'Shop parameter is required' });
  }

  try {
    const session = shopify.session.customAppSession(shop);
    const client = new shopify.clients.Rest({ session });

    const products = await client.get({ path: 'products' });
    return res.json(products);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Failed to fetch products' });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});