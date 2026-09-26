// backend/utils/cache.js
const NodeCache = require('node-cache');

// stdTTL: 300 seconds (5 मिनट तक डेटा Cache में रहेगा)
// checkperiod: 60 seconds (हर 1 मिनट में एक्सपायर्ड डेटा को साफ़ करेगा)
const cache = new NodeCache({ stdTTL: 300, checkperiod: 60 });

module.exports = cache;