const fs = require('fs');
let c = fs.readFileSync('d:/archive/backend/server.py', 'utf8');
const regex = /    if admin\.role != "SUPER_ADMIN":\n        raise HTTPException\(status_code=403, detail=.*?\)\n/g;
c = c.replace(regex, '');
fs.writeFileSync('d:/archive/backend/server.py', c);
console.log('Done');
