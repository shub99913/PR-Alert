// More comprehensive patch for expo cli externals.js
// This patches the NODE_STDLIB_MODULES to exclude problematic modules on Windows

const fs = require('fs');
const path = require('path');

const externalsPath = path.join(__dirname, 'node_modules', '@expo', 'cli', 'build', 'src', 'start', 'server', 'metro', 'externals.js');

let content = fs.readFileSync(externalsPath, 'utf8');

// Find and replace the NODE_STDLIB_MODULES definition to filter out problematic modules
const oldModuleList = `const NODE_STDLIB_MODULES = [
    "fs/promises",
    ...(_module.builtinModules || // @ts-expect-error
    (process.binding ? Object.keys(process.binding("natives")) : []) || []).filter((x)=>!/^_|^(internal|v8|node-inspect)\\/|\\//.test(x) && ![
            "sys"
        ].includes(x)
    ), 
].sort();`;

const newModuleList = `const NODE_STDLIB_MODULES = [
    "fs/promises",
    ...(_module.builtinModules || // @ts-expect-error
    (process.binding ? Object.keys(process.binding("natives")) : []) || []).filter((x)=>!/^_|^(internal|v8|node-inspect)\\/|\\//.test(x) && ![
            "sys"
        ].includes(x))
    )
    // Filter out problematic modules on Windows
    .filter((x) => !['node:sea', 'sea', 'node:sqlite', 'node:sqlite3', 'sqlite', 'sqlite3'].includes(x))
].sort();`;

if (content.includes(oldModuleList)) {
    content = content.replace(oldModuleList, newModuleList);
    fs.writeFileSync(externalsPath, content);
    console.log('Patched NODE_STDLIB_MODULES successfully');
} else {
    console.log('Could not find exact NODE_STDLIB_MODULES definition');
    // Try alternative - just add the filter
    const filterPattern = `.filter((x)=>!/^_|^(internal|v8|node-inspect)\\\\/|\\\\//.test(x) && ![`;
    const idx = content.indexOf(filterPattern);
    if (idx !== -1) {
        // Find the end of this filter
        const endIdx = content.indexOf('].includes(x)', idx);
        if (endIdx !== -1) {
            const fullFilterEnd = content.indexOf(').sort();', endIdx);
            if (fullFilterEnd !== -1) {
                const oldFilter = content.slice(idx, fullFilterEnd + 9);
                const newFilter = oldFilter.replace(
                    '].includes(x)',
                    '].includes(x))\n    .filter((x) => ![\'node:sea\', \'sea\', \'node:sqlite\', \'node:sqlite3\', \'sqlite\', \'sqlite3\'].includes(x))'
                );
                content = content.replace(oldFilter, newFilter);
                fs.writeFileSync(externalsPath, content);
                console.log('Patched filter successfully');
            } else {
                console.log('Could not find end of filter');
            }
        } else {
            console.log('Could not find filter pattern');
        }
    }
    
    fs.writeFileSync(externalsPath, content);
    console.log('Patch attempted');
}