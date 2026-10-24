const fs=require('node:fs');
async function connect(){
 const endpoint=process.env.CHROME_DEBUG_URL||'http://127.0.0.1:9228';
 const pages=await fetch(endpoint+'/json/list').then(r=>r.json());
 const ws=new WebSocket(pages.find(p=>p.type==='page').webSocketDebuggerUrl);await new Promise((resolve,reject)=>{ws.onopen=resolve;ws.onerror=reject});
 let id=0;const pending=new Map(),messages=[];
 ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.id){const p=pending.get(m.id);pending.delete(m.id);m.error?p.reject(Error(JSON.stringify(m.error))):p.resolve(m.result);}else{messages.push(m);}};
 const call=(method,params={})=>new Promise((resolve,reject)=>{const n=++id;pending.set(n,{resolve,reject});ws.send(JSON.stringify({id:n,method,params}));});
 const evaluate=async(expression)=>{const r=await call('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value;};
 await call('Page.enable');await call('Runtime.enable');
 return {call,evaluate,messages,close:()=>ws.close(),sleep:ms=>new Promise(r=>setTimeout(r,ms)),shot:async path=>{const r=await call('Page.captureScreenshot',{format:'png'});fs.writeFileSync(path,Buffer.from(r.data,'base64'));}};
}
module.exports=connect;
if(require.main===module)(async()=>{const c=await connect();if(process.argv[2]==='navigate')await c.call('Page.navigate',{url:process.argv[3]});else if(process.argv[2]==='shot')await c.shot(process.argv[3]);else console.log(await c.evaluate(process.argv[2]));c.close();})().catch(e=>{console.error(e);process.exitCode=1});
