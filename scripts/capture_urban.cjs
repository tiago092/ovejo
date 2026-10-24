/* Compact-village art review: same global camera fixtures, private Verification bridge. */
const fs=require('node:fs'),path=require('node:path'),connect=require('./cdp.cjs');
const root=path.resolve(__dirname,'..'),out=path.join(root,'artifacts/godot/urban');
const world=JSON.parse(fs.readFileSync(path.join(root,'godot/data/world.json')));
const pointAt=distance=>{for(let i=1;i<world.main_route.length;i++){let a=world.nodes[i-1],b=world.nodes[i],length=Math.hypot(b[0]-a[0],b[1]-a[1]);if(distance<=length)return [a[0]+(b[0]-a[0])*distance/length,a[1]+(b[1]-a[1])*distance/length,Math.atan2(b[0]-a[0],b[1]-a[1])];distance-=length}};
(async()=>{const c=await connect(),records=[],checks=[];fs.mkdirSync(out,{recursive:true});let failure;
const check=(name,ok)=>{checks.push({name,passed:!!ok});if(!ok)console.error('FAIL',name)};
const command=message=>c.evaluate(`__rosa.command(${JSON.stringify(message)})`);
try{
 await c.call('Network.enable');await c.call('Network.setCacheDisabled',{cacheDisabled:true});await c.call('Network.setBlockedURLs',{urls:['*soundcloud.com*']});await c.call('Emulation.setDeviceMetricsOverride',{width:1280,height:720,deviceScaleFactor:1,mobile:false});
 await c.call('Page.navigate',{url:'http://127.0.0.1:8767/dist/godot-test/index.html'});
 let ready=false;for(let i=0;i<150;i++){if(await c.evaluate('!!window.__rosa?.snapshot()')){ready=true;break}await c.sleep(500)}if(!ready)throw Error('No Verification bridge');
 check('current compact-village package',(await c.evaluate('__rosa.snapshot()')).detail_pass===world.detail_pass);
 await command({command:'freeze',value:true});await command({command:'quality',value:'high'});await command({command:'start'});await command({command:'panel',value:false});
 const fixtures=[['club',...world.start,Math.PI],['first-curve',-132,-185,-.2],['street',...world.start,world.start_angle],['coast',-140,-145,0],...Array.from({length:6},(_,i)=>['tour-'+i,...pointAt(i*15)]),['commerce',50,60,Math.PI],['plaza',...world.landmarks.plaza,0],['plaza-detail',...world.landmarks.plaza,-1.6],['hospital',...world.hospital,0]];
 for(const [name,x,z,angle] of fixtures){if(name==='commerce'){await command({command:'set',values:{x:world.pickup[0],z:world.pickup[1],vx:0,vz:0,impact:3}});for(let i=0;i<6;i++)await command({command:'advance',dt:.25});}await command({command:'set',values:{x,z,angle,vx:0,vz:0,load_progress:0}});await c.sleep(1300);await c.shot(path.join(out,name+'.png'));const s=await c.evaluate('__rosa.snapshot()');records.push({name,x,z,angle,resolution:[1280,720],quality:'high',seed:27,render:s.render});check('draw budget '+name,s.render.calls<=300);}
 // Frontal camera: test the same route points and record its unobstructed placement.
 await c.call('Input.dispatchKeyEvent',{type:'keyDown',key:'c',code:'KeyC',windowsVirtualKeyCode:67});await c.call('Input.dispatchKeyEvent',{type:'keyUp',key:'c',code:'KeyC',windowsVirtualKeyCode:67});await c.sleep(700);await c.shot(path.join(out,'camera-front.png'));
 const errors=c.messages.filter(m=>m.method==='Runtime.exceptionThrown'||m.method==='Runtime.consoleAPICalled'&&m.params.type==='error');check('no rendering errors',errors.length===0);
}catch(e){failure=String(e);console.error(e)}finally{
 fs.writeFileSync(path.join(out,'captures.json'),JSON.stringify({urban_extent:world.urban_extent,package_sha256:JSON.parse(fs.readFileSync(path.join(root,'artifacts/godot/verification-build.json'))).files['index.pck'].sha256,records,checks,failure,passed:!failure&&checks.every(c=>c.passed)},null,2)+'\n');await c.call('Network.setBlockedURLs',{urls:[]});await c.call('Page.navigate',{url:'about:blank'});c.close();if(failure||checks.some(c=>!c.passed))process.exitCode=1}
})().catch(e=>{console.error(e);process.exitCode=1});
