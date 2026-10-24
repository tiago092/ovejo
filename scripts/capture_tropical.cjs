/* Same seed, lens and follow equation as the pre-revision location captures. */
const fs=require('node:fs'),path=require('node:path'),connect=require('./cdp.cjs');
(async()=>{const c=await connect(),out=path.resolve(__dirname,'../artifacts/godot/tropical-after');fs.mkdirSync(out,{recursive:true});const records=[];
try{
 await c.call('Emulation.setDeviceMetricsOverride',{width:1280,height:720,deviceScaleFactor:1,mobile:false});await c.call('Page.navigate',{url:'http://127.0.0.1:8767/dist/godot-test/index.html'});
 let ready=false;for(let i=0;i<120;i++){if(await c.evaluate('!!window.__rosa?.snapshot()')){ready=true;break}await c.sleep(500)}if(!ready)throw Error('Game did not initialize');
 const cmd=async message=>{await c.evaluate(`__rosa.command(${JSON.stringify(message)})`)};
 await cmd({command:'freeze',value:true});await cmd({command:'quality',value:'high'});await cmd({command:'start'});await cmd({command:'panel',value:true});await cmd({command:'capture_legacy',value:true});
 for(const [name,x,z,angle] of [['club',-28,-110,Math.PI],['coast',-78,-112,0],['hospital',76,100,0]]){
  await cmd({command:'set',values:{x,z,angle}});await c.sleep(1600);await c.shot(path.join(out,name+'.png'));records.push({name,x,z,angle,fov:48,seed:27,resolution:[1280,720],quality:'high',legacy_follow_and_obstacle_query:true,render:(await c.evaluate('__rosa.snapshot()')).render});
 }
 await cmd({command:'capture_legacy',value:false});
 const errors=c.messages.filter(m=>m.method==='Runtime.exceptionThrown'||m.method==='Runtime.consoleAPICalled'&&m.params.type==='error');
 fs.writeFileSync(path.join(out,'captures.json'),JSON.stringify({records,errors,package_sha256:JSON.parse(fs.readFileSync(path.resolve(out,'../verification-build.json'))).files['index.pck'].sha256},null,2)+'\n');if(errors.length)throw Error('Render errors');
}finally{await c.call('Page.navigate',{url:'about:blank'});c.close()}})().catch(e=>{console.error(e);process.exitCode=1});
