const fs = require('fs');
let content = fs.readFileSync('C:\\Users\\HP\\isa-marathon\\apps\\led-dashboard\\src\\App.tsx', 'utf8');

// Fix the middle dot 
content = content.replace(/A�/g, '·');

// Add closing div for Leaderboard wrapper before </aside>
const oldEnding = `            </div>
          </aside>`;

const newEnding = `            </div>
          </div>
          </aside>`;

content = content.replace(oldEnding, newEnding);

fs.writeFileSync('C:\\Users\\HP\\isa-marathon\\apps\\led-dashboard\\src\\App.tsx', content);
console.log('Fixed Leaderboard wrapper');