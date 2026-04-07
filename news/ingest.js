const Parser = require('rss-parser'); // [cite: 30]
const nlp = require('compromise'); // [cite: 31]
const fs = require('fs'); // [cite: 34]

const parser = new Parser();
const feeds = [
  'https://feeds.npr.org/1001/rss.xml',
  'https://www.cbsnews.com/latest/rss/main',
  'https://moxie.foxnews.com/google-publisher/latest.xml'
]; // [cite: 30]

async function runSieve() {
  const survivors = [];

  for (const url of feeds) {
    try {
      const feed = await parser.parseURL(url);
      
      for (const item of feed.items) {
        const text = item.summary || item.contentSnippet; // [cite: 8, 32]
        if (!text) continue; // [cite: 32]

        const doc = nlp(text); // [cite: 31]
        const totalWords = doc.terms().out('array').length;
        
        if (totalWords === 0) continue;

        const nouns = doc.nouns().length; // [cite: 7]
        const verbs = doc.verbs().length; // [cite: 7]
        const density = (nouns + verbs) / totalWords; // [cite: 7]

        if (density > 0.25) { // [cite: 8, 33]
          survivors.push({
            headline: item.title, // [cite: 34]
            summary: text, // [cite: 34]
            link: item.link // [cite: 34]
          });
        }
      }
    } catch (err) {
      console.error(`Failed to parse ${url}:`, err.message);
    }
  }

  fs.writeFileSync('sieve_output.json', JSON.stringify(survivors, null, 2)); // [cite: 9, 34]
}

runSieve();
