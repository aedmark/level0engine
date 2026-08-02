const fs = require('fs');
const path = require('path');

const srcFile = path.resolve(__dirname, 'src/aesthetics/ProceduralTextureFactory.js');
// we need the original source. Since we overwrote it, we should restore it from git first!
