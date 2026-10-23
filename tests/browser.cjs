/* Dependency-free browser regression and visual capture. Node >=22 + Chrome. */
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),{spawn}=require('node:child_process'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),output=path.join(root,'artifacts');
const delay=ms=>new Promise(r=>setTimeout(r,ms));
async function main(){
  fs.mkdirSync(output,{recursive:true});
  let chrome,server,endpoint=process.env.CHROME_DEBUG_URL;
  if(!endpoint){
    chrome=spawn(process.env.CHROME_PATH||'google-chrome',['--headless','--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader','--use-angle=swiftshader','--remote-debugging-port=0','--user-data-dir=/tmp/rosa-browser-tests-'+process.pid,'about:blank'],{stdio:['ignore','ignore','pipe']});
    endpoint=await new Promise((resolve,reject)=>{let log='';chrome.stderr.on('data',d=>{log+=d;const match=log.match(/DevTools listening on ws:\/\/([^/]+)/);if(match)resolve('http://'+match[1]);});chrome.on('error',reject);chrome.on('exit',c=>reject(new Error('Chrome exited '+c+' '+log.slice(-1000))));});
  }
  const pages=await fetch(endpoint+'/json/list').then(r=>r.json());
  const ws=new WebSocket(pages.find(p=>p.type==='page').webSocketDebuggerUrl);await new Promise(r=>ws.addEventListener('open',r,{once:true}));
  let id=0;const pending=new Map(),errors=[],checks=[];
  const call=(method,params={})=>new Promise((resolve,reject)=>{const n=++id;pending.set(n,{resolve,reject});ws.send(JSON.stringify({id:n,method,params}));});
  const evaluate=async expression=>{const r=await call('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value;};
  ws.addEventListener('message',async e=>{const m=JSON.parse(e.data);if(m.id){const p=pending.get(m.id);pending.delete(m.id);m.error?p.reject(Error(JSON.stringify(m.error))):p.resolve(m.result);}
    if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails);
    if(m.method==='Runtime.consoleAPICalled'&&m.params.type==='error')errors.push(m.params.args.map(a=>a.value||a.description).join(' '));
    if(m.method==='Fetch.requestPaused'){
      const {requestId,request}=m.params;
      if(request.url.endsWith('/game.js')){
        const expose=`window.__review={snapshot:()=>({state,phase,time,health,x,z,speed,angle,cinematicTime,visualTime,lowQuality,qualityPreference,panelOpen,cameraMode,load,bumps,pedHits,police:{x:police.x,z:police.z},render:JSON.parse(JSON.stringify(renderer.info.render)),pixelRatio:renderer.getPixelRatio(),shadowSize:art.sun.shadow.mapSize.x}),
          set:v=>{if('x'in v)x=v.x;if('z'in v)z=v.z;if('angle'in v)angle=v.angle;if('vx'in v)vx=v.vx;if('vz'in v)vz=v.vz;if('speed'in v)speed=v.speed;if('time'in v)time=v.time;if('health'in v)health=v.health;if('phase'in v)phase=v.phase;if('load'in v)load=v.load;if('impact'in v)impact=v.impact;if('cinematicTime'in v)cinematicTime=v.cinematicTime;routePhase=-1;},
          start,skipIntro,beginPlaying,pause,reset,finish,showMenu,step,tick,render,setCamera,updateHud,planRoute,clearSegment,routeCue,blocked,applyQuality,keys,taxis,pedestrians,police,art,vehicle,scene,camera};`;
        let source=fs.readFileSync(root+'/game.js','utf8').replace(/requestAnimationFrame\(tick\)/g,'if(!window.__freeze)requestAnimationFrame(tick)').replace(/\}\)\(\);\s*$/,expose+'})();');
        await call('Fetch.fulfillRequest',{requestId,responseCode:200,responseHeaders:[{name:'Content-Type',value:'application/javascript'}],body:Buffer.from(source).toString('base64')});
      }else await call('Fetch.failRequest',{requestId,errorReason:'BlockedByClient'});
    }
  });
  const check=(name,value)=>{assert.ok(value,name);checks.push(name);};
  const metrics=async(w,h,mobile=false)=>{await call('Emulation.setDeviceMetricsOverride',{width:w,height:h,deviceScaleFactor:1,mobile});await call('Emulation.setTouchEmulationEnabled',{enabled:mobile,maxTouchPoints:5});};
  const shot=async name=>{await evaluate('window.__review.render(.016)');const r=await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});fs.writeFileSync(path.join(output,name+'.png'),Buffer.from(r.data,'base64'));};
  const load=async url=>{await call('Page.navigate',{url});for(let i=0;i<120;i++){if(await evaluate('!!window.__review'))break;await delay(100);}check('game initializes: '+url,await evaluate('!!window.__review'));await delay(250);await evaluate('window.__review.render(.016)');};
  try{
    await call('Page.enable');await call('Runtime.enable');await call('Page.addScriptToEvaluateOnNewDocument',{source:'window.__freeze=true;'});
    await call('Fetch.enable',{patterns:[{urlPattern:'*game.js'},{urlPattern:'https://*'}]});
    await metrics(1280,720);await load('file://'+root+'/index.html');await shot('after-menu-desktop');
    await evaluate("document.getElementById('sound').click();window.__review.start(true)");
    check('intro starts before mission',await evaluate("__review.snapshot().state==='cinematic'&&__review.snapshot().time===90"));
    await evaluate('__review.set({cinematicTime:3});__review.tick(performance.now());__review.setCamera(true)');await shot('after-intro-closeup');
    const paused=await evaluate("__review.pause();const a=__review.snapshot();__review.tick(performance.now()+200);const b=__review.snapshot();__review.pause();returnValue={frozen:a.cinematicTime===b.cinematicTime&&a.visualTime===b.visualTime,resumes:__review.snapshot().state==='cinematic'};returnValue");
    check('cinematic pause freezes and resumes',paused.frozen&&paused.resumes);
    await evaluate("Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'));delete document.hidden");
    check('hidden tab pauses cinematic',await evaluate('__review.snapshot().state==="paused"'));await evaluate('__review.pause()');
    await evaluate('__review.set({cinematicTime:6.99});__review.tick(performance.now()+250)');
    check('full intro preserves 90 seconds',await evaluate("__review.snapshot().state==='playing'&&__review.snapshot().time===90"));await shot('after-coast-desktop');
    await evaluate('__review.start(true);__review.tick(performance.now()+7100)');check('intro duration uses wall time at low FPS',await evaluate('__review.snapshot().state==="playing"&&__review.snapshot().time===90'));
    await evaluate('__review.start(true)');await call('Input.dispatchKeyEvent',{type:'keyDown',key:'Enter',code:'Enter'});await call('Input.dispatchKeyEvent',{type:'keyUp',key:'Enter',code:'Enter'});
    check('Enter skips intro without consuming time',await evaluate("__review.snapshot().state==='playing'&&__review.snapshot().time===90"));
    await evaluate('__review.start(true)');await call('Input.dispatchKeyEvent',{type:'keyDown',key:' ',code:'Space'});await call('Input.dispatchKeyEvent',{type:'keyUp',key:' ',code:'Space'});
    check('Space skips intro',await evaluate("__review.snapshot().state==='playing'"));
    await evaluate('__review.start(true);document.getElementById("skipIntro").click()');check('button skips intro',await evaluate("__review.snapshot().state==='playing'"));
    await evaluate('__review.start()');check('retry skips intro',await evaluate("__review.snapshot().state==='playing'"));
    const route=await evaluate("__review.set({x:-60,z:-80,angle:0,phase:1});const p=__review.planRoute({x:-60,z:-80},{x:76,z:100});({cue:__review.routeCue(),clear:p.slice(1).every((n,i)=>__review.clearSegment(p[i],n)),count:p.length})");
    check('route follows accessible street north instead of diagonal wall',route.cue==='↑'&&route.clear&&route.count>2);
    await evaluate('__review.taxis[0].stop=.8;__review.taxis[0].next=.01;__review.reset()');check('traffic timers reset',await evaluate('__review.taxis[0].stop===0&&__review.taxis[0].next===3'));
    await evaluate('__review.set({x:-28,z:-110,vx:0,vz:0});for(let i=0;i<54;i++)__review.step(.025)');check('pickup completes',await evaluate('__review.snapshot().phase===1'));
    await evaluate('__review.set({x:76,z:100,vx:0,vz:0,impact:1,health:100});for(let i=0;i<54&&__review.snapshot().state==="playing";i++)__review.step(.025)');check('delivery wins',await evaluate('__review.snapshot().state==="won"'));
    await evaluate('__review.tick(performance.now()+150)');await shot('after-result');
    await evaluate('__review.start();__review.set({x:76,z:100,phase:1,time:.01,health:100,load:1.29,impact:1,vx:0,vz:0});__review.step(.025)');check('time expiry overrides delivery',await evaluate('__review.snapshot().state==="lost"'));
    await evaluate('__review.start();__review.set({x:76,z:100,phase:1,time:60,health:0,load:1.29,impact:1,vx:0,vz:0});__review.step(.025)');check('zero health overrides delivery',await evaluate('__review.snapshot().state==="lost"'));
    await evaluate('__review.start();__review.pause();const before=__review.snapshot().time;__review.tick(performance.now()+250);window.pauseResult=before===__review.snapshot().time;__review.pause()');check('mission pause preserves time',await evaluate('window.pauseResult'));
    await evaluate("document.getElementById('quality').value='low';document.getElementById('quality').dispatchEvent(new Event('change'))");check('low quality sets ratio/shadows/panel',await evaluate('__review.snapshot().lowQuality&&__review.snapshot().pixelRatio===1&&__review.snapshot().shadowSize===512&&!__review.snapshot().panelOpen'));
    await evaluate("document.getElementById('quality').value='high';document.getElementById('quality').dispatchEvent(new Event('change'))");check('high quality restores shadows',await evaluate('__review.snapshot().shadowSize===1024&&!__review.snapshot().lowQuality'));
    const renderCounts=[];
    for(const [name,x,z,angle] of [['coast',-78,-112,0],['club',-28,-110,Math.PI/2],['hospital',76,100,0]]){
      await evaluate('__review.start()');
      if(name==='hospital')await evaluate('__review.set({x:-28,z:-110,vx:0,vz:0});for(let i=0;i<54;i++)__review.step(.025)');
      await evaluate(`__review.set({x:${x},z:${z},angle:${angle},time:90});__review.vehicle.group.position.set(${x},__review.art.groundHeight(${x},${z})+.04,${z});__review.vehicle.group.rotation.set(0,${angle},0);__review.setCamera(true);__review.updateHud()`);
      await shot('after-'+name+'-high');renderCounts.push({scene:name,quality:'high',...(await evaluate('__review.snapshot().render'))});
    }
    await metrics(1920,1080);await shot('after-desktop-1920');
    for(const [name,w,h] of [['portrait',390,844],['landscape',844,390]]){
      await metrics(w,h,true);await evaluate("document.getElementById('quality').value='auto';document.getElementById('quality').dispatchEvent(new Event('change'));__review.start();__review.setCamera(true);__review.updateHud()");await shot('after-mobile-'+name);
      const layout=await evaluate("(()=>{const r=document.getElementById('stage').getBoundingClientRect(),buttons=[...document.querySelectorAll('[data-key],#touchSiren')].map(b=>b.getBoundingClientRect());return {noOverflow:document.documentElement.scrollWidth<=innerWidth,controls:buttons.every(b=>b.x>=0&&b.right<=innerWidth&&b.y>=r.y&&b.bottom<=innerHeight),low:__review.snapshot().lowQuality,calls:__review.snapshot().render.calls}})()");
      check('mobile '+name+' controls fit and auto selects low',layout.noOverflow&&layout.controls&&layout.low);renderCounts.push({scene:name,quality:'low',calls:layout.calls});
      const touch=await evaluate("(()=>{const b=document.querySelector('[data-key=up]').getBoundingClientRect();return {x:b.x+b.width/2,y:b.y+b.height/2,scroll:scrollY}})()");
      await call('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:touch.x,y:touch.y,id:1}]});check('touch throttle '+name,await evaluate('__review.keys.up'));
      await call('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});check('touch cancellation releases throttle without scrolling '+name,await evaluate('!__review.keys.up&&scrollY==='+touch.scroll));
    }
    await call('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});await evaluate('__review.start(true)');check('reduced motion skips cinematic',await evaluate('__review.snapshot().state==="playing"'));
    await call('Emulation.setEmulatedMedia',{features:[]});
    check('offline music plays without SoundCloud',await evaluate('RosaTrackAudio.instance.active&&RosaTrackAudio.instance.local.timer!==null'));
    await metrics(1280,720,false);
    server=http.createServer((req,res)=>{const name=new URL(req.url,'http://localhost').pathname;const file=path.join(root,decodeURIComponent(name==='/'?'/index.html':name));if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}fs.readFile(file,(err,data)=>{if(err){res.writeHead(404).end();return;}res.setHeader('Content-Type',({'.js':'application/javascript','.html':'text/html','.css':'text/css','.png':'image/png'})[path.extname(file)]||'application/octet-stream');res.end(data);});});
    await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
    await load(base+'/index.html');await evaluate("document.getElementById('quality').value='low';document.getElementById('quality').dispatchEvent(new Event('change'))");await load(base+'/index.html');
    check('manual quality persists across HTTP reload',await evaluate('__review.snapshot().qualityPreference==="low"&&__review.snapshot().lowQuality'));
    await call('Page.navigate',{url:base+'/artifacts/character.html'});await delay(600);check('character study loads',await evaluate("document.getElementById('error').textContent===''") );
    const study=await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:true});fs.writeFileSync(path.join(output,'character-comparison.png'),Buffer.from(study.data,'base64'));
    await load(base+'/index.html');
    let benchmark=null;
    if(process.argv.includes('--benchmark')){
      await evaluate("document.getElementById('quality').value='high';document.getElementById('quality').dispatchEvent(new Event('change'));__review.start();__review.skipIntro();document.getElementById('driverToggle').click();document.getElementById('driverToggle').click()");
      benchmark=await evaluate(`new Promise(resolve=>{
        const points=[[-78,-110],[-60,-110],[0,-110],[0,-40],[60,-40],[60,30],[60,100],[0,100],[-60,100],[-60,-110],[-78,-110]],lengths=[];
        let total=0;for(let i=1;i<points.length;i++){const l=Math.hypot(points[i][0]-points[i-1][0],points[i][1]-points[i-1][1]);lengths.push(l);total+=l;}
        const start=performance.now(),samples=[],calls=[];let last=start;
        const ctx=__review.art.sun;const gl=document.getElementById('game').getContext('webgl2'),ext=gl?.getExtension('WEBGL_debug_renderer_info');
        const renderer=ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):'unknown';
        function frame(ms){const elapsed=ms-start;let distance=(elapsed*.012)%total,index=0;while(distance>lengths[index]&&index<lengths.length-1)distance-=lengths[index++];const t=distance/lengths[index],a=points[index],b=points[index+1],heading=Math.atan2(b[0]-a[0],b[1]-a[1]);
          __review.set({x:a[0]+(b[0]-a[0])*t,z:a[1]+(b[1]-a[1])*t,angle:heading,vx:Math.sin(heading)*12,vz:Math.cos(heading)*12,time:90,health:100});__review.tick(ms);
          samples.push(ms-last);last=ms;calls.push(__review.snapshot().render.calls);
          if(elapsed<60000)requestAnimationFrame(frame);else{samples.shift();samples.sort((a,b)=>a-b);resolve({seconds:elapsed/1000,frames:samples.length,fps:samples.length/(elapsed/1000),frameMsMedian:samples[Math.floor(samples.length*.5)],frameMsP95:samples[Math.floor(samples.length*.95)],callsMin:Math.min(...calls),callsMax:Math.max(...calls),renderer,quality:'high',driverCamera:true});}
        }requestAnimationFrame(frame);
      })`);
    }
    for(const r of renderCounts)check('draw budget '+r.scene+' '+r.quality,r.calls<=(r.quality==='high'?300:150));
    const report={checks,renderCounts,benchmark,errors,environment:'Chrome headless / SwiftShader; mobile emulation, not physical-device FPS'};
    fs.writeFileSync(path.join(output,'verification.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
    if(errors.length)throw Error('Browser exceptions/shader errors: '+errors.length);
  }finally{server?.close();await call('Fetch.disable').catch(()=>{});if(chrome)await call('Browser.close').catch(()=>{});ws.close();chrome?.kill();}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
