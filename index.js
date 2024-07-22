const express = require("express");
const { createProxyMiddleware } = require("http-proxy-middleware");
const axios = require("axios");
const cheerio = require("cheerio");
const cors = require("cors");
require("dotenv").config();

const app = express();
const port = process.env.PORT || 3001;

const corsOptions = {
  origin: ["https://easy-task-frontend.vercel.app", "http://localhost:3000"],
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));
app.use(express.json());

app.use(
  "/api/:productId",
  createProxyMiddleware({
    target: "https://www.uniqlo.com",
    changeOrigin: true,
    pathRewrite: (path, req) => {
      const productId = req.params.productId;
      return `/jp/api/commerce/v5/ja/products/${productId}/price-groups/00/l2s?withPrices=true&withStocks=true&includePreviousPrice=false&httpFailure=true`;
    },
    onProxyReq: (proxyReq) => {
      proxyReq.setHeader("User-Agent", "Mozilla/5.0");
    },
  })
);

app.post("/parse", async (req, res) => {
  const { url } = req.body;

  if (!url) {
    return res.status(400).json({ error: "URL is required" });
  }

  try {
    const { data } = await axios.get(url);
    const $ = cheerio.load(data);

    const title = $("h1.fr-ec-display").text().trim() || "No title available";
    const description =
      $("div.fr-ec-template-pdp--product-selector-container")
        .next("div")
        .text()
        .trim() || "No description available";

        const sizes = Array.from(
          new Map(
            $("fieldset#product-size-picker input.fr-ec-chip__input")
              .map((i, el) => ({
                name: $(el).attr("id")?.split("-")[0],
                id: $(el).attr("id")?.split("-")[1],
              }))
              .toArray()
              .map((size) => [size.id, size])
          ).values()
        );
        

    const colors = Array.from(
      $("fieldset#product-color-picker input.fr-ec-chip__input")
        .map((i, el) => ({
          src: $(el).prev().attr("src") || "",
          name: $(el).attr("aria-label") || "",
          count: $(el).attr("id")?.split("-")[1] || "",
        }))
        .get()
        .reduce((acc, color) => {
          if (color.name && !acc.has(color.name)) acc.set(color.name, color);
          return acc;
        }, new Map())
        .values()
    );

    const images = $("div.fr-ec-image img")
      .map((i, el) => $(el).attr("src"))
      .get()
      .filter(Boolean);
    const videos = $("video.fr-ec-video-inline__video source")
      .map((i, el) => $(el).attr("src"))
      .get()
      .filter(Boolean);

    const productData = { title, description, sizes, images, videos, colors };

    res.json(productData);
  } catch (error) {
    console.error("Error fetching product data:", error);
    res.status(500).json({ error: "Error fetching product data" });
  }
});

// Измените прослушивание сервера на 0.0.0.0
app.listen(port, "0.0.0.0", () => {
  console.log(`Server running at http://0.0.0.0:${port}`);
});
