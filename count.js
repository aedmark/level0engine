const fs = require('fs');
const content = fs.readFileSync('src/world/blueprints/Duct.js', 'utf8');
let open = 0;
for(let i=0; i<content.length; i++) {
  if (content[i] === '{') open++;
  if (content[i] === '}') open--;
}
console.log('Final open count:', open);
