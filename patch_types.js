const fs = require('fs');
let code = fs.readFileSync('src/types.ts', 'utf8');

code = code.replace(
  '  popular?: boolean;\n}',
  '  popular?: boolean;\n  slug?: string;\n  hidden?: boolean;\n  disabled?: boolean;\n}'
);

fs.writeFileSync('src/types.ts', code);
