const fs = require('fs');
let content = fs.readFileSync('C:\\Users\\HP\\isa-marathon\\apps\\led-dashboard\\src\\App.tsx', 'utf8');

// Fix the middle dot first
content = content.replace(/A�/g, '·');

// Fix the specific lines - replace from the second </div> through the Announcement Banner
const oldEnding = `            </div>
          </div>

          

      {/* Announcement Banner */}
      {announcement && (`;

const newEnding = `            </div>
          </aside>

      {/* Announcement Banner */}
      {announcement && (`;

content = content.replace(oldEnding, newEnding);

fs.writeFileSync('C:\\Users\\HP\\isa-marathon\\apps\\led-dashboard\\src\\App.tsx', content);
console.log('Fixed v3');