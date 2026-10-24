/* Build authoring geometry in memory to verify actual Three.js colliders, not a copied formula. */
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),THREE=require('../vendor/three.min.js');
function canvas(){const gradient={addColorStop(){}};const context=new Proxy({measureText:text=>({width:text.length*24}),createLinearGradient:()=>gradient,createRadialGradient:()=>gradient},{get:(target,key)=>key in target?target[key]:(()=>{}),set:(target,key,value)=>(target[key]=value,true)});return {width:512,height:512,getContext:()=>context};}
const context=vm.createContext({THREE,document:{createElement:canvas},window:{},Math,console});vm.runInContext(fs.readFileSync(path.join(root,'visuals.js'),'utf8'),context);
const art=context.window.RosaVisuals.createWorld(new THREE.Scene()),data=JSON.parse(fs.readFileSync(path.join(root,'godot/data/world.json')));
const walls=art.walls.map(({x,z,w,d,h})=>({x,z,w,d,h}));
assert.equal(JSON.stringify(walls),JSON.stringify([...data.buildings.map(b=>({x:b.x,z:b.z,w:b.w/2,d:b.d/2,h:b.h+3})),...data.obstacles.map(b=>({x:b.x,z:b.z,w:b.w/2,d:b.d/2,h:b.h}))]));
assert.equal(JSON.stringify(art.roadXs),JSON.stringify(data.road_x));assert.equal(JSON.stringify(art.roadZs),JSON.stringify(data.road_z));
const heights=[];for(const x of [-105,-94,-78,-60,0,60,117])for(const z of [-157,-110,-40,30,100,148])heights.push({x,z,height:art.groundHeight(x,z)});
fs.writeFileSync(path.join(root,'godot/tests/heights.json'),JSON.stringify(heights)+'\n');fs.writeFileSync(path.join(root,'artifacts/godot/layout.json'),JSON.stringify({passed:true,obstacles:walls.length,road_nodes:art.roadXs.length*art.roadZs.length,height_samples:heights.length,source_sha256:require('node:crypto').createHash('sha256').update(fs.readFileSync(path.join(root,'visuals.js'))).digest('hex')},null,2)+'\n');console.log('Actual Three.js layout matches Godot data:',walls.length,'obstacles,',heights.length,'height samples.');
