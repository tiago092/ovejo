const fs=require('node:fs'),path=require('node:path');
(async()=>{
 const ws=new WebSocket('ws://127.0.0.1:9229/session');await new Promise((r,j)=>{ws.onopen=r;ws.onerror=j});let seq=0;const pending=new Map(),events=[];
 ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.id){const p=pending.get(m.id);pending.delete(m.id);m.type==='error'?p.reject(Error(JSON.stringify(m))):p.resolve(m.result);}else events.push(m)};
 const call=(method,params={})=>new Promise((resolve,reject)=>{const id=++seq;pending.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params}))});
 const sleep=ms=>new Promise(r=>setTimeout(r,ms));
 try{
 const session=await call('session.new',{capabilities:{}});console.log('Firefox session',session.capabilities.browserVersion);
 await call('session.subscribe',{events:['log.entryAdded']});
 const tree=await call('browsingContext.getTree');const context=tree.contexts[0].context;
 await call('browsingContext.setViewport',{context,viewport:{width:1280,height:720},devicePixelRatio:1});
 await call('browsingContext.navigate',{context,url:process.env.GODOT_TEST_URL||'http://127.0.0.1:8767/dist/godot-test/index.html',wait:'complete'});
 const evaluate=async expression=>{const r=await call('script.evaluate',{expression,target:{context},awaitPromise:true});if(r.type==='exception')throw Error(JSON.stringify(r.exceptionDetails));return r.result?.value};
 let state;
 for(let i=0;i<60;i++){state=JSON.parse(await evaluate('JSON.stringify({ready:!!window.__rosa?.snapshot(),status:document.getElementById("loadText")?.textContent})'));if(state.ready)break;await sleep(1000)}
 if(state.ready){await evaluate('__rosa.command({command:"freeze",value:true});__rosa.command({command:"start"});true');await sleep(1000)}
 const screen=await call('browsingContext.captureScreenshot',{context});fs.writeFileSync(path.join(__dirname,'../artifacts/godot/firefox.png'),Buffer.from(screen.data,'base64'));
 const errors=events.filter(e=>e.method==='log.entryAdded'&&e.params.level==='error');
 fs.writeFileSync(path.join(__dirname,'../artifacts/godot/firefox.json'),JSON.stringify({version:session.capabilities.browserVersion,state,errors,passed:state.ready&&errors.length===0},null,2)+'\n');console.log({state,errors});
 await call('browsingContext.navigate',{context,url:'about:blank',wait:'complete'});await call('session.end');
 }finally{ws.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
