/* Deterministic story-v2 camera fixtures. Never overwrites identity review images. */
const fs=require('node:fs'),path=require('node:path'),connect=require('./cdp.cjs');
(async()=>{const c=await connect(),out=path.resolve(__dirname,'../artifacts/godot/story');fs.mkdirSync(out,{recursive:true});const records=[];
try{
 await c.call('Emulation.setDeviceMetricsOverride',{width:1280,height:720,deviceScaleFactor:1,mobile:false});await c.call('Page.navigate',{url:'http://127.0.0.1:8767/dist/godot-test/index.html'});
 let ready=false;for(let i=0;i<180;i++){if(await c.evaluate('!!window.__rosa?.snapshot()')){ready=true;break}await c.sleep(500)}if(!ready)throw Error('Game did not initialize');
 const cmd=async message=>{await c.evaluate(`__rosa.command(${JSON.stringify(message)})`)};
 await cmd({command:'freeze',value:true});await cmd({command:'quality',value:'high'});await cmd({command:'start'});await cmd({command:'panel',value:false});
 const world=JSON.parse(fs.readFileSync(path.resolve(__dirname,'../godot/data/world.json')));
 const fixtures=[['club',...world.start,Math.PI],['coast',-140,-145,0],['plaza',...world.landmarks.plaza,0],['plaza-detail',...world.landmarks.plaza,-1.6],['hospital',...world.hospital,0]];
 for(const [name,x,z,angle] of fixtures){
  await cmd({command:'set',values:{x,z,angle,vx:0,vz:0,phase:name==='hospital'?1:0}});await c.sleep(1800);await c.shot(path.join(out,name+'.png'));records.push({name,x,z,angle,seed:27,resolution:[1280,720],quality:'high',render:(await c.evaluate('__rosa.snapshot()')).render});
 }
 const errors=c.messages.filter(m=>m.method==='Runtime.exceptionThrown'||m.method==='Runtime.consoleAPICalled'&&m.params.type==='error');
 fs.writeFileSync(path.join(out,'captures.json'),JSON.stringify({art_extent:world.art_extent,records,errors,package_sha256:JSON.parse(fs.readFileSync(path.resolve(out,'../verification-build.json'))).files['index.pck'].sha256},null,2)+'\n');if(errors.length)throw Error('Render errors '+JSON.stringify(errors));
}finally{await c.call('Page.navigate',{url:'about:blank'});c.close()}})().catch(e=>{console.error(e);process.exitCode=1});
