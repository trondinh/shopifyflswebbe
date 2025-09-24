require('dotenv').config();
const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const app = express();

app.use(cors());
app.use(express.json());
app.use(express.raw({ type: '*/*' }));

const secret = process.env.SHOPIFY_API_SECRET; 

app.use((req, res, next) => {
  console.log('Request Headers:');
  for (const header in req.headers) {
    console.log(`${header}: ${req.headers[header]}`);
  }
  next(); // Pass control to the next middleware or route handler
});

app.post('/', (req, res) => {
  const shopifyHmac = req.headers['x-shopify-hmac-sha256'];
  const byteArray = req.body;
  const bodyString = byteArray.toString('utf8');

  const calculatedHmacDigest = crypto.createHmac('sha256', secret).update(byteArray).digest('base64');
  const hmacValid = crypto.timingSafeEqual(Buffer.from(calculatedHmacDigest), Buffer.from(shopifyHmac));

  if (hmacValid) {
    res.send('HMAC validation successful.');
  } else {
    res.status(401).send('HMAC validation failed.');
  }
});

app.post('/webhooks', express.text({type: '*/*'}), async (req, res) => {
  console.log(JSON.stringify(req.body));
  //console.log(req.body);
  //console.log(req);
  //console.log(res);
  res.send('webhooks');
});


app.get('/auth/callback', async (req, res) => {
  // The library will automatically set the appropriate HTTP headers
  const callback = await shopify.auth.callback({
    rawRequest: req,
    rawResponse: res,
  });

  // You can now use callback.session to make API requests
  console.log(callback.session);
  console.log(req);
  console.log(res);


  res.redirect('/my-apps-entry-page');
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
