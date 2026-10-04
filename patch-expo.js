// Patch for expo cli externals.js to fix node:sea issue on Windows
// This patches the tapNodeShims function to skip node:sea

const fs = require('fs');
const path = require('path');

const externalsPath = path.join(__dirname, 'node_modules', '@expo', 'cli', 'build', 'src', 'start', 'server', 'metro', 'externals.js');

let content = fs.readFileSync(externalsPath, 'utf8');

// Find the tapNodeShims function and add a filter for node:sea
const oldTapNodeShims = `async function tapNodeShims(projectRoot) {
    const externals = {};
    for (const moduleId of NODE_STDLIB_MODULES){
        const shimDir = _path.default.join(projectRoot, METRO_EXTERNALS_FOLDER, moduleId);
        const shimPath = _path.default.join(shimDir, "index.js");
        externals[moduleId] = shimPath;
        if (!_fs.default.existsSync(shimPath)) {
            await _fs.default.promises.mkdir(shimDir, {
                recursive: true
            });
            await _fs.default.promises.writeFile(shimPath, tapNodeShimContents(moduleId))
        }
    }
}`;

const newTapNodeShims = `async function tapNodeShims(projectRoot) {
    const externals = {};
    for (const moduleId of NODE_STDLIB_MODULES){
        // Skip node:sea which causes issues on Windows
        if (moduleId === 'node:sea' || moduleId === 'sea') {
            continue;
        }
        const shimDir = _path.default.join(projectRoot, METRO_EXTERNALS_FOLDER, moduleId);
        const shimPath = _path.default.join(shimDir, "index.js");
        externals[moduleId] = shimPath;
        if (!_fs.default.existsSync(shimPath)) {
            await _fs.default.promises.mkdir(shimDir, {
                recursive: true
            });
            await _fs.default.promises.writeFile(shimPath, tapNodeShimContents(moduleId))
        }
    }
}`;

if (content.includes(oldTapNodeShims)) {
    content = content.replace(oldTapNodeShims, newTapNodeShims);
    fs.writeFileSync(externalsPath, content);
    console.log('Patched externals.js successfully');
} else {
    console.log('Could not find exact match, trying alternative...');
    // Try a more flexible replacement
    const searchPattern = 'async function tapNodeShims(projectRoot) {';
    const idx = content.indexOf(searchPattern);
    if (idx !== -1) {
        // Find the end of the function
        let braceCount = 0;
        let endIdx = idx;
        let inFunction = false;
        for (let i = idx; i < content.length; i++) {
            if (content[i] === '{') {
                braceCount++;
                inFunction = true;
            } else if (content[i] === '}') {
                braceCount--;
                if (inFunction && braceCount === 0) {
                    endIdx = i + 1;
                    break;
                }
            }
        }
        
        const newFunction = `async function tapNodeShims(projectRoot) {
    const externals = {};
    for (const moduleId of NODE_STDLIB_MODULES){
        // Skip node:sea which causes issues on Windows
        if (moduleId === 'node:sea' || moduleId === 'sea') {
            continue;
        }
        const shimDir = _path.default.join(projectRoot, METRO_EXTERNALS_FOLDER, moduleId);
        const shimPath = _path.default.join(shimDir, "index.js");
        externals[moduleId] = shimPath;
        if (!_fs.default.existsSync(shimPath)) {
            await _fs.default.promises.mkdir(shimDir, {
                recursive: true
            });
            await _fs.default.promises.writeFile(shimPath, tapNodeShimContents(moduleId))
        }
    }
}`;
        
        content = content.slice(0, idx) + newFunction + content.slice(endIdx);
        fs.writeFileSync(externalsPath, content);
        console.log('Patched externals.js successfully (alternative method)');
    } else {
        console.log('Could not find tapNodeShims function');
    }
}