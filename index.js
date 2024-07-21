const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const axios = require('axios');
const cheerio = require('cheerio');
const cors = require('cors');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3001;

const corsOptions = {
  origin: 'https://easy-task-frontend.vercel.app',
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));
app.use(express.json());

app.use('/api/:productId', createProxyMiddleware({
  target: 'https://www.uniqlo.com',
  changeOrigin: true,
  pathRewrite: (path, req) => {
    const productId = req.params.productId;
    return `/jp/api/commerce/v5/ja/products/${productId}/price-groups/00/l2s?withPrices=true&withStocks=true&includePreviousPrice=false&httpFailure=true`;
  },
  onProxyReq: (proxyReq) => {
    proxyReq.setHeader('User-Agent', 'Mozilla/5.0');
  }
}));

app.post('/parse', async (req, res) => {
  const { url } = req.body;

  try {
    const { data } = await axios.get(url);
    const $ = cheerio.load(data);

    const title = $('h1.fr-ec-display').text().trim();
    const description = $('div.fr-ec-template-pdp--product-selector-container').next('div').text().trim();

    const sizes = Array.from(new Set(
      $('fieldset#product-size-picker input.fr-ec-chip__input')
        .map((i, el) => $(el).attr('aria-label').replace(' (unavailable)', ''))
        .get()
    ));

    const colors = Array.from(
      $('fieldset#product-color-picker input.fr-ec-chip__input')
        .map((i, el) => ({
          src: $(el).prev().attr('src'),
          name: $(el).attr('aria-label'),
          count: $(el).attr('id').split('-')[1],
        }))
        .get()
        .reduce((acc, color) => {
          if (!acc.has(color.name)) acc.set(color.name, color);
          return acc;
        }, new Map())
        .values()
    );

    const images = $('div.fr-ec-image img').map((i, el) => $(el).attr('src')).get();
    const videos = $('video.fr-ec-video-inline__video source').map((i, el) => $(el).attr('src')).get();

    const productData = { title, description, sizes, images, videos, colors };

    res.json(productData);
  } catch (error) {
    console.error('Error fetching product data:', error);
    res.status(500).json({ error: 'Error fetching product data' });
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
