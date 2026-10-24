const fs=require('node:fs'),path=require('node:path'),connect=require('./cdp.cjs');
(async()=>{const c=await connect(),results=[];try{
 await c.call('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:5});
 for(const [width,height] of [[390,844],[844,390]]){
  await c.call('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:true});await c.call('Page.navigate',{url:process.env.GODOT_TEST_URL||'http://127.0.0.1:8767/dist/godot-test/index.html'});
  for(let i=0;i<90;i++){if(await c.evaluate('!!window.__rosa?.snapshot()'))break;await c.sleep(500)}
  await c.evaluate('__rosa.command({command:"freeze",value:true})');await c.sleep(500);await c.shot(path.join(__dirname,`../artifacts/godot/menu-${width}x${height}.png`));
  const snapshot=await c.evaluate('__rosa.snapshot()');results.push({width,height,state:snapshot?.state});
 }
 fs.writeFileSync(path.join(__dirname,'../artifacts/godot/mobile-menus.json'),JSON.stringify({results,passed:results.every(r=>r.state==='menu'),note:'Menu screenshots require visual review; page overflow alone cannot detect a canvas UI overlap.'},null,2)+'\n');
 await c.call('Emulation.setTouchEmulationEnabled',{enabled:false});await c.call('Page.navigate',{url:'about:blank'});
}finally{c.close()}})().catch(e=>{console.error(e);process.exitCode=1});
