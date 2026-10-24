/* Sweeps both player cameras along every district using the shared polygon data. */
const fs=require('node:fs'),path=require('node:path'),connect=require('./cdp.cjs'),root=path.resolve(__dirname,'..');
const world=JSON.parse(fs.readFileSync(path.join(root,'godot/data/world.json')));
const inside=(p,poly)=>{let hit=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){let a=poly[i],b=poly[j];if((a[1]>p[1])!==(b[1]>p[1])&&p[0]<(b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0])hit=!hit}return hit};
(async()=>{const c=await connect(),checks=[],records=[];let failure;const command=m=>c.evaluate(`__rosa.command(${JSON.stringify(m)})`);
try{
 await c.call('Network.enable');await c.call('Network.setCacheDisabled',{cacheDisabled:true});await c.call('Page.navigate',{url:'http://127.0.0.1:8767/dist/godot-test/'});let ready=false;for(let i=0;i<150;i++){if(await c.evaluate('!!window.__rosa?.snapshot()')){ready=true;break}await c.sleep(500)}if(!ready)throw Error('No Verification bridge');
 await command({command:'freeze',value:true});await command({command:'quality',value:'low'});
 for(const [width,height] of [[1280,720],[390,844]]){
  await c.call('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<500});await command({command:'start'});
  for(const mode of ['rear','front']){
   if(mode==='front'){await c.call('Input.dispatchKeyEvent',{type:'keyDown',key:'c',code:'KeyC',windowsVirtualKeyCode:67});await c.call('Input.dispatchKeyEvent',{type:'keyUp',key:'c',code:'KeyC',windowsVirtualKeyCode:67});await c.sleep(350)}
   for(let node=0;node<world.main_route.length;node+=8){
    const p=world.nodes[node],q=world.nodes[Math.min(node+1,world.main_route.length-1)],angle=node<world.main_route.length-1?Math.atan2(q[0]-p[0],q[1]-p[1]):0;
    await command({command:'set',values:{x:p[0],z:p[1],angle,vx:0,vz:0}});await c.sleep(250);const s=await c.evaluate('__rosa.snapshot()'),camera=s.presentation.camera_position,distance=Math.hypot(camera[0]-p[0],camera[2]-p[1]),interior=world.buildings.filter(b=>inside([camera[0],camera[2]],b.polygon)).map(b=>b.id);
    const passed=distance>3&&distance<28&&interior.length===0;checks.push({name:`${width}x${height} ${mode} node ${node}`,passed});records.push({width,height,mode,node,camera,distance,interior});if(!passed)console.error('Camera fail',records.at(-1));
   }
  }
  await c.call('Input.dispatchKeyEvent',{type:'keyDown',key:'c',code:'KeyC',windowsVirtualKeyCode:67});await c.call('Input.dispatchKeyEvent',{type:'keyUp',key:'c',code:'KeyC',windowsVirtualKeyCode:67});await c.sleep(250);
 }
 const errors=c.messages.filter(m=>m.method==='Runtime.exceptionThrown'||m.method==='Runtime.consoleAPICalled'&&m.params.type==='error');checks.push({name:'no runtime errors',passed:errors.length===0});
}catch(e){failure=String(e);console.error(e)}finally{fs.writeFileSync(path.join(root,'artifacts/godot/urban/cameras.json'),JSON.stringify({package_sha256:JSON.parse(fs.readFileSync(path.join(root,'artifacts/godot/verification-build.json'))).files['index.pck'].sha256,checks,records,failure,passed:!failure&&checks.every(c=>c.passed)},null,2)+'\n');await c.call('Page.navigate',{url:'about:blank'});c.close();if(failure||checks.some(c=>!c.passed))process.exitCode=1}
})().catch(e=>{console.error(e);process.exitCode=1});
