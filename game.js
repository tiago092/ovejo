/* Código Rosa — browser-only 3D arcade. Three.js r160; no remote assets. */
'use strict';
(() => {
const $ = id => document.getElementById(id), canvas = $('game'), stage = $('stage');
if (!window.THREE) { $('content').innerHTML='<h1 class="resultTitle">Falta el motor 3D.</h1><p>Descomprimí el ZIP completo y abrí index.html.</p>'; return; }
const T = THREE;
let renderer;
try { renderer = new T.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'}); }
catch(e) { $('content').innerHTML='<h1 class="resultTitle">Activá los gráficos 3D.</h1><p>Este juego necesita WebGL. Probá con Chrome o Firefox y la aceleración gráfica activada.</p>'; return; }
renderer.setPixelRatio(Math.min(devicePixelRatio || 1,1.7));renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.25;
renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;
const scene=new T.Scene();scene.background=new T.Color('#dfada0');scene.fog=new T.Fog('#dfada0',135,300);
const camera=new T.PerspectiveCamera(48,1,.1,230),driverCamera=new T.PerspectiveCamera(36,1,.06,180);
scene.add(new T.HemisphereLight('#b1dcff','#493142',1.7));const sun=new T.DirectionalLight('#ffd2a0',2.7);sun.position.set(-55,90,35);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-175,right:175,top:185,bottom:-185,near:1,far:300});sun.shadow.camera.updateProjectionMatrix();sun.shadow.bias=-.00008;sun.shadow.normalBias=.035;scene.add(sun);const fill=new T.DirectionalLight('#fba4d4',.8);fill.position.set(20,10,-20);scene.add(fill);
const materialCache=new Map(),boxGeo=new T.BoxGeometry(1,1,1),sphereGeo=new T.SphereGeometry(1,14,10);
function mat(color,emissive=false){const key=color+emissive;if(!materialCache.has(key))materialCache.set(key,new T.MeshStandardMaterial({color,roughness:.78,metalness:0,emissive:emissive?color:0,emissiveIntensity:emissive?.55:0}));return materialCache.get(key)}
// Small hand-drawn tile textures are generated locally, so the entire scene works offline.
function surface(kind){
 const c=document.createElement('canvas');c.width=c.height=256;const q=c.getContext('2d');
 const base={sand:'#ddc59b',lane:'#d0b68e',stucco:'#e8dbc4',roof:'#a86148',wood:'#a27654',sea:'#268f9b',leaf:'#397767'}[kind];
 q.fillStyle=base;q.fillRect(0,0,256,256);
 let seed={sand:21,lane:41,stucco:93,roof:71,wood:118,sea:37,leaf:56}[kind];
 const random=()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296};
 if(kind==='lane'){
  for(let row=0;row<8;row++)for(let col=-1;col<7;col++){
   const xx=col*44+(row%2)*22+random()*3,yy=row*33+random()*2;
   q.fillStyle='#a98f70';q.fillRect(xx,yy,42,31);
   q.fillStyle=['#d9c39c','#d4ba91','#c7ad86','#e0c9a3'][Math.floor(random()*4)];q.fillRect(xx+1.4,yy+1.4,39,28);
   q.fillStyle='#e8d5b0';q.fillRect(xx+4,yy+4,29,1);
  }
 }else if(kind==='roof'){
  for(let row=0;row<10;row++)for(let col=-1;col<9;col++){
   const xx=col*34+(row%2)*17,yy=row*27;
   q.fillStyle='#784536';q.fillRect(xx,yy,32,25);
   q.fillStyle=['#b76f4e','#ad664a','#c57a54','#9e5c45'][Math.floor(random()*4)];q.fillRect(xx+1,yy,30,22);
   q.fillStyle='#d89570';q.fillRect(xx+3,yy+2,23,2);
  }
 }else if(kind==='wood'){
  for(let row=0;row<12;row++){
   q.fillStyle=row%3?'#8e684d':'#bb906a';q.fillRect(0,row*22,256,2);
   for(let i=0;i<9;i++){q.fillStyle='#c69b72';q.fillRect(random()*250,row*22+4+random()*12,12+random()*30,1)}
  }
 }else if(kind==='sea'){
  for(let i=0;i<110;i++){q.fillStyle=i%3?'#60b8b7':'#b2d6c4';q.fillRect(random()*256,random()*256,8+random()*30,1+random()*2)}
 }
 const palette={sand:['#e9d5af','#c7ad87','#bca887'],lane:['#ae9675','#ead8b1','#bca281'],stucco:['#f5e9d6','#c6b19b','#d2bda8'],roof:['#db966b','#804c3b'],wood:['#b78a64','#6e503e'],sea:['#83cecb','#1d798b'],leaf:['#79a780','#275c56']}[kind];
 const count=kind==='stucco'?1800:kind==='sand'?2400:kind==='lane'?400:kind==='leaf'?1600:350;
 for(let i=0;i<count;i++){q.globalAlpha=.13+random()*.34;q.fillStyle=palette[Math.floor(random()*palette.length)];const size=.5+random()*(kind==='sand'?3:2);q.fillRect(random()*256,random()*256,size,size*(kind==='stucco'?2:1))}q.globalAlpha=1;
 const tx=new T.CanvasTexture(c);tx.colorSpace=T.SRGBColorSpace;tx.wrapS=tx.wrapT=T.RepeatWrapping;tx.anisotropy=4;return tx;
}
const surfaces=Object.fromEntries(['sand','lane','stucco','roof','wood','sea','leaf'].map(k=>[k,surface(k)]));
const plaster=new Map();function plasterMat(color){if(!plaster.has(color))plaster.set(color,new T.MeshStandardMaterial({color,map:surfaces.stucco,roughness:.97}));return plaster.get(color)}
const timber=new T.MeshStandardMaterial({map:surfaces.wood,roughness:.9}),clayRoof=new T.MeshStandardMaterial({map:surfaces.roof,roughness:.92});
function box(parent,x,y,z,w,h,d,color){const m=new T.Mesh(boxGeo,mat(color));m.position.set(x,y,z);m.scale.set(w,h,d);parent.add(m);return m}
function sphere(parent,x,y,z,sx,sy,sz,color){const m=new T.Mesh(sphereGeo,mat(color));m.position.set(x,y,z);m.scale.set(sx,sy,sz);parent.add(m);return m}
function rod(parent,a,b,r,color){const av=new T.Vector3(...a),bv=new T.Vector3(...b),direction=bv.clone().sub(av);const m=new T.Mesh(new T.CylinderGeometry(r,r,direction.length(),8),mat(color));m.position.copy(av.add(bv).multiplyScalar(.5));m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),direction.normalize());parent.add(m);return m}
function sign(parent,text,x,y,z,w,h,fg='#fff4f4',bg='#271d39'){const c=document.createElement('canvas');c.width=768;c.height=192;const q=c.getContext('2d');q.fillStyle=bg;q.fillRect(0,0,768,192);q.fillStyle=fg;q.font='900 75px Arial';q.textAlign='center';q.textBaseline='middle';q.fillText(text,384,104,735);const tx=new T.CanvasTexture(c);tx.colorSpace=T.SRGBColorSpace;const m=new T.Mesh(new T.PlaneGeometry(w,h),new T.MeshBasicMaterial({map:tx,side:T.DoubleSide}));m.position.set(x,y,z);parent.add(m);return m}
const world=new T.Group();scene.add(world);
function groundHeight(x,z){
 const coast=Math.max(0,Math.min(1,(x+94)/32));
 const hill=(cx,cz,rx,rz,height)=>height*Math.exp(-((x-cx)**2/rx**2+(z-cz)**2/rz**2));
 return coast*(hill(-25,-35,65,65,2.5)+hill(55,77,76,83,10)+hill(-70,-150,38,40,5));
}
function groundPatch(x0,x1,z0,z1,nx,nz,color,lift=0,kind='sand'){
 const vertices=[],indices=[],uvs=[];
 for(let iz=0;iz<=nz;iz++)for(let ix=0;ix<=nx;ix++){
  const xx=x0+(x1-x0)*ix/nx,zz=z0+(z1-z0)*iz/nz;
  vertices.push(xx,groundHeight(xx,zz)+lift,zz);
  uvs.push(xx/(kind==='lane'?9:17),zz/(kind==='lane'?9:17));
 }
 for(let iz=0;iz<nz;iz++)for(let ix=0;ix<nx;ix++){
  const a=iz*(nx+1)+ix,b=a+nx+1;indices.push(a,b,a+1,b,b+1,a+1);
 }
 const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(vertices,3));geo.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));geo.setIndex(indices);geo.computeVertexNormals();
 const mesh=new T.Mesh(geo,new T.MeshStandardMaterial({color,side:T.DoubleSide,roughness:1,map:surfaces[kind]}));mesh.receiveShadow=true;mesh.userData.noLift=true;world.add(mesh);return mesh;
}
groundPatch(-94,120,-165,155,54,80,'#f4e4be');
const waves=[];const sea=box(world,-280,-.3,0,370,.16,650,'#278e9e'),shore=box(world,-101,-.22,0,15,.1,340,'#6cc8c5');sea.userData.noLift=shore.userData.noLift=true;
const waterMap=surfaces.sea.clone();waterMap.repeat.set(14,25);waterMap.needsUpdate=true;sea.material=new T.MeshStandardMaterial({map:waterMap,color:'#bce2de',roughness:.35,metalness:.08});
for(let i=0;i<15;i++){const wave=box(world,-98-(i%3)*3,-.12,-165+i*24,.28,.025,17,'#d1ece1');wave.userData.noLift=true;waves.push(wave)}
const roadXs=[-60,0,60],roadZs=[-110,-40,30,100],walls=[];
for(const x of roadXs){groundPatch(x-6.6,x+6.6,-157,148,4,76,'#c0a484',.05);groundPatch(x-5.4,x+5.4,-157,148,4,76,'#f2dfb6',.09,'lane')}
for(const z of roadZs){groundPatch(-92,117,z-6.6,z+6.6,52,4,'#c0a484',.065);groundPatch(-92,117,z-5.4,z+5.4,52,4,'#f2dfb6',.10,'lane')}
// Narrow sandy lanes with irregular stone edging instead of broad city streets.
for(const x of roadXs)for(let z=-154;z<145;z+=4){box(world,x-5.8,.12,z,.65,.04,1.65,'#bca78d');box(world,x+5.8,.12,z+1,.65,.04,1.65,'#c8b79d')}
function building(x,z,w,d,h,color,label){
 const first=world.children.length;
 box(world,x,-.65,z,w+1.5,1.3,d+1.5,'#a78d75');
 const facade=box(world,x,h/2,z,w,h,d,color);facade.material=plasterMat(color);facade.castShadow=true;facade.receiveShadow=true;walls.push({x,z,w:w/2,d:d/2});
 const roof=new T.Mesh(new T.CylinderGeometry(0,1,1,4),clayRoof);roof.position.set(x,h+1.4,z);roof.rotation.y=Math.PI/4;roof.scale.set(w*.77,3,d*.77);roof.castShadow=true;world.add(roof);
 box(world,x,.45,z+d/2+.12,w,.7,.2,'#f4ead6');
 box(world,x,h-.12,z+d/2+.17,w,.25,.35,'#f3dfc0');
 for(let i=-w/2+3;i<w/2;i+=5){
  const px=x+i,fz=z+d/2;
  box(world,px,2.8,fz+.05,2.1,2.8,.14,'#f4ead6');box(world,px,2.8,fz+.14,1.6,2.3,.1,'#436e75');
  box(world,px,1.5,fz+.24,2.35,.13,.43,'#f5e9d6');
  box(world,px,2.8,fz+.24,.08,2.35,.09,'#dfc8a8');
  box(world,px-1.17,2.8,fz+.2,.24,2.5,.15,'#688f86');box(world,px+1.17,2.8,fz+.2,.24,2.5,.15,'#688f86');
 }
 const front=z+d/2;
 box(world,x,1.55,front+.28,2.6,3.1,.16,'#72584e');box(world,x,3.12,front+.33,3.5,.21,.55,'#f4ead6');
 box(world,x-.66,1.53,front+.38,.11,2.4,.08,'#d5aa7c');box(world,x+.66,1.53,front+.38,.11,2.4,.08,'#d5aa7c');
 const awning=box(world,x,4.6,front+1.3,8,.16,2.3,'#e1b078');awning.material=timber;
 for(const side of [-1,1]){rod(world,[x+side*3.7,0,front+2.1],[x+side*3.7,4.5,front+2.1],.065,'#ece0c4')}
 if(label)sign(world,label,x,h-.8,z+d/2+.2,Math.min(w-2,20),1.7,'#fff3d6','#487a72');
 for(let i=first;i<world.children.length;i++)world.children[i].userData.terrainAnchor={x,z};
}
for(let zi=0;zi<3;zi++)for(let xi=0;xi<2;xi++){const x=-30+xi*60,z=-75+zi*70;building(x,z,46,54,6+(xi+zi)%2,['#e8b67a','#7ebbb4','#d89483','#adc790'][(xi+zi)%4],['POUSADA DO MAR','AÇAÍ & COCO','VILA DO MORRO','ARTESANATO'][(xi+zi)%4])}
building(-30,-140,35,32,6,'#dbb98a','LUAU DO MORRO');sign(world,'SEGUNDA PRAIA',-30,2,-123.7,15,1.4,'#ffdbbd','#815870');const clubStrip=box(world,-30,1,-123.8,34,.15,.2,'#ff65b1');clubStrip.material=mat('#ff65b1',true);
for(const [xx,zz,color] of [[-43,-123,'#ff78b9'],[-17,-123,'#ffd394']]){const glow=new T.PointLight(color,14,28,2);glow.position.set(xx,groundHeight(xx,zz)+4,zz);scene.add(glow)}
building(85,135,42,36,7,'#ebddbf',null);const hs=sign(world,'POSTO DE SAÚDE',85,5.3,116.85,26,2.4,'#e5ffec','#38786c');hs.rotation.y=Math.PI;const h2=sign(world,'ATENDIMENTO 24H',85,2.8,116.8,16,1.4,'#d7ffe6','#38786c');h2.rotation.y=Math.PI;
for(const z of [-80,-10,60])building(96,z,26,35,6,'#e7ca94','POUSADA');
function palm(x,z){rod(world,[x,0,z],[x+.6,7,z],.2,'#aa8665');for(let i=0;i<7;i++){const a=i*Math.PI*2/7;const leaf=new T.Mesh(new T.SphereGeometry(1,7,5),new T.MeshStandardMaterial({map:surfaces.leaf,color:i%2?'#a3c299':'#84a988',roughness:1}));leaf.position.set(x+.6+Math.sin(a)*1.5,7.3,z+Math.cos(a)*1.5);leaf.scale.set(.42,.12,2.3);leaf.rotation.set(.27,a,0);world.add(leaf)}sphere(world,x+.6,7,z,.35,.36,.35,'#5d7351')}
for(const x of [-87,-73,13,73])for(const z of [-128,-58,12,82]){palm(x,z);if(x>-80){rod(world,[x+2,0,z+9],[x+2,4,z+9],.07,'#795b52');sphere(world,x+2,4,z+9,.27,.2,.27,'#ffe0a0')}}
// Beach umbrellas, loungers and a wooden promenade.
for(let i=0;i<9;i++){const z=-85+i*25,x=-86+(i%2)*3;rod(world,[x,0,z],[x,2.7,z],.07,'#d4bb8a');const cap=new T.Mesh(new T.ConeGeometry(1.7,.65,10),mat(i%2?'#eacb89':'#81b9b1'));cap.position.set(x,2.8,z);world.add(cap);box(world,x+1,.3,z+2,1,.2,2.1,'#f4dfb6')}
for(let z=-135;z<143;z+=1.6)box(world,-71,.16,z,3,.12,1.45,'#ab8768').material=timber;
// Coastal grass and flowering shrubs soften the long bare stretches beside the promenade.
const coastalLeaf=new T.MeshStandardMaterial({map:surfaces.leaf,color:'#a6c18e',roughness:1});
const coastalFlower=new T.MeshStandardMaterial({map:surfaces.leaf,color:'#edb4b3',roughness:1});
for(let i=0;i<130;i++){
 const zz=-151+(i*67%300),xx=-89+(i*37%13),size=.35+(i*19%7)*.1;
 const tuft=sphere(world,xx,.18,zz,size,.22,size,i%4?'#6f976f':'#cf91a2');tuft.material=i%4?coastalLeaf:coastalFlower;
}
// Stylised Farol do Morro on its green headland (scenic, non-navigable).
sphere(world,-78,0,-151,16,5,14,'#698b6b');sphere(world,-91,-.2,-160,12,5,16,'#6b8774');
const farol=new T.Group();farol.position.set(-77,4.3,-151);farol.scale.setScalar(.85);world.add(farol);const tower=new T.Mesh(new T.CylinderGeometry(1.4,2,10,18),mat('#f5e9d2'));tower.position.y=5;farol.add(tower);box(farol,0,10,0,3.4,.4,3.4,'#e9dcc4');const lantern=new T.Mesh(new T.CylinderGeometry(1.1,1.1,1.8,12),mat('#4b797e'));lantern.position.y=11;farol.add(lantern);const roof=new T.Mesh(new T.ConeGeometry(1.65,1.1,12),mat('#5b6767'));roof.position.y=12.4;farol.add(roof);sphere(farol,0,11,0,.65,.45,.65,'#fff1b5');sign(world,'FAROL DO MORRO',-77,3,-136,10,1.3,'#ffedc6','#477e76');walls.push({x:-78,z:-151,w:14,d:11});
// Decorative boats out at sea.
for(const zz of [-135,-75,25,105]){const boat=new T.Group();boat.position.set(-121,0,zz);world.add(boat);sphere(boat,0,0,0,1.6,.65,4,'#e8dcc1');box(boat,0,.55,0,2.4,.25,5,'#b58a69');rod(boat,[0,.5,0],[0,5,0],.065,'#c8b18b');const sail=new T.Mesh(new T.ConeGeometry(2,4,3),mat('#f5ead4'));sail.position.set(.4,3,0);sail.scale.z=.03;boat.add(sail)}
// Lantern strings above the beach party.
rod(world,[-46,4,-120],[-14,4,-120],.025,'#5d525b');for(let i=0;i<13;i++)sphere(world,-46+i*2.6,3.9,-120,.14,.2,.14,i%2?'#ffd6a0':'#ff9abc');
for(const object of world.children){if(object.userData.noLift)continue;const anchor=object.userData.terrainAnchor||object.position;object.position.y+=groundHeight(anchor.x,anchor.z)}
// Open yellow UTV, with the recognisable driver visible through the front cage.
const buggy=new T.Group();scene.add(buggy);const tires=[];
box(buggy,0,.65,0,2.7,.4,3.8,'#20222a');box(buggy,0,1.05,1.4,2.75,.52,1.25,'#efbf31');box(buggy,0,.88,2.05,2.2,.5,.16,'#292932');box(buggy,0,.54,2.23,2.85,.2,.25,'#191c22');box(buggy,0,.97,-1.38,2.5,.65,1.18,'#d9a825');box(buggy,0,1.45,-1.47,2.25,.38,.98,'#e9e3d8');box(buggy,0,1.65,-1.47,.14,.025,.65,'#dd4366');box(buggy,0,1.65,-1.47,.6,.025,.15,'#dd4366');
for(const x of [-1.48,1.48])for(const z of [-1.35,1.38]){const wheel=new T.Group();wheel.position.set(x,.58,z);const tire=new T.Mesh(new T.CylinderGeometry(.64,.64,.56,14),mat('#20232c'));tire.rotation.z=Math.PI/2;wheel.add(tire);const hub=new T.Mesh(new T.CylinderGeometry(.32,.32,.59,12),mat('#69727d'));hub.rotation.z=Math.PI/2;wheel.add(hub);for(let i=0;i<10;i++){const a=i*Math.PI/5;const tread=box(wheel,0,Math.sin(a)*.61,Math.cos(a)*.61,.6,.12,.17,'#30333a');tread.rotation.x=-a}buggy.add(wheel);tires.push(wheel)}
for(const x of [-1.18,1.18]){rod(buggy,[x,1,-1],[x,3.23,-1],.07,'#232735');rod(buggy,[x,1.25,.87],[x,3.23,.6],.07,'#232735');rod(buggy,[x,3.23,-1],[x,3.23,.6],.07,'#232735');box(buggy,x,1.1,-.1,.16,.37,1.6,'#e3b12b');box(buggy,x,1.52,.92,.28,.08,.42,'#212731')}
box(buggy,0,3.25,-.18,2.55,.14,1.95,'#242b33');box(buggy,0,3.52,.79,2.6,.52,.12,'#f4ece3');sign(buggy,'AMBULANCIA',0,3.52,.862,2.48,.43,'#cf3158','#f4ece3');box(buggy,0,3.35,0,.65,.18,.23,'#212735');const beaconA=box(buggy,-.18,3.48,0,.25,.18,.24,'#fb5878'),beaconB=box(buggy,.18,3.48,0,.25,.18,.24,'#73bbff');beaconA.material=mat('#fb5878',true);beaconB.material=mat('#73bbff',true);
for(const x of [-1,1]){const lamp=box(buggy,x,1.17,2.036,.52,.23,.07,'#ffffd5');lamp.material=mat('#ffffd5',true);box(buggy,x,.99,-1.98,.28,.17,.05,'#ef576f')}
for(const x of [-.62,.62]){box(buggy,x,1.04,-.18,.78,.22,.8,'#242836');const seat=box(buggy,x,1.53,-.57,.75,1,.19,'#252936');seat.rotation.x=-.14}
const driver=new T.Group();driver.position.set(-.6,0,-.1);buggy.add(driver);
box(driver,0,1.66,0,.74,.89,.42,'#f271b4');sphere(driver,0,1.91,.01,.44,.3,.24,'#f47cb9');box(driver,-.22,1.11,.22,.33,.28,.85,'#354150');box(driver,.22,1.11,.22,.33,.28,.85,'#354150');
const head=new T.Group();head.position.set(0,2.35,.06);driver.add(head);sphere(head,0,0,0,.39,.49,.35,'#c9977c');sphere(head,0,-.21,.20,.31,.24,.17,'#5b4543');sphere(head,0,-.15,.32,.24,.16,.095,'#b8816c');sphere(head,0,-.29,.34,.12,.10,.03,'#312b2e');
for(const x of [-.39,.39])sphere(head,x,-.02,0,.075,.13,.07,'#bd8a74');
for(let i=0;i<32;i++){const a=i*2.39996,r=.31*Math.sqrt((i+.5)/32);sphere(head,Math.sin(a)*r,.33+Math.sqrt(Math.max(0,.14-r*r))*.35,Math.cos(a)*r-.035,.105,.09,.095,'#26272f')}
for(const x of [-.35,.35])sphere(head,x,.18,-.025,.06,.2,.23,'#303037');
for(const x of [-.18,.18]){box(head,x,.06,.328,.34,.23,.08,'#1b202c');box(head,x,.065,.375,.27,.17,.017,'#293442');box(head,x-.045,.11,.389,.13,.018,.012,'#627d91')}box(head,0,.08,.385,.11,.04,.07,'#1a202a');
sphere(head,0,-.055,.397,.065,.12,.075,'#cf9b7f');sphere(head,0,-.13,.422,.085,.045,.07,'#d5a389');box(head,0,-.20,.374,.23,.045,.034,'#3b3032');box(head,0,-.244,.397,.16,.025,.018,'#925b59');
// A transparent portrait texture preserves the actual friend's likeness on the 3D driver.
if(window.ROSA_DRIVER_TEXTURE){
 head.children.forEach(part=>part.visible=false);
 sphere(head,0,.1,-.07,.30,.36,.19,'#282932');
 const portraitTexture=new T.TextureLoader().load(window.ROSA_DRIVER_TEXTURE);
 portraitTexture.colorSpace=T.SRGBColorSpace;
 const likeness=new T.Mesh(new T.PlaneGeometry(1.35,1.35*1214/1295),new T.MeshBasicMaterial({map:portraitTexture,transparent:true,alphaTest:.3,side:T.FrontSide}));
 likeness.position.set(0,-.16,.40);head.add(likeness);
}
// Arms and hands on the actual steering wheel.
rod(driver,[-.34,1.94,.03],[-.48,1.56,.3],.115,'#f47cb9');rod(driver,[-.48,1.56,.3],[-.26,1.69,.75],.085,'#c9977c');rod(driver,[.34,1.94,.03],[.46,1.56,.3],.115,'#f47cb9');rod(driver,[.46,1.56,.3],[.26,1.69,.75],.085,'#c9977c');sphere(driver,-.26,1.69,.75,.10,.10,.09,'#d0a088');sphere(driver,.26,1.69,.75,.10,.10,.09,'#d0a088');
const steering=new T.Mesh(new T.TorusGeometry(.32,.035,8,24),mat('#242730'));steering.position.set(-.6,1.68,.71);steering.rotation.x=-.4;buggy.add(steering);rod(buggy,[-.6,1.3,.8],[-.6,1.7,.75],.05,'#33353d');
const shadow=new T.Mesh(new T.CircleGeometry(2.2,32),new T.MeshBasicMaterial({color:'#161422',transparent:true,opacity:.35,depthWrite:false}));shadow.rotation.x=-Math.PI/2;shadow.position.y=.19;scene.add(shadow);
buggy.children.forEach(part=>{if(part.isMesh)part.castShadow=true});
// Characters and traffic are separate moving 3D objects.
function person(color){const g=new T.Group();box(g,0,.86,0,.42,.61,.26,color);sphere(g,0,1.35,0,.21,.24,.20,'#c99981');sphere(g,0,1.47,-.02,.22,.14,.2,'#342e3b');box(g,-.13,.35,0,.15,.52,.18,'#303342');box(g,.13,.35,0,.15,.52,.18,'#303342');box(g,-.29,.8,0,.13,.47,.16,color);box(g,.29,.8,0,.13,.47,.16,color);scene.add(g);return g}
const pedestrians=[];for(let i=0;i<30;i++){const g=person(['#dd88b5','#9dadd7','#e0bd7e','#75b4a9','#aa80c3'][i%5]);pedestrians.push({g,x:0,z:0,dx:0,dz:0,change:0,cool:0,club:i<18})}
const taxis=[];for(let i=0;i<5;i++){
 const g=new T.Group();box(g,0,.7,.1,1.2,.2,1.7,'#4598a6');box(g,0,.97,.1,1,.45,1.5,'#cf9264');box(g,-.25,1.37,.1,.5,.4,.7,'#784f75');box(g,.3,1.28,.3,.45,.25,.75,'#668f99');for(const xx of [-.54,.54]){sphere(g,xx,.27,.58,.13,.27,.27,'#343a43');rod(g,[xx,.7,-.6],[xx,.95,-1.5],.045,'#6b9c9e')}
 box(g,0,.9,-1.9,.5,.65,.3,'#7fb2bc');sphere(g,0,1.48,-1.9,.22,.25,.22,'#c99371');box(g,-.15,.34,-1.9,.16,.55,.18,'#515367');box(g,.15,.34,-1.9,.16,.55,.18,'#515367');rod(g,[-.26,1.12,-1.9],[-.54,.95,-1.5],.07,'#c99371');rod(g,[.26,1.12,-1.9],[.54,.95,-1.5],.07,'#c99371');
 scene.add(g);taxis.push({g,x:0,z:roadZs[i%4]+(i%2?4:-4),dir:i%2?-1:1,speed:1.1+i*.15,stop:0,next:3+i})}
// A fictional patrol car follows the buggy through the arcade version of the island.
const patrol=new T.Group();scene.add(patrol);
box(patrol,0,.72,0,2.45,.65,4.4,'#182944');
box(patrol,0,1.30,-.28,2.15,.83,2.34,'#ece8e0');
box(patrol,0,1.45,.93,1.85,.48,.08,'#426071');
box(patrol,0,1.45,-1.46,1.85,.48,.08,'#426071');
box(patrol,0,.83,2.20,2.50,.34,.17,'#f5eee5');
box(patrol,0,.75,-2.21,2.45,.36,.16,'#eae8e5');
for(const xx of [-1.13,1.13])for(const zz of [-1.38,1.38]){
 const wheel=new T.Mesh(new T.CylinderGeometry(.48,.48,.35,12),mat('#25252d'));
 wheel.rotation.z=Math.PI/2;wheel.position.set(xx,.5,zz);patrol.add(wheel);
}
for(const xx of [-.88,.88]){
 box(patrol,xx,1.04,2.30,.52,.22,.07,'#fff3d5').material=mat('#fff3d5',true);
 box(patrol,xx,.94,-2.30,.42,.16,.06,'#ef5d61').material=mat('#ef5d61',true);
}
sign(patrol,'POLÍCIA',0,1.88,1.20,1.70,.30,'#193653','#f6f2e8');
const redPatrol=box(patrol,-.40,1.81,-.35,.61,.22,.48,'#ed4863');
const bluePatrol=box(patrol,.40,1.81,-.35,.61,.22,.48,'#4f9df7');
redPatrol.material=redPatrol.material.clone();bluePatrol.material=bluePatrol.material.clone();
redPatrol.material.emissive.set('#ed4863');bluePatrol.material.emissive.set('#4f9df7');
const police={g:patrol,x:-60,z:-150,angle:0,speed:0,cool:0,waypoint:0,warning:false};
const routeNodes=roadZs.flatMap(zz=>roadXs.map(xx=>({x:xx,z:zz})));
function closestNode(px,pz){let best=0,d=Infinity;routeNodes.forEach((n,i)=>{const next=Math.hypot(px-n.x,pz-n.z);if(next<d){d=next;best=i}});return best}
function nextRouteNode(from,to){
 if(from===to)return from;
 const queue=[from],seen=new Set(queue),parent=new Map();
 for(let i=0;i<queue.length;i++){
  const node=queue[i],row=Math.floor(node/3),col=node%3;
  for(const n of [col>0?node-1:-1,col<2?node+1:-1,row>0?node-3:-1,row<3?node+3:-1]){
   if(n<0||seen.has(n))continue;
   seen.add(n);parent.set(n,node);queue.push(n);
  }
 }
 if(!seen.has(to))return from;
 let next=to;while(parent.get(next)!==from)next=parent.get(next);
 return next;
}
const pickup={x:-28,z:-110},hospital={x:76,z:100};
const marker=new T.Group();scene.add(marker);const ring=new T.Mesh(new T.RingGeometry(4.5,4.8,48),new T.MeshBasicMaterial({color:'#ff75b5',side:T.DoubleSide,transparent:true,opacity:.9}));ring.rotation.x=-Math.PI/2;ring.position.y=.2;marker.add(ring);const markerArrow=new T.Mesh(new T.ConeGeometry(.55,1.1,4),mat('#ff75b5',true));markerArrow.rotation.z=Math.PI;markerArrow.position.y=5;marker.add(markerArrow);
const stretcher=new T.Group();stretcher.position.set(pickup.x-2,0,pickup.z-4.5);scene.add(stretcher);box(stretcher,0,.75,0,.8,.2,1.8,'#dbf1df');rod(stretcher,[-.3,.1,-.6],[-.3,.7,-.6],.05,'#a4b4be');rod(stretcher,[.3,.1,.6],[.3,.7,.6],.05,'#a4b4be');box(stretcher,0,.94,.1,.58,.24,1.15,'#a3bccc');sphere(stretcher,0,1,-.58,.22,.18,.23,'#d4a287');
let state='intro',phase=0,time=90,health=100,speed=0,vx=0,vz=0,angle=0,x=-78,z=-112,clock=0,last=0,cooldown=0,sirenLeft=0,impact=0,load=0,pedHits=0,bumps=0,noticeTimer=0,cameraMode=0,soundOn=false,audio=null,music=null,soundPreferenceSet=false,sirenTick=0,policeTick=0,best=0;
const keys={up:false,down:false,left:false,right:false};const rand=(a,b)=>a+Math.random()*(b-a),clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
try{best=Number(localStorage.getItem('codigo-rosa-3d-best')||0)}catch{}if(best)$('record').textContent='RÉCORD '+best.toLocaleString('es-AR');
function ensureAudio(){if(audio)return true;try{audio=new(window.AudioContext||window.webkitAudioContext)();music=new RosaTrackAudio(audio);return true}catch{return false}}
function soundUI(){const button=$('sound');button.textContent='♫ Magalenha: '+(soundOn?'sí':'no');button.setAttribute('aria-pressed',String(soundOn))}
function beep(f=600,d=.13){if(!soundOn||!audio)return;const o=audio.createOscillator(),g=audio.createGain();o.frequency.value=f;g.gain.setValueAtTime(.035,audio.currentTime);g.gain.exponentialRampToValueAtTime(.001,audio.currentTime+d);o.connect(g);g.connect(audio.destination);o.start();o.stop(audio.currentTime+d)}
function clearKeys(){Object.keys(keys).forEach(k=>keys[k]=false)}
function notice(message){$('notice').textContent=message;$('notice').classList.add('visible');noticeTimer=3;$('announcement').textContent=message}
function reset(){phase=0;time=90;health=100;speed=0;vx=0;vz=0;angle=0;x=-78;z=-112;clock=0;cooldown=0;sirenLeft=0;impact=0;load=0;pedHits=0;bumps=0;cameraMode=0;$('cameraLabel').textContent='VISTA FRONTAL + CÁMARA DEL CONDUCTOR';clearKeys();for(let i=0;i<pedestrians.length;i++){const p=pedestrians[i];p.x=p.club?rand(-46,-13):roadXs[i%3]+rand(-5,5);p.z=p.club?rand(-121,-103):roadZs[i%4]+rand(-5,5);p.dx=rand(-1,1);p.dz=rand(-1,1);p.change=rand(1,4);p.cool=0;p.g.visible=true;p.g.position.set(p.x,groundHeight(p.x,p.z),p.z)}for(const t of taxis){t.x=rand(10,105);t.g.visible=true;t.g.position.set(t.x,groundHeight(t.x,t.z),t.z);t.g.rotation.y=t.dir*Math.PI/2}police.x=-60;police.z=-150;police.angle=0;police.speed=0;police.cool=0;police.waypoint=0;police.warning=false;police.g.position.set(police.x,groundHeight(police.x,police.z),police.z);police.g.rotation.y=0;police.g.visible=state!=='intro';stretcher.visible=true;stretcher.position.y=groundHeight(stretcher.position.x,stretcher.position.z);marker.position.set(pickup.x,groundHeight(pickup.x,pickup.z),pickup.z);ring.material.color.set('#ff75b5');markerArrow.material=mat('#ff75b5',true);buggy.position.set(x,groundHeight(x,z)+.05,z);buggy.rotation.y=angle;shadow.position.set(x,groundHeight(x,z)+.18,z);updateHud()}
function start(){if(!soundPreferenceSet){soundOn=ensureAudio();soundUI()}if(soundOn&&ensureAudio())music.play();reset();state='playing';police.g.visible=true;document.body.classList.remove('introMode');$('overlay').hidden=true;canvas.focus();notice('Frená en Segunda Praia para recoger al paciente');beep();setCamera(true)}
function activateSiren(){if(state!=='playing'||cooldown>0)return;cooldown=7;sirenLeft=2.2;sirenTick=0;notice('¡Paso al buggy!')}
function changeCamera(){cameraMode=(cameraMode+1)%2;$('cameraLabel').textContent=cameraMode?'VISTA DE SEGUIMIENTO + CÁMARA DEL CONDUCTOR':'VISTA FRONTAL + CÁMARA DEL CONDUCTOR';setCamera(true)}
function pause(){if(state==='playing'){state='paused';music?.stop();clearKeys();$('portraitCard').hidden=true;$('content').innerHTML='<div class="eyebrow">TURNO EN PAUSA</div><h1 class="resultTitle">Hasta el caos<br><em>necesita un respiro.</em></h1><p class="brief">WASD / flechas: acelerar, frenar y girar.<br>Espacio: sirena. C: cambiar cámara.<br>Frená en el círculo para recoger o entregar.</p><button class="primary" id="resume">VOLVER AL VOLANTE →</button>';$('overlay').hidden=false;$('resume').onclick=pause;$('resume').focus()}else if(state==='paused'){state='playing';if(soundOn)music?.play();$('overlay').hidden=true;canvas.focus()}}
function finish(win){state=win?'won':'lost';music?.stop();clearKeys();const score=win?Math.max(0,Math.round(time*100+health*20+1500-pedHits*500)):0;const stars=win?(pedHits===0&&health>=85?3:pedHits===0&&health>=50?2:1):0;if(score>best){best=score;try{localStorage.setItem('codigo-rosa-3d-best',String(best))}catch{}$('record').textContent='RÉCORD '+best.toLocaleString('es-AR')}$('portraitCard').hidden=false;$('content').innerHTML='<div class="eyebrow">'+(win?'PACIENTE A SALVO':'FIN DEL TURNO')+'</div><h1 class="resultTitle">'+(win?'La remera rosa<br><em>salvó la noche.</em>':health<=0?'Era prestado…<br><em>y lo rompiste.</em>':'La noche terminó.<br><em>Tu turno también.</em>')+'</h1><div class="stars" aria-label="'+stars+' de 3 estrellas">'+('★'.repeat(stars)+'☆'.repeat(3-stars))+'</div><div class="resultStats"><div><small>PUNTOS</small><strong>'+score.toLocaleString('es-AR')+'</strong></div><div><small>CHOQUES</small><strong>'+bumps+'</strong></div><div><small>ATROPELLOS</small><strong>'+pedHits+'</strong></div></div><p class="brief">'+(win?'El paciente llegó. El buggy… más o menos.':'Soltá el acelerador antes de doblar y usá la sirena.')+'</p><button class="primary" id="again">OTRA VUELTA ↻</button>';$('overlay').hidden=false;$('again').onclick=start;$('again').focus();$('announcement').textContent=win?'Paciente a salvo. '+score+' puntos.':'Fin del turno';beep(win?880:120,.35)}
function blocked(px,pz,r=1.6){return (px< -93||px>117)||pz < -162||pz>151||walls.some(b=>Math.abs(px-b.x)<b.w+r&&Math.abs(pz-b.z)<b.d+r)}
function damage(amount,ped=false){if(impact>0)return;health=Math.max(0,health-amount);impact=1;if(ped){pedHits++;time=Math.max(0,time-8);notice('¡Cuidado con la gente! −8 segundos')}else{bumps++;notice('¡Choque! −'+amount+'% del buggy')}beep(100,.2)}
function updatePolice(dt){
 police.cool=Math.max(0,police.cool-dt);
 const toPlayer=Math.hypot(x-police.x,z-police.z);
 if(toPlayer>115){ // Keep the pursuit relevant when the player takes a long detour.
  const n=routeNodes[closestNode(x,z)];police.x=n.x;police.z=n.z-18;
  police.waypoint=closestNode(police.x,police.z);police.speed=0;
 }
 const at=routeNodes[police.waypoint];
 if(Math.hypot(police.x-at.x,police.z-at.z)<3.1){
  const targetNode=closestNode(x,z);
  police.waypoint=nextRouteNode(police.waypoint,targetNode);
 }
 const direct=Math.hypot(x-police.x,z-police.z)<17;
 const destination=direct?{x,z}:routeNodes[police.waypoint];
 let desired=Math.atan2(destination.x-police.x,destination.z-police.z);
 let delta=Math.atan2(Math.sin(desired-police.angle),Math.cos(desired-police.angle));
 police.angle+=clamp(delta,-1.75*dt,1.75*dt);
 const cruise=phase?17:14.5;
 const slow=clamp(Math.hypot(destination.x-police.x,destination.z-police.z)*1.8,4,cruise);
 police.speed+=(slow-police.speed)*Math.min(1,dt*2.2);
 let nx=police.x+Math.sin(police.angle)*police.speed*dt;
 let nz=police.z+Math.cos(police.angle)*police.speed*dt;
 if(!blocked(nx,nz,1.35)){police.x=nx;police.z=nz}
 else if(!blocked(nx,police.z,1.35))police.x=nx;
 else if(!blocked(police.x,nz,1.35))police.z=nz;
 else{police.speed=0;police.waypoint=closestNode(police.x,police.z)}
 police.g.position.set(police.x,groundHeight(police.x,police.z)+.02,police.z);police.g.rotation.y=police.angle;
 const distance=Math.hypot(x-police.x,z-police.z);
 if(distance<20&&!police.warning){police.warning=true;notice('¡La patrulla te sigue! Seguí hacia el paciente.')}
 if(distance<27&&soundOn){policeTick-=dt;if(policeTick<=0){beep(Math.floor(clock*3)%2?520:740,.10);policeTick=.8}}
 if(distance<3.5&&police.cool<=0&&impact<=0){
  police.cool=2.8;impact=1;bumps++;
  health=Math.max(0,health-12);time=Math.max(0,time-3);
  const dx=(x-police.x)/Math.max(distance,.1),dz=(z-police.z)/Math.max(distance,.1);
  vx+=dx*5;vz+=dz*5;police.x-=dx*3.8;police.z-=dz*3.8;
  police.g.position.set(police.x,groundHeight(police.x,police.z)+.02,police.z);
  notice('¡Te alcanzó la patrulla! −12% y −3 segundos');beep(170,.22);
 }
}
function step(dt){clock+=dt;time=Math.max(0,time-dt);cooldown=Math.max(0,cooldown-dt);sirenLeft=Math.max(0,sirenLeft-dt);impact=Math.max(0,impact-dt);noticeTimer-=dt;if(noticeTimer<=0)$('notice').classList.remove('visible');const turn=Number(keys.left)-Number(keys.right),drive=Number(keys.up)-Number(keys.down);let forward=vx*Math.sin(angle)+vz*Math.cos(angle);angle+=turn*1.85*clamp(Math.abs(forward)/5,0,1)*(forward<-.1?-1:1)*dt;forward+=drive*(drive<0&&forward>0?34:16)*dt;forward*=Math.exp(-(drive?.27:1.9)*dt);forward=clamp(forward,-7,24);const lateral=(vx*Math.cos(angle)-vz*Math.sin(angle))*Math.exp(-6*dt);vx=forward*Math.sin(angle)+lateral*Math.cos(angle);vz=forward*Math.cos(angle)-lateral*Math.sin(angle);speed=Math.hypot(vx,vz);const nx=x+vx*dt,nz=z+vz*dt;if(!blocked(nx,z))x=nx;else{if(speed>3)damage(12);vx*=-.4}if(!blocked(x,nz))z=nz;else{if(speed>3)damage(12);vz*=-.4}
updatePolice(dt);
for(const t of taxis){t.next-=dt;if(t.next<0){t.stop=rand(.2,1.3);t.next=rand(3,7)}t.stop=Math.max(0,t.stop-dt);t.x+=t.dir*t.speed*(t.stop>0?.05:1)*(sirenLeft>0&&Math.hypot(x-t.x,z-t.z)<20?.2:1)*dt;if(t.x>113)t.x=-85;if(t.x< -85)t.x=113;t.g.position.set(t.x,groundHeight(t.x,t.z),t.z);if(Math.abs(x-t.x)<2.4&&Math.abs(z-t.z)<1.7){damage(15);vx*=-.4;vz*=-.4;z+=z<t.z?-.5:.5}}
for(const p of pedestrians){p.cool=Math.max(0,p.cool-dt);p.change-=dt;if(p.change<=0){p.dx=rand(-1,1);p.dz=rand(-1,1);p.change=rand(1,3)}const d=Math.hypot(x-p.x,z-p.z);let dx=p.dx*.85,dz=p.dz*.85;if(d<5||(sirenLeft>0&&d<20)){dx=(p.x-x)/Math.max(d,.1)*(sirenLeft>0?5.3:2.6);dz=(p.z-z)/Math.max(d,.1)*(sirenLeft>0?5.3:2.6)}const px=p.x+dx*dt,pz=p.z+dz*dt;if(!blocked(px,pz,.4)){p.x=px;p.z=pz}else{p.dx=-p.dx;p.dz=-p.dz}p.g.position.set(p.x,groundHeight(p.x,p.z)+Math.abs(Math.sin(clock*7+p.x))*.05,p.z);p.g.rotation.y=Math.atan2(dx,dz);p.g.visible=p.cool<=0||Math.floor(clock*8)%2===0;if(d<1.65&&speed>3&&p.cool<=0&&impact<=0){damage(5,true);p.cool=2;vx*=.4;vz*=.4}}
const target=phase?hospital:pickup;if(Math.hypot(x-target.x,z-target.z)<4.6&&speed<2){load+=dt;if(load>=1.3){load=0;if(phase===0){phase=1;stretcher.visible=false;marker.position.set(hospital.x,groundHeight(hospital.x,hospital.z),hospital.z);ring.material.color.set('#d9fa79');markerArrow.material=mat('#d9fa79',true);notice('¡Paciente a bordo! Seguí el mapa hasta el puesto de salud.');beep(750,.2)}else{finish(true);return}}}else load=0;
if(sirenLeft>0){sirenTick-=dt;if(sirenTick<=0){beep(Math.floor(sirenLeft*6)%2?650:950,.17);sirenTick=.18}}const slope=(groundHeight(x+Math.sin(angle)*2,z+Math.cos(angle)*2)-groundHeight(x-Math.sin(angle)*2,z-Math.cos(angle)*2))/4;buggy.position.set(x,groundHeight(x,z)+.03+Math.sin(clock*15)*Math.min(speed*.002,.035),z);buggy.rotation.set(-Math.atan(slope)+Math.sin(clock*11)*Math.min(speed*.001,.02),angle,turn*clamp(speed/24,0,1)*.045);shadow.position.set(x,groundHeight(x,z)+.18,z);tires.forEach(t=>t.rotation.x+=forward*dt/.64);head.rotation.y=turn*.13;head.rotation.z=Math.sin(clock*8)*Math.min(speed*.002,.035);steering.rotation.z=-turn*.4;updateHud();if(time<=0||health<=0)finish(false)}
function routeCue(target){const start=closestNode(x,z),goal=closestNode(target.x,target.z),next=nextRouteNode(start,goal);const point=Math.hypot(x-target.x,z-target.z)<18||start===goal?target:routeNodes[next];const bearing=Math.atan2(point.x-x,point.z-z),relative=Math.atan2(Math.sin(bearing-angle),Math.cos(bearing-angle));return ['↑','↗','→','↘','↓','↙','←','↖'][(Math.round(relative/(Math.PI/4))+8)%8]}
function updateHud(){const seconds=Math.ceil(time);$('time').textContent=String(Math.floor(seconds/60)).padStart(2,'0')+':'+String(seconds%60).padStart(2,'0');$('time').classList.toggle('urgent',time<20);$('health').textContent=Math.ceil(health)+'%';$('healthFill').style.width=health+'%';$('healthFill').style.background=health<35?'#ff7189':'#d9fa79';$('phase').textContent=phase?'02 / TRASLADO':'01 / RESCATE';$('objective').textContent=phase?'Llevá al paciente al puesto de salud':'Recogé al paciente en Segunda Praia';$('siren').textContent=cooldown>0?Math.ceil(cooldown)+' s':'LISTA';const policeDistance=Math.round(Math.hypot(x-police.x,z-police.z));$('policeDistance').textContent=policeDistance+' m';$('policeDistance').classList.toggle('near',policeDistance<17);$('speed').firstElementChild.textContent=Math.round(speed*3.6);const target=phase?hospital:pickup;$('destination').textContent=load>0?(phase?'ENTREGANDO':'SUBIENDO')+' · '+Math.round(load/1.3*100)+'%':routeCue(target)+' '+(phase?'POSTO DE SAÚDE':'Segunda Praia')+' · '+Math.round(Math.hypot(x-target.x,z-target.z))+' m';drawMap()}
const mapCtx=$('map').getContext('2d');function drawMap(){const q=mapCtx,w=190,h=150;q.clearRect(0,0,w,h);const sx=w/240,sz=h/325;const p=(xx,zz)=>[(xx+120)*sx,(zz+165)*sz];q.fillStyle='#c0aa86';q.fillRect(0,0,w,h);q.fillStyle='#3598a3';q.fillRect(0,0,22,h);q.fillStyle='#e4cda6';roadXs.forEach(xx=>q.fillRect((xx+120)*sx-5.4*sx,0,10.8*sx,h));roadZs.forEach(zz=>q.fillRect(0,(zz+165)*sz-5.4*sz,w,10.8*sz));for(const b of walls){q.fillStyle='#9d826d';const a=p(b.x-b.w,b.z-b.d);q.fillRect(a[0],a[1],2*b.w*sx,2*b.d*sz)}const target=phase?hospital:pickup;const goal=closestNode(target.x,target.z);let node=closestNode(x,z);q.beginPath();q.moveTo(...p(x,z));q.lineTo(...p(routeNodes[node].x,routeNodes[node].z));for(let i=0;i<routeNodes.length&&node!==goal;i++){const next=nextRouteNode(node,goal);if(next===node)break;node=next;q.lineTo(...p(routeNodes[node].x,routeNodes[node].z))}q.lineTo(...p(target.x,target.z));q.strokeStyle='#d9fa79';q.lineWidth=2.7;q.setLineDash([5,3]);q.stroke();q.setLineDash([]);const t=p(target.x,target.z);q.fillStyle=phase?'#d9fa79':'#ff75b5';q.beginPath();q.arc(...t,5,0,Math.PI*2);q.fill();q.fillStyle='#efe4f1';q.font='8px monospace';q.fillText(phase?'SAÚDE':'2ª PRAIA',clamp(t[0]-15,2,140),t[1]-9);const patrolDot=p(police.x,police.z);q.fillStyle='#ee6777';q.beginPath();q.arc(...patrolDot,4,0,Math.PI*2);q.fill();const a=p(x,z);q.save();q.translate(...a);q.rotate(-angle);q.fillStyle='#fff';q.beginPath();q.moveTo(0,6);q.lineTo(-4,-4);q.lineTo(4,-4);q.closePath();q.fill();q.restore()}
const camPos=new T.Vector3(),camTarget=new T.Vector3(),tmp=new T.Vector3();
function setCamera(snap=false,dt=.016){const intro=state==='intro',offset=intro?new T.Vector3(8,6,14):cameraMode?new T.Vector3(0,12,-18):new T.Vector3(15,15,20);if(intro){const yaw=-.25;offset.applyAxisAngle(new T.Vector3(0,1,0),yaw)}offset.applyAxisAngle(new T.Vector3(0,1,0),angle);camPos.set(x,groundHeight(x,z),z).add(offset);if(snap)camera.position.copy(camPos);else camera.position.lerp(camPos,1-Math.exp(-dt*5));camTarget.set(x,groundHeight(x,z)+(intro?3:2),z);if(intro){camTarget.x-=2.5;camTarget.z+=.5}camera.lookAt(camTarget);buggy.updateMatrixWorld(true);driverCamera.position.copy(buggy.localToWorld(tmp.set(-.6,2.8,3.6)));driverCamera.lookAt(buggy.localToWorld(new T.Vector3(-.6,2.1,.1)))}
let cw=0,ch=0;
function render(dt){const w=stage.clientWidth,h=stage.clientHeight;if(w!==cw||h!==ch){cw=w;ch=h;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix()}setCamera(false,dt);renderer.setScissorTest(false);renderer.setViewport(0,0,w,h);renderer.render(scene,camera);
if(state!=='intro'){const frame=$('driverViewport').getBoundingClientRect(),base=stage.getBoundingClientRect();const left=frame.left-base.left,bottom=base.bottom-frame.bottom;if(frame.width>0){renderer.clearDepth();renderer.setScissorTest(true);renderer.setScissor(left,bottom,frame.width,frame.height);renderer.setViewport(left,bottom,frame.width,frame.height);driverCamera.aspect=frame.width/frame.height;driverCamera.updateProjectionMatrix();renderer.render(scene,driverCamera);renderer.setScissorTest(false)}}}
function tick(ms){const rawDt=(ms-last)/1000||0,dt=Math.min(rawDt,.25);last=ms;if(state==='playing'){time=Math.max(0,time-Math.max(0,rawDt-dt));let remaining=dt;while(remaining>0&&state==='playing'){const slice=Math.min(remaining,.025);step(slice);remaining-=slice;}}if(state==='intro'){clock+=dt;head.rotation.y=Math.sin(clock*.6)*.09}waves.forEach((wave,i)=>{wave.position.x=-98-(i%3)*3+Math.sin(ms*.001+i)*.6});markerArrow.position.y=4.5+Math.sin(ms*.003)*.4;markerArrow.rotation.y=ms*.001;beaconA.material.emissiveIntensity=Math.floor(ms/180)%2?1.5:.1;beaconB.material.emissiveIntensity=Math.floor(ms/180)%2?.1:1.5;redPatrol.material.emissiveIntensity=Math.floor(ms/210)%2?1.8:.06;bluePatrol.material.emissiveIntensity=Math.floor(ms/210)%2?.06:1.8;render(dt);requestAnimationFrame(tick)}
const keyMap={ArrowUp:'up',ArrowDown:'down',ArrowLeft:'left',ArrowRight:'right',w:'up',W:'up',s:'down',S:'down',a:'left',A:'left',d:'right',D:'right'};
window.addEventListener('keydown',e=>{if(keyMap[e.key]&&state==='playing'){e.preventDefault();keys[keyMap[e.key]]=true}if(e.code==='Space'&&state==='playing'){e.preventDefault();if(!e.repeat)activateSiren()}if(!e.repeat){if(e.key==='p'||e.key==='P'||e.key==='Escape')pause();if((e.key==='c'||e.key==='C')&&state!=='intro')changeCamera()}});window.addEventListener('keyup',e=>{if(keyMap[e.key])keys[keyMap[e.key]]=false});window.addEventListener('blur',()=>{clearKeys();if(state==='playing'&&document.activeElement?.id!=='trackPlayer')pause()});document.addEventListener('visibilitychange',()=>{if(document.hidden&&state==='playing')pause()});
for(const button of document.querySelectorAll('[data-key]')){button.addEventListener('pointerdown',e=>{e.preventDefault();if(state==='playing'){keys[button.dataset.key]=true;button.setPointerCapture(e.pointerId)}});const release=()=>keys[button.dataset.key]=false;button.addEventListener('pointerup',release);button.addEventListener('pointercancel',release);button.addEventListener('lostpointercapture',release)}
$('start').onclick=start;$('pause').onclick=pause;$('cameraButton').onclick=()=>{if(state!=='intro')changeCamera()};$('touchSiren').onclick=activateSiren;$('sound').onclick=()=>{soundPreferenceSet=true;soundOn=!soundOn;if(soundOn){soundOn=ensureAudio();if(soundOn&&state==='playing')music.play()}else music?.stop();soundUI()};
canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();if(state==='playing')pause();notice('Se interrumpieron los gráficos. Recargá la página para continuar.')});
document.body.classList.add('introMode');reset();taxis.forEach(t=>t.g.visible=false);setCamera(true);requestAnimationFrame(tick);
})();
