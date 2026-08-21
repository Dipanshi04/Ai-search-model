const fs = require('fs');
let content = fs.readFileSync('C:\\Users\\HP\\isa-marathon\\apps\\led-dashboard\\src\\App.tsx', 'utf8');

// Fix the middle dot 
content = content.replace(/A�/g, '·');

fs.writeFileSync('C:\\Users\\HP\\isa-marathon\\apps\\led-dashboard\\src\\App.tsx', content);
console.log('Fixed middle dot');