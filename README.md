# Uniqlo Product Parser Backend

## Overview

This project is designed to scrape and parse product data from the Uniqlo Japan website, focusing on extracting price and stock information that is not readily available through standard web scraping techniques. The backend utilizes Express.js and a proxy server to bypass CORS restrictions and access detailed product information via an open API.

## Background

Initially, the project involved parsing the Uniqlo Japan website directly using URLs like:

`https://www.uniqlo.com/jp/ja/products/E467623-000/00?colorDisplayCode=30&sizeDisplayCode=004`


While this approach successfully extracted basic product information, it had a significant limitation: it could not retrieve price data.

To overcome this, I investigated the network activity of the Uniqlo website using browser developer tools. This led to the discovery of a useful API endpoint:

`https://www.uniqlo.com/jp/api/commerce/v5/ja/products/${productId}/price-groups/00/l2s?withPrices=true&withStocks=true&includePreviousPrice=false&httpFailure=true`


This API endpoint accepts a product ID and returns detailed information about prices, stock availability, return options, and currency symbols.

However, making direct requests to this API from a client-side application encountered CORS restrictions. To bypass these restrictions, a proxy server using Node.js and the `http-proxy-middleware` package was implemented. This proxy server allows seamless access to the API, ensuring that all necessary data can be retrieved.

## Setup and Installation

### Prerequisites

- Node.js
- Docker (for deployment)

### Environment Variables

Create a `.env` file in the root of the project with the following content:

PORT=3001


### Installation

1. Clone the repository:

    ```bash
    git clone https://github.com/yourusername/uniqlo-product-parser.git
    cd uniqlo-product-parser
    ```

2. Install the dependencies:

    ```bash
    npm install
    ```

3. Start the server:

    ```bash
    node index.js
    ```

### Docker Deployment

To deploy the backend using Docker, follow these steps:

1. Build the Docker image:

    ```bash
    docker build -t uniqlo-product-parser .
    ```

2. Run the Docker container:

    ```bash
    docker run -d -p 3001:3001 --env-file .env uniqlo-product-parser
    ```

## API Endpoints

### Proxy Endpoint

This endpoint acts as a proxy to the Uniqlo API, retrieving detailed product information.

**URL**: `/api/:productId`

**Method**: `GET`

### Parsing Endpoint

This endpoint scrapes the Uniqlo website for basic product information.

**URL**: `/parse`

**Method**: `POST`

**Body**:

```json
{
  "url": "https://www.uniqlo.com/jp/ja/products/E467623-000/00?colorDisplayCode=30&sizeDisplayCode=004"
}
```

### Code Explanation

The backend server is built using Express.js. Here's an overview of the key parts of the code:
## Proxy Server Setup
The proxy server is set up using the http-proxy-middleware package. It forwards requests to the Uniqlo API and handles the necessary path rewriting and headers.

```app.use('/api/:productId', createProxyMiddleware({
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
```

## Parsing Logic
The parsing logic uses axios to fetch the HTML content of the product page and cheerio to extract the relevant information.

```
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
```

## Conclusion
This backend effectively scrapes product data from the Uniqlo Japan website and overcomes the limitations of CORS restrictions using a proxy server. By combining web scraping with API requests, it provides comprehensive product information, including prices, stock availability, and more.