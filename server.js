require('dotenv').config();
require('@shopify/shopify-api/adapters/node');
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

// Initialize Shopify API with proper configuration
const shopify = shopifyApi({
  apiKey: process.env.SHOPIFY_API_KEY,
  apiSecretKey: process.env.SHOPIFY_API_SECRET,
  scopes: process.env.SCOPES.split(','),
  hostName: process.env.HOST.replace(/https:\/\//, ''),
  apiVersion: LATEST_API_VERSION,
  isEmbeddedApp: true,
});

// Authentication endpoint
app.post('/auth', async (req, res) => {
  const { shop } = req.body;
  
  if (!shop) {
    return res.status(400).json({ error: 'Shop name is required' });
  }

  try {
    const authUrl = await shopify.auth.begin({
    shop: shop,
    callbackPath: '/auth/callback',
    isOnline: false,
    rawRequest: req,
    rawResponse: res,
    });
    console.log("authUrl "+authUrl);
    res.json({ authUrl });
  } catch (error) {
    console.error('Auth begin error:', error);
    res.status(500).json({ error: 'Failed to start OAuth process' });
  }
});

// Fixed auth callback with proper headers handling
app.get('/auth/callback', async (req, res) => {
  try {
    const { shop, host } = req.query;
    
    // Create a proper rawRequest object with all required properties
    // const rawRequest = {
    //   headers: req.headers,
    //   method: req.method,
    //   url: req.originalUrl,
    //   query: req.query,
    //   body: req.body,
    //   // Shopify API expects these additional properties
    //   getHeader: (name) => req.get(name),
    //   protocol: req.protocol,
    //   hostname: req.hostname,
    // };

    // // Create a rawResponse object that handles the final redirect
    // const rawResponse = {
    //   getHeader: () => {},
    //   setHeader: (name, value) => res.set(name, value),
    //   end: () => {
    //     res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth-success?shop=${shop}&host=${host}`);
    //   },
    //   statusCode: 200,
    // };

    // // Process the OAuth callback
    // await shopify.auth.callback({
    //   rawRequest,
    //   rawResponse,
    // });

    const callback = await shopify.auth.callback({
      rawRequest: req,
      rawResponse: res,
    });

    req.session.shop = callback.session.shop;
    req.session.accessToken = callback.session.accessToken;

    console.log("req.session.shop " +callback.session.shop);
    console.log("callback.session.accessToken " +callback.session.accessToken);

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

    const products = await client.get({ 
      path: 'products',
      query: { limit: 10 }
    });
    res.json(products.body);
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