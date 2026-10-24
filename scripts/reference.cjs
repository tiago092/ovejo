/* Extract the original simulation in memory. Never rewrite the published game. */
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'..'),source=fs.readFileSync(path.join(root,'game.js'),'utf8'),world=JSON.parse(fs.readFileSync(path.join(root,'artifacts/godot/archive-v1/world.json')));
function fn(name){const start=source.indexOf('  function '+name+'(');if(start<0)throw Error(name);let end=source.indexOf('\n  function ',start+1);return source.slice(start,end<0?source.length:end);}
function context(){
 const c=vm.createContext({world,Math,JSON});
 vm.runInContext(`
 const noop=()=>{}, fake=()=>({position:{set:noop},rotation:{set:noop},userData:{walk:noop},visible:true});
 const $=()=>({classList:{remove:noop},textContent:''}),clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
 let seed=27; const rand=(a,b)=>{seed=(1664525*seed+1013904223)>>>0;return a+seed/4294967296*(b-a)};
 const walls=[...world.buildings,...world.obstacles].map(w=>({...w,w:w.w/2,d:w.d/2})),roadXs=world.road_x,roadZs=world.road_z,routeNodes=roadZs.flatMap(z=>roadXs.map(x=>({x,z})));
 const pedestrians=Array.from({length:30},(_,i)=>({g:fake(),club:i<18})),taxis=Array.from({length:5},(_,i)=>({g:fake(),z:roadZs[i%4]+(i%2?4:-4),dir:i%2?-1:1,speed:1.1+i*.15})),police={g:fake()};
 const pickup={x:-28,z:-110},hospital={x:76,z:100},keys={up:false,down:false,left:false,right:false};
 let phase=0,time=90,health=100,x=-78,z=-112,angle=0,vx=0,vz=0,speed=0,clock=0,cooldown=0,sirenLeft=0,impact=0,load=0,pedHits=0,bumps=0,state='playing',score=0,stars=0;
 let cinematicTime=0,cameraMode=0,sirenTick=0,policeTick=0,noticeTimer=0,reactionTime=0,hudTimer=0,routePhase=-1,manualPanel=false,panelOpen=false,lowQuality=false,soundOn=false;
 const updatePanel=noop,clearKeys=()=>Object.keys(keys).forEach(k=>keys[k]=false),groundHeight=()=>0,updateHud=noop,notice=noop,reaction=noop,beep=noop,reducedMotion={matches:true};
 const stretcher=fake(),marker=fake(),ring={material:{color:{set:noop}}},markerArrow={material:{color:{set:noop},emissive:{set:noop}}},buggy=fake(),vehicle={body:{position:{}},head:{rotation:{set:noop}}};
 function finish(win){state=win?'won':'lost';score=win?Math.max(0,Math.round(time*100+health*20+1500-pedHits*500)):0;stars=win?(pedHits===0&&health>=85?3:pedHits===0&&health>=50?2:1):0;}
 ${['blocked','closestNode','nextRouteNode','clearSegment','planRoute','reset','activateSiren','damage','updatePolice','step'].map(fn).join('\n')}
 function advance(raw){const dt=Math.min(raw,.25);time=Math.max(0,time-Math.max(0,raw-dt));let remaining=dt;while(remaining>0&&state==='playing'){const slice=Math.min(remaining,.025);step(slice);remaining-=slice;}}
 function snapshot(){return {state,phase,time,health,x,z,angle,vx,vz,speed,clock,cooldown,siren_left:sirenLeft,impact,load,ped_hits:pedHits,bumps,score,stars,police:Object.fromEntries(Object.entries(police).filter(([k])=>k!=='g')),pedestrians:pedestrians.map(p=>Object.fromEntries(Object.entries(p).filter(([k])=>k!=='g'))),carts:taxis.map(p=>Object.fromEntries(Object.entries(p).filter(([k])=>k!=='g')))};}
 reset();`,c);return c;
}
const cases=[];
for(const hz of [30,60,120])for(const name of ['accelerate','brake','reverse','turn','wall','siren']){
 const c=context(),frames=hz*10,actions=[];
 // Avoid incidental collisions for maneuver comparisons; use real walls in collision case.
 const setup=name==='wall'?{x:-60,z:-115,angle:Math.PI/2}:{x:-78,z:-110,angle:0};
 vm.runInContext(Object.entries(setup).map(([k,v])=>`${k}=${v}`).join(';'),c);
 for(let i=0;i<frames;i++){
  const t=i/hz,keys={up:name!=='reverse'&&(name!=='brake'||t<3),down:name==='reverse'||(name==='brake'&&t>=3),left:name==='turn'&&t>1,right:false};
  const siren=name==='siren'&&i===hz;
  actions.push({dt:1/hz,keys,siren});
  vm.runInContext(`Object.assign(keys,${JSON.stringify(keys)});${siren?'activateSiren();':''}if(state==='playing')advance(${1/hz});`,c);
 }
 cases.push({name:`${name}-${hz}`,setup,actions,expected:vm.runInContext('snapshot()',c)});
}
const out=path.join(root,'godot/tests/archive-v1/reference.json');fs.writeFileSync(out,JSON.stringify({source_sha256:require('node:crypto').createHash('sha256').update(source).digest('hex'),cases})+'\n');console.log(`Saved ${cases.length} original-engine traces`);
