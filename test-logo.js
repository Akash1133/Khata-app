const fs = require('fs');
const buf = fs.readFileSync('public/branding/logo-dark.png');
console.log('first bytes:', buf.slice(0, 50).toString('hex'));
