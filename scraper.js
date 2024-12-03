const fs = require('fs');
const csv = require('csv-parser');
const cheerio = require('cheerio');

const results = [];

fs.createReadStream('disinformation_domains.csv')
    .pipe(csv())
    .on('data', (data) => {
        if (data.label === 'TRUE') {
            results.push(data.host);
        }
    })
    .on('end', async () => {
        console.log('CSV file read success.');
        console.log(`Filtered ${results.length} hosts with label 'TRUE'.`);
        const filteredHosts = results.slice(0, 174);
        const scrapedData = [];

        for (let i = 0; i < filteredHosts.length; i++) {
            const host = filteredHosts[i];
            console.log(`Scraping host: ${host}`);

            try {
                const fetch = await import('node-fetch');
                const url = host.startsWith('http') ? `${host}:${host}` : host;
                console.log(`Fetching URL: ${url}`);

                const response = await fetch.default(url);
                if (!response.ok) {
                    throw new Error(`Failed to fetch: ${response.statusText}`);
                }

                console.log(`Successfully fetched ${url}`);
                const html = await response.text();
                const $ = cheerio.load(html);

                const links = [];
                $('a').each((index, element) => {
                    const href = $(element).attr('href');
                    if (href && (href.includes('article') || href.includes('/news/'))) {
                        links.push(href);
                    }
                });

                console.log(`Found ${links.length} links on ${host}.`);
                if (links.length > 0) {
                    const randomArticle = links[Math.floor(Math.random() * links.length)];
                    const fullLink = randomArticle.startsWith('http') ? randomArticle : `${url}${randomArticle}`;
                    console.log(`Found article: ${fullLink}`);
                    scrapedData.push({ host, article: fullLink });
                } else {
                    console.log(`No articles found for ${host}`);
                }
            } catch (error) {
                console.error(`Error scraping ${host}`, error.message);
            }
        }

        fs.writeFileSync('filtered_random_articles.json', JSON.stringify(scrapedData, null, 2));
        console.log('Scraping complete. Results saved to filtered_random_articles.json');
    });