// Прокси-сервер (proxy.js)

const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
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

app.listen(port, () => {
  console.log(`Proxy server running at http://localhost:${port}`);
});
