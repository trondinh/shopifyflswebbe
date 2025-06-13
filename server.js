require('dotenv').config();
require('@shopify/shopify-api/adapters/node');
const express = require('express');
const { shopifyApi, LATEST_API_VERSION } = require('@shopify/shopify-api');
const cors = require('cors');

const app = express();

// Configure CORS properly
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
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
    rawRequest:req,
    rawResponse:res
  });

  res.json({ authUrl });
});

// Auth callback handler
app.get('/auth/callback', async (req, res) => {
  try {
    const { shop, host } = req.query;
    const session = await shopify.auth.callback({
      rawRequest: req,
      rawResponse: res,
    });

    localStorage.setItem("access_token", session);

    // Redirect to frontend with success and session data
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth-success?shop=${shop}&host=${host}`);
  } catch (error) {
    console.error('Auth callback error:', error);
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth-error`);
  }
});

// Products API endpoint
app.get('/api/products', async (req, res) => {
  try {
    const { shop } = req.query;
    if (!shop) {
      return res.status(400).json({ error: 'Shop parameter is required' });
    }

    let session = shopify.session.customAppSession(shop);
    if(!session){
        session = localStorage.getItem("access_token", session);
    }

    const client = new shopify.clients.Rest({ session });

    const products = await client.get({ 
      path: 'products',
      query: { limit: 10 } // Example pagination
    });

    res.json({
      success: true,
      products: products.body.products
    });
  } catch (error) {
    console.error('Products API error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch products',
      details: error.message 
    });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});