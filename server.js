require('dotenv').config();
const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const app = express();

app.use(cors());
app.use(express.json());
app.use(express.raw({ type: '*/*' }));

const secret = process.env.SHOPIFY_API_SECRET; 

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
  console.log(req.body);
  console.log(req);
  console.log(res);
  res.send('webhooks');
});


const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});