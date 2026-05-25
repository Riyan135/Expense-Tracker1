const fs = require('fs');
const path = require('path');
const dir = 'public';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.html'));

const faviconTag = '\n  <!-- Favicon -->\n  <link rel="icon" href="data:image/svg+xml,<svg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 100 100\'><text y=\'.9em\' font-size=\'90\'>💸</text></svg>">\n';

files.forEach(file => {
  const filePath = path.join(dir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  if (!content.includes('rel="icon"')) {
    content = content.replace('</head>', faviconTag + '</head>');
    fs.writeFileSync(filePath, content);
  }
});
console.log('Favicon added to all HTML files');
