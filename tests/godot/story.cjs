/* New-rule presentation, narrative and input behavior, independent of old Three traces. */
const fs=require('node:fs'),path=require('node:path'),connect=require('../../scripts/cdp.cjs');
(async()=>{const c=await connect(),checks=[];let failure;const check=(name,ok)=>{checks.push({name,passed:!!ok});if(!ok)console.error('FAIL',name)};
const cmd=async m=>c.evaluate(`__rosa.command(${JSON.stringify(m)})`),snap=()=>c.evaluate('window.__rosa?.snapshot()');
try{
 await c.call('Emulation.setDeviceMetricsOverride',{width:1280,height:720,deviceScaleFactor:1,mobile:false});await c.call('Page.navigate',{url:'http://127.0.0.1:8767/dist/godot-test/index.html'});
 let ready=false;for(let i=0;i<180;i++){if(await snap()){ready=true;break}await c.sleep(500)}if(!ready)throw Error('No snapshot');
 await cmd({command:'freeze',value:true});await cmd({command:'quality',value:'high'});await cmd({command:'start'});check('inset initially closed',!(await snap()).panel_open);
 await cmd({command:'siren'});await c.sleep(500);check('siren opens three-second reaction',(await snap()).panel_open);
 await cmd({command:'freeze',value:false});await c.sleep(3700);await cmd({command:'freeze',value:true});check('reaction closes after three seconds',!(await snap()).panel_open);
 await cmd({command:'pin',value:true});await cmd({command:'freeze',value:false});await c.sleep(3500);await cmd({command:'freeze',value:true});check('pinned inset persists',(await snap()).inset_rendering);
 await cmd({command:'panel',value:false});check('closed inset stops rendering',!(await snap()).inset_rendering);
 await cmd({command:'set',values:{x:-140,z:-145,speed:18,vz:18}});const fast=await snap();check('engine pitch follows speed',fast.audio.engine.pitch>1.1);
 await cmd({command:'set',values:{x:-140,z:-145,speed:0,vx:0,vz:0}});await cmd({command:'freeze',value:false});await c.sleep(1500);await cmd({command:'freeze',value:true});const road=await snap();
 await cmd({command:'set',values:{x:-165,z:-145}});await cmd({command:'freeze',value:false});await c.sleep(1200);await cmd({command:'freeze',value:true});const sand=await snap();check('road/sand use shared graph',road.audio.road.db>road.audio.sand.db&&sand.audio.sand.db>sand.audio.road.db);
 await cmd({command:'pause'});const paused=await snap();await c.sleep(1000);const still=await snap();check('pause stops all sound beds',Object.values(still.audio).every(p=>!p.playing));check('pause freezes camera and suspension',JSON.stringify(paused.presentation.camera_position)===JSON.stringify(still.presentation.camera_position)&&paused.presentation.suspension===still.presentation.suspension);check('pause freezes mission',paused.time===still.time);
 await cmd({command:'pause'});await cmd({command:'mute',value:true});check('mute stops sound beds',Object.values((await snap()).audio).every(p=>!p.playing));
 await cmd({command:'reduced',value:true});await cmd({command:'advance',dt:.1,keys:{up:true,left:true}});check('reduced removes secondary motion',(await snap()).presentation.suspension===0&&(await snap()).presentation.braking_pitch===0);
 const world=JSON.parse(fs.readFileSync(path.resolve(__dirname,'../../godot/data/world.json')));await cmd({command:'start'});await cmd({command:'set',values:{x:world.pickup[0],z:world.pickup[1],speed:0,vx:0,vz:0,impact:3}});await cmd({command:'advance',dt:.25});const pickup=await snap();check('patient animation tied to logical progress',pickup.presentation.pickup_visual_progress>0&&pickup.presentation.pickup_visual_progress<1&&pickup.presentation.objective_visible);
 await cmd({command:'set',values:{x:world.pickup[0]+12}});await cmd({command:'advance',dt:.025});check('leaving cancels patient animation',(await snap()).presentation.pickup_visual_progress===0);
 await cmd({command:'start'});check('restart clears narrative and handling',(await snap()).drift===0&&(await snap()).ending_time===0&&Object.keys((await snap()).moments).every(id=>id==='departure')&&(await snap()).presentation.story_queue<=1);
 await cmd({command:'menu'});check('menu stops beds',Object.values((await snap()).audio).every(p=>!p.playing));
}catch(e){failure=String(e);console.error(e)}finally{
 const errors=c.messages.filter(m=>m.method==='Runtime.exceptionThrown'||m.method==='Runtime.consoleAPICalled'&&m.params.type==='error');const passed=!failure&&!errors.length&&checks.every(c=>c.passed);
 fs.writeFileSync(path.resolve(__dirname,'../../artifacts/godot/story-tests.json'),JSON.stringify({package_sha256:JSON.parse(fs.readFileSync(path.resolve(__dirname,'../../artifacts/godot/verification-build.json'))).files['index.pck'].sha256,checks,errors,failure,passed},null,2)+'\n');console.log({checks:checks.length,passed,failure,errors:errors.length});await c.call('Page.navigate',{url:'about:blank'});c.close();if(!passed)process.exitCode=1;}
})().catch(e=>{console.error(e);process.exitCode=1});
