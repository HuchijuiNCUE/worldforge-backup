import {readFile,writeFile,mkdir} from 'node:fs/promises';
const html=await readFile('src/index.html','utf8');const worker=await readFile('src/worker.mjs','utf8');await mkdir('dist/server',{recursive:true});await writeFile('dist/server/index.js',worker.replace('__HTML__',JSON.stringify(html)));
