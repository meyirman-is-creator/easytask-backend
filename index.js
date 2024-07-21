const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const cors = require('cors');
const fs = require('fs');

const app = express();
const port = 5000;

app.use(cors());
app.use(express.json());

app.post('/parse', async (req, res) => {
    const { url } = req.body;

    try {
        const { data } = await axios.get(url);
        const $ = cheerio.load(data);

        const title = $('h1.product-title').text();
        const price = $('span.price').text();
        const description = $('div.product-description').text();
        const sizes = $('ul.size-list li').map((i, el) => $(el).text()).get();
        const images = $('div.product-images img').map((i, el) => $(el).attr('src')).get();

        // Запись данных в файл
        fs.writeFile('parsedData.txt', data, (err) => {
            if (err) {
                console.error('Error writing to file', err);
            } else {
                console.log('Data written to file successfully');
            }
        });

        res.json({ title, price, description, sizes, images });
    } catch (error) {
        res.status(500).json({ error: 'Error fetching product data' });
    }
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
