// Прокси-сервер (index.js)

const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const axios = require('axios');
const cheerio = require('cheerio');
const cors = require('cors');

const app = express();
const port = 3001;

// Разрешить CORS только для localhost:3000
const corsOptions = {
  origin: 'http://localhost:3000',
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));
app.use(express.json());

// Прокси-сервер
app.use('/api/:productId', createProxyMiddleware({
  target: 'https://www.uniqlo.com',
  changeOrigin: true,
  pathRewrite: (path, req) => {
    const productId = req.params.productId;
    return `/jp/api/commerce/v5/ja/products/${productId}/price-groups/00/l2s?withPrices=true&withStocks=true&includePreviousPrice=false&httpFailure=true`;
  },
  onProxyReq: (proxyReq, req, res) => {
    proxyReq.setHeader('User-Agent', 'Mozilla/5.0');
  }
}));

// Сервер для парсинга данных
app.post('/parse', async (req, res) => {
  const { url } = req.body;

  try {
    const { data } = await axios.get(url);
    const $ = cheerio.load(data);

    // Извлечение необходимых данных
    const title = $('h1.fr-ec-display').text().trim();
    const description = $('div.fr-ec-template-pdp--product-selector-container').next('div').text().trim();

    // Извлечение размеров
    const sizes = [];
    $('input.fr-ec-chip__input').each((i, el) => {
      sizes.push($(el).attr('aria-label'));
    });

    // Извлечение изображений
    const images = [];
    $('div.fr-ec-image img').each((i, el) => {
      images.push($(el).attr('src'));
    });

    // Извлечение видео
    const videos = [];
    $('video.fr-ec-video-inline__video source').each((i, el) => {
      videos.push($(el).attr('src'));
    });

    const productData = {
      title,
      description,
      sizes,
      images,
      videos,
    };

    res.json(productData);
  } catch (error) {
    console.error('Error fetching product data:', error);
    res.status(500).json({ error: 'Error fetching product data' });
  }
});

// Запуск сервера
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
