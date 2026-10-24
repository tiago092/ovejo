const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../../godot/web/host.js'),'utf8');
function host(blocked=false,initial={}){
 const storage=new Map([['codigo-rosa-quality','low'],['codigo-rosa-3d-best','4321'],...Object.entries(initial)]),events={},nodes={},messages=[],widgetEvents={};let plays=0,pauses=0;
 const element=id=>nodes[id]??=( {src:'',textContent:'',handlers:{},addEventListener(type,fn){this.handlers[type]=fn}});
 const widget={bind:(type,fn)=>widgetEvents[type]=fn,play:()=>plays++,pause:()=>pauses++,seekTo:()=>{}};
 const Widget=()=>widget;Widget.Events={READY:'ready',PLAY:'play',PAUSE:'pause',ERROR:'error',FINISH:'finish'};
 const context={JSON,Number,Math,Array,parseFloat,getComputedStyle:()=>({paddingTop:"0px",paddingRight:"0px",paddingBottom:"0px",paddingLeft:"0px"}),devicePixelRatio:2,matchMedia:()=>({matches:false,addEventListener(){}}),localStorage:{getItem:key=>{if(blocked)throw Error('denied');return storage.get(key)??null},setItem:(k,v)=>{if(blocked)throw Error('denied');storage.set(k,v)}},document:{hidden:false,getElementById:element,addEventListener:(key,fn)=>events[key]=fn,createElement:()=>({}),head:{append(){}}},SC:{Widget},addEventListener:(key,fn)=>events[key]=fn};context.window=context;vm.createContext(context);vm.runInContext(source,context);context.RosaHost.connectGame(json=>messages.push(JSON.parse(json)),false);
 return {context,storage,events,nodes,messages,widgetEvents,get plays(){return plays},get pauses(){return pauses}};
}
const checks=[];function check(name,fn){fn();checks.push({name,passed:true})}
let h=host();
check('import legacy preferences without mixing records',()=>{assert.equal(JSON.parse(h.context.RosaHost.preferences()).best,0);assert.equal(JSON.parse(h.context.RosaHost.preferences()).legacy_best,4321);assert.equal(JSON.parse(h.context.RosaHost.preferences()).quality,'low');assert.equal(h.storage.get('codigo-rosa-3d-best'),'4321')});
check('release has no test API',()=>assert.equal(h.context.__rosa,undefined));
check('save versioned preferences',()=>{h.context.RosaHost.save(JSON.stringify({best:5000,quality:'high'}));assert.equal(JSON.parse(h.storage.get('codigo-rosa-godot-v2')).version,2)});
check('widget readiness cannot start music without active game',()=>{h.widgetEvents.ready();assert.equal(h.plays,0)});
check('active widget replaces local music only after PLAY',()=>{h.context.RosaHost.music(true);assert.equal(h.plays,1);assert.equal(h.messages.length,0);h.widgetEvents.play();assert.deepEqual(h.messages.at(-1),{type:'audio',playing:true})});
check('repeated audio synchronization does not restart song',()=>{h.context.RosaHost.music(true);assert.equal(h.plays,1)});
check('widget failure selects fallback',()=>{h.widgetEvents.error();assert.deepEqual(h.messages.at(-1),{type:'audio',playing:false})});
check('late PLAY after mute is rejected',()=>{h.context.RosaHost.music(false);const before=h.pauses;h.widgetEvents.play();assert.ok(h.pauses>before);assert.equal(h.messages.at(-1).playing,false)});
check('late READY and FINISH cannot restart paused music',()=>{const before=h.plays;h.widgetEvents.ready();h.widgetEvents.finish();assert.equal(h.plays,before)});
check('visibility emits pause',()=>{h.context.document.hidden=true;h.events.visibilitychange();assert.equal(h.messages.at(-1).type,'hidden')});
check('touch cancellation releases input',()=>{h.events.touchcancel();assert.equal(h.messages.at(-1).type,'release')});
check('blocked storage retains session preferences',()=>{h=host(true);h.context.RosaHost.save(JSON.stringify({quality:'low',best:99}));assert.equal(JSON.parse(h.context.RosaHost.preferences()).best,99)});
check('v1 imports preferences and preserves original record',()=>{h=host(false,{'codigo-rosa-godot-v1':JSON.stringify({version:1,quality:'high',best:7777,muted:true,reduced:true,reduced_explicit:true})});const p=JSON.parse(h.context.RosaHost.preferences());assert.equal(p.best,0);assert.equal(p.legacy_best,7777);assert.equal(p.muted,true);assert.equal(p.reduced,true);assert.equal(JSON.parse(h.storage.get('codigo-rosa-godot-v1')).best,7777)});
check('existing v2 record survives reload',()=>{h=host(false,{'codigo-rosa-godot-v2':JSON.stringify({version:2,quality:'low',best:2500,legacy_best:7777})});const p=JSON.parse(h.context.RosaHost.preferences());assert.equal(p.best,2500);assert.equal(p.legacy_best,7777)});
check('corrupt v2 storage recovers v1 settings',()=>{h=host(false,{'codigo-rosa-godot-v2':'broken','codigo-rosa-godot-v1':JSON.stringify({quality:'low',best:400})});assert.equal(JSON.parse(h.context.RosaHost.preferences()).legacy_best,400)});
fs.writeFileSync(path.join(__dirname,'../../artifacts/godot/host.json'),JSON.stringify({checks,passed:true},null,2)+'\n');console.log('Web host:',checks.length,'checks PASSED');
