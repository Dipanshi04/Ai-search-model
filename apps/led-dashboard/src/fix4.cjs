const fs = require('fs');
let content = fs.readFileSync('C:\\Users\\HP\\isa-marathon\\apps\\led-dashboard\\src\\App.tsx', 'utf8');

// Add closing div for main content wrapper after </aside>
const oldEnding = `          </aside>

      {/* Announcement Banner */}`;

const newEnding = `          </aside>
        </div>

      {/* Announcement Banner */}`;

content = content.replace(oldEnding, newEnding);

fs.writeFileSync('C:\\Users\\HP\\isa-marathon\\apps\\led-dashboard\\src\\App.tsx', content);
console.log('Fixed main content wrapper');