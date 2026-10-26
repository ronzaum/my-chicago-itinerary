import {readdir,readFile,stat} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import {spawnSync} from 'node:child_process';
const root=resolve('public');let files=0;const failures=[];
async function walk(dir){for(const entry of await readdir(dir,{withFileTypes:true})){const file=resolve(dir,entry.name);if(entry.isDirectory()){await walk(file);continue;}files++;if(['.ttf','.woff2'].includes(extname(file)))continue;const text=await readFile(file,'utf8');if(extname(file)==='.json'){try{JSON.parse(text)}catch{failures.push(`${file}: invalid JSON`)}}if(extname(file)==='.mjs'){const result=spawnSync(process.execPath,['--check',file],{encoding:'utf8'});if(result.status)failures.push(`${file}: invalid JavaScript`)}if(entry.name!=='map-config.json'&&/AIza[\w-]+|github_pat_[A-Za-z0-9_]+|gh[pousr]_[A-Za-z0-9]{15,}|-----BEGIN .*PRIVATE KEY/.test(text))failures.push(`${file}: possible credential`);}}
await walk(root);
const data=JSON.parse(await readFile(resolve(root,'app-data.json')));const dates=data.days.map(d=>d.date);if(new Set(dates).size!==dates.length)failures.push('Duplicate dates');
const records=JSON.parse(await readFile(resolve(root,'colour-archive.json')));for(const item of records){if(item.preview){try{await stat(resolve(root,item.preview));}catch{failures.push(`Missing preview: ${item.preview}`)}}}
for(const file of ['phone.html','index.html','colour-archive.html']){const html=await readFile(resolve(root,file),'utf8');for(const match of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)){const result=spawnSync(process.execPath,['--check','--input-type=module'],{input:match[1],encoding:'utf8'});if(result.status)failures.push(`${file}: invalid inline JavaScript`);}}
if(failures.length){console.error(failures.join('\n'));process.exit(1);}console.log(`Checked ${files} files, ${dates.length} days, ${records.length} archive records; syntax, JSON and preview references passed.`);
