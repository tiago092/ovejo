/* Behavioral export tests. CDP browser must already be running; no hidden dependencies. */
const fs=require('node:fs'),path=require('node:path'),connect=require('./cdp.cjs');
const root=path.resolve(__dirname,'..'),out=path.join(root,'artifacts/godot'),base=process.env.GODOT_TEST_URL||'http://127.0.0.1:8767/dist/godot-test/index.html';
const part=process.env.GODOT_TEST_PART||'all';
const world=JSON.parse(fs.readFileSync(path.join(root,'godot/data/world.json')));
const [px,pz]=world.pickup,[hx,hz]=world.hospital;
(async()=>{const c=await connect(),checks=[],captures=[],counts=[];let failure;
const check=(name,ok)=>{checks.push({name,passed:!!ok});if(!ok)console.error('FAIL',name);};
const command=async message=>c.evaluate(`__rosa.command(${JSON.stringify(message)})`);
const snapshot=()=>c.evaluate('__rosa.snapshot()');
const shot=async name=>{await c.sleep(700);await c.shot(path.join(out,(process.env.GODOT_CAPTURE_PREFIX||'story-')+name+'.png'));captures.push((process.env.GODOT_CAPTURE_PREFIX||'story-')+name+'.png');};
const load=async()=>{await c.call('Page.navigate',{url:base});let ready=false;for(let i=0;i<120;i++){ready=await c.evaluate('!!window.__rosa?.snapshot()');if(ready)break;await c.sleep(500);}if(!ready)throw Error('Godot failed to initialize');await command({command:'freeze',value:true});};
try{
 await c.call('Network.enable');await c.call('Network.setBlockedURLs',{urls:['*soundcloud.com*']});
 await c.call('Emulation.setDeviceMetricsOverride',{width:1280,height:720,deviceScaleFactor:1,mobile:false});await load();check('export initializes',true);await shot('menu-desktop');
 if(part!=='screens'){
 await command({command:'start',story:true,reduced:false});check('intro precedes timer',(await snapshot()).state==='cinematic'&&(await snapshot()).time===150);
 await command({command:'advance',dt:3});await shot('intro-closeup');await command({command:'pause'});await command({command:'advance',dt:20});check('intro pause',(await snapshot()).cinematic_time===3);
 await command({command:'pause'});await command({command:'advance',dt:4});check('seven second intro',(await snapshot()).state==='playing'&&(await snapshot()).time===150);
 for(const key of [{key:'Enter',code:'Enter',windowsVirtualKeyCode:13},{key:' ',code:'Space',windowsVirtualKeyCode:32}]){
  await command({command:'start',story:true,reduced:false});await c.call('Input.dispatchKeyEvent',{type:'keyDown',...key});await c.call('Input.dispatchKeyEvent',{type:'keyUp',...key});for(let wait=0;wait<12;wait++){if((await snapshot()).state==='playing')break;await c.sleep(300);}const s=await snapshot();check(key.code+' skips without siren',s.state==='playing'&&s.time===150&&s.siren_left===0);
 }
 await command({command:'start',story:true,reduced:false});await c.sleep(500);
 await c.call('Input.dispatchMouseEvent',{type:'mousePressed',x:640,y:662,button:'left',clickCount:1});await c.call('Input.dispatchMouseEvent',{type:'mouseReleased',x:640,y:662,button:'left',clickCount:1});await c.sleep(800);check('button skips without siren',(await snapshot()).state==='playing'&&(await snapshot()).siren_left===0);
 await command({command:'start',story:true,reduced:true});check('reduced motion skips introduction',(await snapshot()).state==='playing');
 await command({command:'set',values:{x:px,z:pz,impact:3}});
 for(let i=0;i<6;i++)await command({command:'advance',dt:.25});check('pickup',(await snapshot()).phase===1);
 await command({command:'set',values:{x:hx,z:hz,impact:3,vx:0,vz:0}});for(let i=0;i<6;i++)await command({command:'advance',dt:.25});check('delivery',(await snapshot()).state==='won');await shot('result');
 for(const values of [{time:.01,health:100},{time:30,health:0}]){
  await command({command:'start'});await command({command:'set',values:{x:hx,z:hz,phase:1,load_progress:1.29,...values}});await command({command:'advance',dt:.025});check('defeat overrides delivery '+Object.keys(values).join('/'),(await snapshot()).state==='lost');
 }
 await command({command:'start',story:false,reduced:false});await command({command:'skip'});await command({command:'set',values:{x:hx,z:hz,phase:1,load_progress:1.29,vx:0,vz:0,impact:3}});await command({command:'advance',dt:.025});check('six-second ending begins',(await snapshot()).state==='ending');
 await command({command:'advance',dt:3});await command({command:'pause'});await command({command:'advance',dt:20});check('ending pauses',(await snapshot()).ending_time===3);await command({command:'pause'});await command({command:'advance',dt:3});check('ending completes',(await snapshot()).state==='won');
 for(const key of [{key:'Enter',code:'Enter',windowsVirtualKeyCode:13},{key:' ',code:'Space',windowsVirtualKeyCode:32}]){await command({command:'start',reduced:false});await command({command:'set',values:{time:.01}});await command({command:'advance',dt:.025});await c.call('Input.dispatchKeyEvent',{type:'keyDown',...key});await c.call('Input.dispatchKeyEvent',{type:'keyUp',...key});await c.sleep(500);check('ending skip '+key.code,(await snapshot()).state==='lost'&&(await snapshot()).siren_left===0);}
 for(let i=0;i<3;i++){await command({command:'start'});const s=await snapshot();check('reset '+i,s.time===150&&s.health===100&&s.phase===0&&s.carts[0].stop===0&&s.carts[0].next===3&&s.police.cool===0);}
 await command({command:'start'});await c.evaluate('Object.defineProperty(document,"hidden",{configurable:true,get:()=>true});document.dispatchEvent(new Event("visibilitychange"));delete document.hidden;');for(let wait=0;wait<20;wait++){if((await snapshot()).state==='paused')break;await c.sleep(300);}check('hidden tab pauses',(await snapshot()).state==='paused');
 await command({command:'pause'});await command({command:'siren'});check('siren active',(await snapshot()).siren_left===2.2);
 }
 if(part!=='flow'){
 for(const quality of ['high','low']){
  await command({command:'quality',value:quality});await command({command:'start'});await command({command:'panel',value:quality==='high'});
  for(const [name,x,z,angle] of [['coast',-140,-145,0],['club',...world.start,Math.PI],['plaza',...world.landmarks.plaza,0],['hospital',hx,hz,0]]){
   await command({command:'set',values:{x,z,angle}});await shot(name+'-'+quality);const s=await snapshot();counts.push({scene:name,quality,...s.render});check('draw budget '+name+' '+quality,s.render.calls<=(quality==='high'?300:150));
  }
 }
 await command({command:'panel',value:true});await c.sleep(800);check('low inset draw budget',(await snapshot()).render.calls<=150);await command({command:'panel',value:false});check('closed inset stops rendering',!(await snapshot()).inset_rendering);
 await command({command:'quality',value:'low'});await load();check('quality persists',(await snapshot()).quality==='low');
 await command({command:'start'});await c.call('Emulation.setDeviceMetricsOverride',{width:1920,height:1080,deviceScaleFactor:1,mobile:false});await shot('desktop-1920');
 for(const [width,height] of [[390,844],[844,390]]){
  await c.call('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:5});await c.call('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:true});await command({command:'quality',value:'auto'});await command({command:'start'});await c.sleep(500);await shot('mobile-'+width+'x'+height);check('auto low on touch '+width,(await snapshot()).low);
  const info=await c.evaluate('({w:innerWidth,h:innerHeight,scroll:scrollY,overflow:document.documentElement.scrollWidth>innerWidth})');check('no page overflow '+width,!info.overflow&&info.w===width);
  await c.call('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:width-40,y:height-60,id:1},{x:40,y:height-60,id:2}]});await c.sleep(700);check('multitouch throttle and turn '+width,Object.values((await snapshot()).touch_inputs).includes('up')&&Object.values((await snapshot()).touch_inputs).includes('left'));
  await c.call('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});for(let wait=0;wait<12;wait++){if(Object.keys((await snapshot()).touch_inputs).length===0)break;await c.sleep(300);}check('touch cancel no scroll '+width,await c.evaluate('scrollY===0')&&Object.keys((await snapshot()).touch_inputs).length===0);
 }
 await c.call('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:3,mobile:true});await load();await command({command:'start'});await shot('mobile-dpr3');const dense=await snapshot();check('DPR3 keeps CSS-sized input coordinates',Math.abs(dense.ui_size[0]-390)<1&&Math.abs(dense.ui_size[1]-844)<1);
 await c.call('Emulation.setTouchEmulationEnabled',{enabled:false});await c.call('Emulation.setDeviceMetricsOverride',{width:1280,height:720,deviceScaleFactor:1,mobile:false});await command({command:'study'});await shot('character-three-views');
 }
}catch(e){failure=String(e);console.error(e)}finally{
 const errors=c.messages.filter(m=>m.method==='Runtime.exceptionThrown'||m.method==='Runtime.consoleAPICalled'&&m.params.type==='error').map(m=>m.params);
 const result={part,package_sha256:JSON.parse(fs.readFileSync(path.join(out,'verification-build.json'))).files['index.pck'].sha256,browser:await c.call('Browser.getVersion'),backend:'SwiftShader (software; not physical-device performance)',checks,counts,captures,errors,failure,passed:!failure&&checks.every(c=>c.passed)&&errors.length===0};
 fs.writeFileSync(path.join(out,part==='all'?'browser.json':'browser-'+part+'.json'),JSON.stringify(result,null,2)+'\n');
 if(part!=='all'&&['flow','screens'].every(p=>fs.existsSync(path.join(out,'browser-'+p+'.json')))){
  const reports=['flow','screens'].map(p=>JSON.parse(fs.readFileSync(path.join(out,'browser-'+p+'.json'))));
  if(reports.every(r=>r.package_sha256===result.package_sha256))fs.writeFileSync(path.join(out,'browser.json'),JSON.stringify({...result,part:'combined',checks:reports.flatMap(r=>r.checks),counts:reports.flatMap(r=>r.counts),captures:reports.flatMap(r=>r.captures),errors:reports.flatMap(r=>r.errors),passed:reports.every(r=>r.passed)},null,2)+'\n');
 }console.log(JSON.stringify({checks:checks.length,passed:result.passed,counts,errors:errors.length,failure}));c.close();if(!result.passed)process.exitCode=1;
}
})().catch(e=>{console.error(e);process.exitCode=1});
