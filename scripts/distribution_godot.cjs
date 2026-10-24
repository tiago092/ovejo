/* Release-only checks: no test API, gzip cold load and actionable failures. */
const fs=require('node:fs'),path=require('node:path'),connect=require('./cdp.cjs');
(async()=>{const c=await connect(),checks=[];let loadSeconds,exception;const url=process.env.GODOT_RELEASE_URL||'http://127.0.0.1:8767/dist/godot/index.html';
const check=(name,value)=>{checks.push({name,passed:!!value});if(!value)console.error('FAIL',name)};
const wait=async expression=>{for(let i=0;i<120;i++){if(await c.evaluate(expression))return true;await c.sleep(500)}return false};
try{
 await c.call('Network.enable');await c.call('Network.setCacheDisabled',{cacheDisabled:true});await c.call('Network.clearBrowserCache');await c.call('Network.setBlockedURLs',{urls:['*soundcloud.com*']});
 await c.call('Emulation.setDeviceMetricsOverride',{width:1280,height:720,deviceScaleFactor:1,mobile:false});
 await c.call('Network.emulateNetworkConditions',{offline:false,latency:100,downloadThroughput:20e6/8,uploadThroughput:20e6/8});
 const start=Date.now();await c.call('Page.navigate',{url});check('HTTP subdirectory loads without SoundCloud',await wait('!!document.getElementById("loadStatus")?.hidden'));
 loadSeconds=(Date.now()-start)/1000;check('cold gzip load <=15s (software environment)',loadSeconds<=15);
 await c.call('Network.emulateNetworkConditions',{offline:false,latency:0,downloadThroughput:-1,uploadThroughput:-1});
 check('release does not register instrumented API',await c.evaluate('window.__rosa===undefined'));
 check('runs without cross-origin isolation',await c.evaluate('!crossOriginIsolated'));
 await c.sleep(500);await c.shot(path.join(__dirname,'../artifacts/godot/release-menu.png'));
 const download=await c.evaluate('performance.getEntriesByType("resource").filter(e=>e.name.endsWith(".wasm")||e.name.endsWith(".pck")).map(e=>({name:e.name.split("/").pop(),encoded:e.encodedBodySize,decoded:e.decodedBodySize}))');
 check('runtime served compressed',download.length===2&&download.every(e=>e.encoded<e.decoded));
 const storage=await c.call('Page.addScriptToEvaluateOnNewDocument',{source:'Object.defineProperty(window,"localStorage",{get(){throw new DOMException("denied","SecurityError")}})'});
 await c.call('Page.navigate',{url});check('release loads when localStorage is denied',await wait('!!document.getElementById("loadStatus")?.hidden'));await c.call('Page.removeScriptToEvaluateOnNewDocument',{identifier:storage.identifier});
 const gl=await c.call('Page.addScriptToEvaluateOnNewDocument',{source:'const originalGetContext=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return type==="webgl2"?null:originalGetContext.call(this,type,...args)}'});
 await c.call('Page.navigate',{url});check('missing WebGL2 shows readable error',await wait('document.getElementById("loadText")?.textContent.includes("No se pudo iniciar")'));await c.shot(path.join(__dirname,'../artifacts/godot/error-webgl.png'));await c.call('Page.removeScriptToEvaluateOnNewDocument',{identifier:gl.identifier});
 await c.call('Network.setBlockedURLs',{urls:['*index.pck']});await c.call('Page.navigate',{url});check('missing package shows readable error',await wait('document.getElementById("loadText")?.textContent.includes("No se pudo iniciar")'));await c.shot(path.join(__dirname,'../artifacts/godot/error-package.png'));
 fs.writeFileSync(path.join(__dirname,'../artifacts/godot/download.json'),JSON.stringify({load_seconds:loadSeconds,network:{mbps:20,latency_ms:100,cold_cache:true},download},null,2)+'\n');
}catch(e){exception=String(e);console.error(e)}finally{
 await c.call('Network.setBlockedURLs',{urls:[]});await c.call('Network.emulateNetworkConditions',{offline:false,latency:0,downloadThroughput:-1,uploadThroughput:-1});
 const result={package_sha256:JSON.parse(fs.readFileSync(path.join(__dirname,'../artifacts/godot/release-build.json'))).files['index.pck'].sha256,browser:await c.call('Browser.getVersion'),checks,exception,passed:!exception&&checks.every(c=>c.passed)};fs.writeFileSync(path.join(__dirname,'../artifacts/godot/distribution.json'),JSON.stringify(result,null,2)+'\n');console.log(result);c.close();if(!result.passed)process.exitCode=1;
}})().catch(e=>{console.error(e);process.exitCode=1});
