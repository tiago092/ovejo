const fs=require('node:fs'),path=require('node:path'),connect=require('./cdp.cjs');
(async()=>{require('node:child_process').execFileSync('python3',[path.join(__dirname,'runtime_fingerprint.py'),'--check',path.join(__dirname,'../dist/godot-test/manifest.json')]);const packageHash=JSON.parse(fs.readFileSync(path.join(__dirname,'../artifacts/godot/verification-build.json'))).files['index.pck'].sha256;const c=await connect(),runs=[];try{
 await c.call('Emulation.setDeviceMetricsOverride',{width:1280,height:720,deviceScaleFactor:1,mobile:false});await c.call('Page.navigate',{url:process.env.GODOT_TEST_URL||'http://127.0.0.1:8767/dist/godot-test/index.html'});
 for(let i=0;i<120;i++){if(await c.evaluate('!!window.__rosa?.snapshot()'))break;await c.sleep(500)}
 for(const [quality,panel] of [['low',false],['low',true],['high',false],['high',true]]){
  await c.evaluate(`__rosa.command({command:'quality',value:'${quality}'});__rosa.command({command:'panel',value:${panel}});__rosa.command({command:'benchmark'});`);
  console.log('Measuring 60 s after 5 s warmup:',quality,'inset',panel);
  let result;const primitiveSamples=[];
  for(let i=0;i<100;i++){await c.sleep(1000);const s=await c.evaluate('__rosa.snapshot()');primitiveSamples.push(s.render.primitives);if(s.benchmark.elapsed>=60&&!s.benchmark.active){result=s;break}}
  if(!result)throw Error('Benchmark timed out');
  const frames=result.benchmark.frames,sorted=[...frames].sort((a,b)=>a-b),elapsed=frames.reduce((a,b)=>a+b,0),calls=result.benchmark.calls;
  runs.push({quality,panel,seconds:elapsed,frames:frames.length,fps:frames.length/elapsed,p95_ms:sorted[Math.floor(sorted.length*.95)]*1000,max_calls:Math.max(...calls),mean_calls:calls.reduce((a,b)=>a+b,0)/calls.length,max_primitives_sampled:Math.max(...primitiveSamples),js_heap_bytes:await c.evaluate('performance.memory?.usedJSHeapSize ?? null')});console.log(runs.at(-1));
 }
 const renderer=await c.evaluate('(()=>{const gl=canvas.getContext("webgl2"),ext=gl.getExtension("WEBGL_debug_renderer_info");return ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER)})()');
 fs.writeFileSync(path.join(__dirname,'../artifacts/godot/benchmark.json'),JSON.stringify({package_sha256:packageHash,browser:await c.call('Browser.getVersion'),renderer,resolution:[1280,720],route:'Scripted presentation path with active agents; verification resets health/time, not a gameplay balance test.',physical_mobile_verified:false,memory_note:'JS heap is observable in Chrome; it does not account for total WASM or GPU memory.',counter:'RenderingServer.RENDERING_INFO_TOTAL_DRAW_CALLS_IN_FRAME (all views and shadow passes); primitives sampled every second.',runs},null,2)+'\n');
}finally{await c.call('Page.navigate',{url:'about:blank'});c.close()}})().catch(e=>{console.error(e);process.exitCode=1});
