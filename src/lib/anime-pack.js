/* SAQI-MD   local anime image pack (kisi external API par depend nahi) */
const fs = require('fs');
const path = require('path');

const DIR = path.join(__dirname, '..', 'assets', 'anime');
let FILES = null;

function animeImage() {
  try {
    if (!FILES) FILES = fs.readdirSync(DIR).filter((f) => /\.(jpe?g|png)$/i.test(f));
    if (!FILES.length) return null;
    return path.join(DIR, FILES[Math.floor(Math.random() * FILES.length)]);
  } catch {
    return null;
  }
}

module.exports = { animeImage };
