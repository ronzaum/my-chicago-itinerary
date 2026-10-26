import {createServer} from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
const root=resolve('public'),port=Number(process.env.PORT||4191);
const mime={'.html':'text/html; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.ttf':'font/ttf','.woff2':'font/woff2','.txt':'text/plain; charset=utf-8'};
createServer(async(req,res)=>{try{const path=decodeURIComponent(new URL(req.url,'http://localhost').pathname);const file=resolve(root,'.'+(path==='/'?'/index.html':path));if(!file.startsWith(root+sep)){res.writeHead(403).end();return;}if(file===resolve(root,'map-config.json')){try{await stat(file);}catch{res.writeHead(200,{'Content-Type':mime['.json']});res.end('{"googleMapsKey":""}');return;}}const content=await readFile(file);res.writeHead(200,{'Content-Type':mime[extname(file)]||'application/octet-stream','Cache-Control':'no-store'});res.end(content);}catch{res.writeHead(404).end('Not found');}}).listen(port,'127.0.0.1',()=>console.log(`Itinerary: http://127.0.0.1:${port}/phone.html`));
