/* Código Rosa · local art, models and animation. Three.js r160. */
'use strict';
window.RosaVisuals = (() => {
  const T = THREE, clamp = T.MathUtils.clamp;
  const palette = { pink: '#ed5598', yellow: '#f8c62c', ink: '#23333c', skin: '#c9906b' };
  const geometries = {}, materials = new Map();
  const boxGeometry = (() => {
    const s = new T.Shape(), r = .09;
    s.moveTo(-.5+r,-.5);s.lineTo(.5-r,-.5);s.quadraticCurveTo(.5,-.5,.5,-.5+r);
    s.lineTo(.5,.5-r);s.quadraticCurveTo(.5,.5,.5-r,.5);s.lineTo(-.5+r,.5);
    s.quadraticCurveTo(-.5,.5,-.5,.5-r);s.lineTo(-.5,-.5+r);s.quadraticCurveTo(-.5,-.5,-.5+r,-.5);
    const g = new T.ExtrudeGeometry(s,{depth:.82,bevelEnabled:true,bevelSize:r,bevelThickness:r,bevelSegments:2,steps:1,curveSegments:3});
    g.translate(0,0,-.41);return g;
  })();
  const sphereGeometry = new T.SphereGeometry(1,20,14);
  const simpleBoxGeometry = new T.BoxGeometry(1,1,1), simpleSphereGeometry=new T.SphereGeometry(1,10,7);
  const cylinderGeometry = new T.CylinderGeometry(1,1,1,12);
  function material(color, options = {}) {
    const key = color+JSON.stringify(Object.fromEntries(Object.entries(options).map(([k,v])=>[k,v?.isTexture?v.uuid:v])));
    if (!materials.has(key)) materials.set(key,new T.MeshStandardMaterial({color,roughness:.78,...options}));
    return materials.get(key);
  }
  function mesh(parent,geometry,mat,x=0,y=0,z=0,sx=1,sy=1,sz=1) {
    const m = new T.Mesh(geometry,mat);m.position.set(x,y,z);m.scale.set(sx,sy,sz);parent.add(m);return m;
  }
  function simple(parent){for(let p=parent;p;p=p.parent)if(p.userData.simple)return true;return false;}
  function box(parent,x,y,z,w,h,d,color,options) { return mesh(parent,simple(parent)?simpleBoxGeometry:boxGeometry,material(color,options),x,y,z,w,h,d); }
  function sphere(parent,x,y,z,sx,sy,sz,color,options) { return mesh(parent,simple(parent)?simpleSphereGeometry:sphereGeometry,material(color,options),x,y,z,sx,sy,sz); }
  const axis = new T.Vector3(0,1,0), av = new T.Vector3(), bv = new T.Vector3();
  function connect(m,a,b,r) {
    av.fromArray(a);bv.fromArray(b);m.position.copy(av).add(bv).multiplyScalar(.5);
    bv.sub(av);m.scale.set(r,bv.length(),r);m.quaternion.setFromUnitVectors(axis,bv.normalize());return m;
  }
  function rod(parent,a,b,r,color,options) { return connect(mesh(parent,cylinderGeometry,material(color,options)),a,b,r); }
  function texture(draw,size=512) {
    const c=document.createElement('canvas');c.width=c.height=size;draw(c.getContext('2d'),size);
    const tx=new T.CanvasTexture(c);tx.colorSpace=T.SRGBColorSpace;tx.wrapS=tx.wrapT=T.RepeatWrapping;tx.anisotropy=4;return tx;
  }
  function label(parent,text,x,y,z,w,h,{fg='#fff4d9',bg='#245f60',mirror=false}={}) {
    const c=document.createElement('canvas');c.width=1024;c.height=192;const q=c.getContext('2d');
    q.fillStyle=bg;q.fillRect(0,0,1024,192);if(mirror){q.translate(1024,0);q.scale(-1,1);}
    q.fillStyle=fg;q.font='900 105px Arial';q.textAlign='center';q.textBaseline='middle';q.fillText(text,512,103,965);
    const tx=new T.CanvasTexture(c);tx.colorSpace=T.SRGBColorSpace;
    return mesh(parent,new T.PlaneGeometry(w,h),new T.MeshBasicMaterial({map:tx,side:T.DoubleSide}),x,y,z);
  }
  function seeded(seed=27) { return () => {seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;}; }

  // Keep object transforms as authoring/animation handles, render repeated pieces in batches.
  function batch(group,dynamic=false) {
    group.updateMatrixWorld(true);const buckets=new Map();
    group.traverse(o=>{if(!o.isMesh||o.isInstancedMesh||o.layers.mask!==1||o.material.transparent||o.userData.keep||Array.isArray(o.material))return;
      const colored=o.material.isMeshStandardMaterial&&!o.material.map&&!o.material.emissive.getHex()&&o.material.roughness===.78&&!o.material.metalness;
      const key=o.geometry.uuid+'/'+(colored?'flat-'+o.material.side:o.material.uuid);let b=buckets.get(key);
      if(!b){const mat=colored?o.material.clone():o.material;if(colored)mat.color.set('#ffffff');buckets.set(key,b={geometry:o.geometry,material:mat,colored,sources:[],cast:false,receive:false});}
      b.sources.push(o);b.cast ||= o.castShadow;b.receive ||= o.receiveShadow;
    });
    const out=new T.Group(), zero=new T.Matrix4().makeScale(0,0,0), inv=new T.Matrix4(), matrix=new T.Matrix4();
    const entries=[];
    for(const b of buckets.values()){
      const inst=new T.InstancedMesh(b.geometry,b.material,b.sources.length);inst.castShadow=b.cast;inst.receiveShadow=b.receive;
      if(dynamic){inst.instanceMatrix.setUsage(T.DynamicDrawUsage);inst.frustumCulled=false;}
      b.sources.forEach((o,i)=>{if(b.colored)inst.setColorAt(i,o.material.color);o.layers.set(3);});out.add(inst);entries.push({...b,inst});
    }
    group.add(out);
    function update(){group.updateMatrixWorld(true);inv.copy(group.matrixWorld).invert();
      for(const b of entries){b.sources.forEach((o,i)=>{let visible=true;for(let p=o;p&&p!==group;p=p.parent)visible &&= p.visible;
        b.inst.setMatrixAt(i,visible?matrix.multiplyMatrices(inv,o.matrixWorld):zero);});b.inst.instanceMatrix.needsUpdate=true;
        if(!dynamic){b.inst.computeBoundingBox();b.inst.computeBoundingSphere();}
      }
    }
    update();return {update,group:out};
  }

  function groundHeight(x,z) {
    const coast=clamp((x+94)/32,0,1);
    const hill=(cx,cz,rx,rz,h)=>h*Math.exp(-((x-cx)**2/rx**2+(z-cz)**2/rz**2));
    return coast*(hill(-25,-35,65,65,2.5)+hill(55,77,76,83,10)+hill(-70,-150,38,40,5));
  }
  function createWorld(scene) {
    const world=new T.Group();world.userData.simple=true;scene.add(world);const walls=[],roadXs=[-60,0,60],roadZs=[-110,-40,30,100];
    const rng=seeded(), noise=texture((q,s)=>{q.fillStyle='#e8dabd';q.fillRect(0,0,s,s);for(let i=0;i<7000;i++){q.fillStyle=i%2?'#c9b99d':'#fff0cf';q.globalAlpha=.12+rng()*.16;q.fillRect(rng()*s,rng()*s,1+rng()*2,1+rng()*2);}});
    const cobble=texture((q,s)=>{q.fillStyle='#af9f87';q.fillRect(0,0,s,s);for(let row=0;row<22;row++)for(let col=-1;col<13;col++){
      const x=col*43+(row%2)*21,y=row*24;q.fillStyle=['#d1c3a9','#e3d4b7','#c8b99f','#dac9aa'][Math.floor(rng()*4)];
      q.beginPath();q.roundRect(x+1,y+1,40,21,4);q.fill();q.fillStyle='#eee2c7';q.globalAlpha=.4;q.fillRect(x+6,y+3,28,1);q.globalAlpha=1;
    }});
    const timber=texture((q,s)=>{q.fillStyle='#b58b66';q.fillRect(0,0,s,s);for(let i=0;i<16;i++){q.fillStyle='#80624d';q.fillRect(0,i*32,s,2);for(let j=0;j<25;j++){q.fillStyle='#cfaa7f';q.fillRect(rng()*s,i*32+rng()*30,15+rng()*60,.8);}}});
    function patch(x0,x1,z0,z1,nx,nz,mat,lift=0,shore=false){
      const p=[],uv=[],indices=[];
      for(let iz=0;iz<=nz;iz++)for(let ix=0;ix<=nx;ix++){
        const z=z0+(z1-z0)*iz/nz;let x=x0+(x1-x0)*ix/nx;
        if(shore)x+=(1-ix/nx)*(Math.sin(z*.065)*1.2+Math.sin(z*.15)*.4);
        p.push(x,groundHeight(x,z)+lift,z);uv.push(x/4.5,z/4.5);
      }
      for(let iz=0;iz<nz;iz++)for(let ix=0;ix<nx;ix++){const a=iz*(nx+1)+ix,b=a+nx+1;indices.push(a,b,a+1,b,b+1,a+1);}
      const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();
      const m=mesh(world,g,mat);m.receiveShadow=true;return m;
    }
    const sand=new T.MeshStandardMaterial({color:'#ecdbb6',map:noise,roughness:1});
    const paving=new T.MeshStandardMaterial({color:'#e9dfca',map:cobble,roughness:.96});
    patch(-104,120,-170,160,45,72,sand,0,true);
    for(const x of roadXs)patch(x-5.4,x+5.4,-157,148,2,52,paving,.06);
    for(const z of roadZs)patch(-93,117,z-5.4,z+5.4,35,2,paving,.075);
    for(const x of roadXs)for(let z=-154;z<146;z+=3.4){
      if(roadZs.some(r=>Math.abs(z-r)<6.5))continue;
      for(const side of [-1,1])box(world,x+side*5.8,groundHeight(x+side*5.8,z)+.15,z,.55,.17,2.6,'#c9b89c');
    }
    for(let z=-135;z<143;z+=1.1){const m=box(world,-71,groundHeight(-71,z)+.13,z,3,.13,1.02,'#c5a17c');m.material=material('#d2b898',{map:timber});}
    const roofMat=material('#b87055',{map:noise}), wallMap=material('#fff1d6',{map:noise});
    const roofGeo=new T.BufferGeometry();roofGeo.setAttribute('position',new T.Float32BufferAttribute([
      -.5,0,-.5,.5,0,-.5,0,1,-.5, -.5,0,.5,0,1,.5,.5,0,.5,
      -.5,0,-.5,0,1,-.5,0,1,.5, -.5,0,-.5,0,1,.5,-.5,0,.5,
      .5,0,-.5,.5,0,.5,0,1,.5, .5,0,-.5,0,1,.5,0,1,-.5],3));roofGeo.computeVertexNormals();
    function building(x,z,w,d,h,color,title,style=0){
      const g=new T.Group();g.position.set(x,groundHeight(x,z),z);world.add(g);walls.push({x,z,w:w/2,d:d/2,h:h+3});
      box(g,0,h/2,0,w,h,d,color,{map:noise}).castShadow=true;
      box(g,0,.35,0,w+.3,.7,d+.3,'#e7d9be');mesh(g,roofGeo,roofMat,0,h-.05,0,w+2,2.4,d+2).castShadow=true;
      for(const side of [-1,1]){
        for(let pz=-d/2+4;pz<d/2-2;pz+=6){
          box(g,side*(w/2+.05),2.85,pz,.18,2.8,2.5,'#faf0d5');box(g,side*(w/2+.17),2.85,pz,.12,2.25,1.95,'#385e67');
          box(g,side*(w/2+.25),2.8,pz,.08,2.4,.09,'#d4ded0');box(g,side*(w/2+.25),2.8,pz,.08,.09,2.1,'#d4ded0');
          for(const shutter of [-1,1])box(g,side*(w/2+.2),2.8,pz+shutter*1.43,.15,2.5,.5,style%2?'#658c7e':'#82aaa0');
          box(g,side*(w/2+.2),h/2,pz+3,.2,h,.22,'#e8d2aa');
        }
        for(let px=-w/2+3.5;px<w/2-2;px+=6){
          box(g,px,2.85,side*(d/2+.05),2.5,2.8,.18,'#faf0d5');box(g,px,2.85,side*(d/2+.17),1.95,2.25,.12,'#385e67');
          box(g,px,2.8,side*(d/2+.25),.09,2.4,.08,'#d4ded0');box(g,px,2.8,side*(d/2+.25),2.1,.09,.08,'#d4ded0');
          for(const shutter of [-1,1])box(g,px+shutter*1.43,2.8,side*(d/2+.2),.5,2.5,.15,style%2?'#658c7e':'#82aaa0');
          box(g,px,1.4,side*(d/2+.32),2.8,.14,.6,'#e8d2aa');
        }
        box(g,0,1.6,side*(d/2+.12),2.8,3.2,.22,'#735951');
        const awning=box(g,0,4.55,side*(d/2+.9),9,.18,2.3,style%2?'#e6aa82':'#72a69a');awning.rotation.x=side*.12;
        for(const pole of [-1,1])rod(g,[pole*4.1,0,side*(d/2+1.7)],[pole*4.1,4.4,side*(d/2+1.7)],.065,'#e7ddbe');
      }
      if(title)label(g,title,0,h-.65,d/2+.3,Math.min(w-3,19),1.45);
      box(g,0,h-.2,0,w+.3,.25,d+.3,'#f0dfbf');
      return g;
    }
    const colors=['#e6b38a','#83b5aa','#db9d95','#b8c39b'];
    for(let zi=0;zi<3;zi++)for(let xi=0;xi<2;xi++)building(-30+xi*60,-75+zi*70,46,54,6+(xi+zi)%2,colors[(xi+zi)%4],['POUSADA DO MAR','AÇAÍ & COCO','VILA DO MORRO','ARTESANATO'][(xi+zi)%4],xi+zi);
    const club=building(-30,-140,35,32,6,'#dc9b94','LUAU DO MORRO');
    label(club,'ATÉ O SOL CHEGAR',0,3.5,16.38,14,.7,{bg:'#873b65',fg:'#ffdda9'});
    for(const x of [-14.5,14.5])box(club,x,2.65,16.25,.13,4.8,.2,'#ff65ad',{emissive:'#ff559b',emissiveIntensity:1.8});
    rod(club,[-16,5,19],[16,5,19],.025,'#5a4754');
    for(let i=0;i<17;i++)sphere(club,-16+i*2,4.75+Math.sin(i/16*Math.PI)*-.6,19,.16,.22,.16,i%2?'#ffc792':'#f98fbb',{emissive:i%2?'#ffbf73':'#ed589b',emissiveIntensity:1});
    const hospital=building(85,135,42,36,7,'#e8e1c8',null);
    const hs=label(hospital,'POSTO DE SAÚDE',0,5.3,-18.18,25,1.8);hs.rotation.y=Math.PI;
    const h2=label(hospital,'ATENDIMENTO 24H',0,3.1,-18.19,15,.85);h2.rotation.y=Math.PI;
    for(const z of [-80,-10,60])building(96,z,26,35,6,'#e9c991','POUSADA',1);
    // Curved palm fronds: a shared tapered ribbon instead of flattened spheres.
    const leafGeo=new T.BufferGeometry(),lp=[],li=[];
    for(let i=0;i<=12;i++){const t=i/12,w=Math.sin(Math.PI*t)*.52;for(const side of [-1,1])lp.push(side*w,Math.sin(t*Math.PI)*.55-t*t*.8,t*4.2);}
    for(let i=0;i<12;i++){const a=i*2;li.push(a,a+1,a+2,a+1,a+3,a+2);}leafGeo.setAttribute('position',new T.Float32BufferAttribute(lp,3));leafGeo.setIndex(li);leafGeo.computeVertexNormals();
    const leafMat=material('#4f8a68',{side:T.DoubleSide});const wind={value:0};
    leafMat.onBeforeCompile=s=>{s.uniforms.uWind=wind;s.vertexShader='uniform float uWind;\n'+s.vertexShader;s.vertexShader=s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\ntransformed.x += sin(uWind + position.z * 0.7) * position.z * 0.035;');};
    function palm(x,z,height=7){const g=new T.Group();g.position.set(x,groundHeight(x,z),z);world.add(g);
      for(let k=0;k<5;k++)rod(g,[k*.1,k*height/5,0],[(k+1)*.1,(k+1)*height/5,0],.19-k*.009,'#a98c67');
      for(let i=0;i<9;i++){const m=mesh(g,leafGeo,leafMat,.5,height,0);m.rotation.y=i*Math.PI*2/9;m.rotation.z=Math.sin(i*2)*.14;}
      for(let k=0;k<3;k++)sphere(g,.4+Math.sin(k*2)*.2,height-.1,Math.cos(k*2)*.2,.2,.25,.2,'#7c7950');
    }
    for(const x of [-87,-73,13,73])for(const z of [-128,-58,12,82])palm(x,z,6.5+rng()*2.5);
    for(let i=0;i<9;i++){const z=-85+i*25,x=-86+(i%2)*3,g=new T.Group();g.position.set(x,groundHeight(x,z),z);world.add(g);
      rod(g,[0,0,0],[0,2.7,0],.055,'#e3d6b5');mesh(g,new T.ConeGeometry(1.8,.65,12),material(i%2?'#dfb67e':'#6eb8b0'),0,2.8,0);
      const seat=box(g,1,.32,2,1.1,.15,2.4,'#f4e5c4');seat.rotation.x=-.1;
    }
    for(let i=0;i<140;i++){const z=-150+rng()*300,x=-90+rng()*12;
      sphere(world,x,groundHeight(x,z)+.22,z,.25+rng()*.35,.18+rng()*.2,.3+rng()*.35,i%5?'#749a6f':'#d79ca3');
    }
    sphere(world,-78,groundHeight(-78,-151),-151,16,5,14,'#7b9c78');walls.push({x:-78,z:-151,w:14,d:11,h:15});
    const farol=new T.Group();farol.position.set(-77,groundHeight(-77,-151)+4,-151);world.add(farol);
    mesh(farol,new T.CylinderGeometry(1.3,1.9,10,24),material('#f8eed5'),0,5,0).castShadow=true;
    box(farol,0,10,0,3.4,.4,3.4,'#ded6bc');mesh(farol,new T.CylinderGeometry(1.05,1.05,1.7,16),material('#598589'),0,11,0);
    mesh(farol,new T.ConeGeometry(1.65,1.1,16),material('#587478'),0,12.4,0);
    sphere(farol,0,11,.85,.45,.4,.1,'#ffeac0',{emissive:'#ffe1a4',emissiveIntensity:1});
    for(const z of [-135,-75,25,105]){const g=new T.Group();g.position.set(-123,-.05,z);world.add(g);
      sphere(g,0,0,0,1.5,.5,3.5,'#f2e7cb');rod(g,[0,.3,0],[0,5,0],.05,'#b89a71');
      const sail=new T.Shape();sail.moveTo(0,0);sail.lineTo(0,4);sail.lineTo(2.4,0);mesh(g,new T.ShapeGeometry(sail),material('#f3e8cb',{side:T.DoubleSide}),0,.8,0);
    }
    batch(world);
    // Infinite-looking dawn, rendered behind the playable world.
    const sky=new T.Mesh(new T.SphereGeometry(1,24,16),new T.ShaderMaterial({side:T.BackSide,depthWrite:false,vertexShader:'varying vec3 vDir;void main(){vDir=position;vec4 p=projectionMatrix*modelViewMatrix*vec4(position*400.0,1.0);gl_Position=p.xyww;}',fragmentShader:'varying vec3 vDir;void main(){vec3 d=normalize(vDir);float h=max(d.y,0.0);vec3 c=mix(vec3(1.0,.53,.32),vec3(.19,.49,.66),smoothstep(-.08,.42,h));float sun=pow(max(dot(d,normalize(vec3(-.65,.16,.35))),0.0),850.0);c+=vec3(1.0,.74,.35)*sun*.8;gl_FragColor=vec4(c,1.0);#include <tonemapping_fragment>\n#include <colorspace_fragment>}',fog:false}));
    sky.material.fragmentShader=sky.material.fragmentShader.replace(';#include',';\n#include');sky.renderOrder=-10;sky.frustumCulled=false;scene.add(sky);
    const waterTime={value:0};
    const water=new T.Mesh(new T.PlaneGeometry(850,850,1,1),new T.ShaderMaterial({uniforms:{uTime:waterTime},vertexShader:'varying vec3 vPos;void main(){vec4 p=modelMatrix*vec4(position,1.0);vPos=p.xyz;gl_Position=projectionMatrix*viewMatrix*p;}',fragmentShader:`uniform float uTime;varying vec3 vPos;
      void main(){float shore=-104.0+sin(vPos.z*.065)*1.2+sin(vPos.z*.15)*.4;float depth=max(shore-vPos.x,0.0);
      vec3 c=mix(vec3(.33,.76,.73),vec3(.055,.37,.47),smoothstep(0.0,155.0,depth));
      float rip=sin(vPos.x*2.3+sin(vPos.z*.73+uTime*.8))*sin(vPos.z*3.2+uTime*.55);
      c+=vec3(.12,.20,.15)*pow(max(rip,0.0),12.0);
      float foam=(1.0-smoothstep(.15,2.4,abs(depth-1.0-sin(uTime*1.2+vPos.z*.09)*.65)))*.7;
      c=mix(c,vec3(.91,.95,.83),foam);float glint=pow(max(rip,0.0),36.0)*exp(-pow((vPos.z-30.0)/85.0,2.0));c+=vec3(.8,.5,.2)*glint*.38;
      gl_FragColor=vec4(c,1.0);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
      }`}));water.rotation.x=-Math.PI/2;water.position.set(-380,-.12,0);scene.add(water);
    const sun=new T.DirectionalLight('#ffd5a7',2.5);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);Object.assign(sun.shadow.camera,{left:-35,right:35,top:35,bottom:-35,near:1,far:180});sun.shadow.bias=-.0003;sun.shadow.normalBias=.045;scene.add(sun,sun.target);
    scene.add(new T.HemisphereLight('#d2e8ed','#a2856b',1.6));
    const clubGlow=new T.PointLight('#ff639e',24,32,2);clubGlow.position.set(-30,groundHeight(-30,-123)+4,-123);scene.add(clubGlow);
    scene.fog=new T.Fog('#edc9b1',110,285);
    return {world,walls,roadXs,roadZs,sun,groundHeight,update(t,x,z){wind.value=t*.7;waterTime.value=t;sun.position.set(x-48,groundHeight(x,z)+48,z-40);sun.target.position.set(x,groundHeight(x,z),z);}};
  }

  let sunglassesEnvironment;
  function createSunglasses(){
    const glasses=new T.Group();glasses.name='Gafas de driver.png';glasses.position.set(0,.18,.40);glasses.rotation.x=-.055;
    if(!sunglassesEnvironment){
      sunglassesEnvironment=texture((q,s)=>{
        const sky=q.createLinearGradient(0,0,0,s);sky.addColorStop(0,'#536e79');sky.addColorStop(.40,'#a6b6b4');sky.addColorStop(.49,'#c2c0aa');sky.addColorStop(.52,'#344039');sky.addColorStop(1,'#142025');q.fillStyle=sky;q.fillRect(0,0,s,s);
        q.fillStyle='#25342f';for(let i=0;i<9;i++){const x=i*s/8;q.beginPath();q.moveTo(x-s*.055,s*.51);q.lineTo(x,s*(.30+(i%3)*.04));q.lineTo(x+s*.07,s*.51);q.fill();}
        q.fillStyle='#b2b4a6';q.fillRect(s*.06,s*.56,s*.88,s*.009);
      },128);
      sunglassesEnvironment.mapping=T.EquirectangularReflectionMapping;
    }
    const acetate=new T.MeshPhysicalMaterial({color:'#080a0d',roughness:.17,metalness:.04,clearcoat:1,clearcoatRoughness:.10,envMap:sunglassesEnvironment,envMapIntensity:.38});
    const glass=new T.MeshPhysicalMaterial({color:'#191411',roughness:.11,metalness:.14,clearcoat:1,clearcoatRoughness:.08,envMap:sunglassesEnvironment,envMapIntensity:.62});
    // Rounded rectangular lenses, tapered lower rims and a broad glossy acetate brow.
    // Mirror the paths themselves so the instanced vehicle never needs negative scales.
    function outline(side,inside=false){
      const p=inside?new T.Path():new T.Shape(),x=v=>v*side;
      if(inside){
        p.moveTo(x(-.132),.078);p.bezierCurveTo(x(-.055),.096,x(.065),.107,x(.143),.100);
        p.quadraticCurveTo(x(.164),.098,x(.159),.070);p.lineTo(x(.139),-.074);
        p.quadraticCurveTo(x(.136),-.099,x(.105),-.104);p.quadraticCurveTo(x(.025),-.118,x(-.087),-.102);
        p.quadraticCurveTo(x(-.118),-.098,x(-.126),-.070);p.lineTo(x(-.147),.047);p.quadraticCurveTo(x(-.151),.073,x(-.132),.078);
      }else{
        p.moveTo(x(-.148),.105);p.bezierCurveTo(x(-.064),.125,x(.065),.137,x(.164),.126);
        p.quadraticCurveTo(x(.190),.123,x(.184),.084);p.lineTo(x(.163),-.086);
        p.quadraticCurveTo(x(.158),-.123,x(.118),-.130);p.quadraticCurveTo(x(.025),-.147,x(-.101),-.128);
        p.quadraticCurveTo(x(-.141),-.121,x(-.149),-.083);p.lineTo(x(-.173),.061);p.quadraticCurveTo(x(-.180),.095,x(-.148),.105);
      }
      p.closePath();return p;
    }
    for(const side of [-1,1]){
      const front=new T.Group();front.position.set(side*.195,0,0);front.rotation.y=side*.15;glasses.add(front);
      const rim=outline(side);rim.holes.push(outline(side,true));
      mesh(front,new T.ExtrudeGeometry(rim,{depth:.025,bevelEnabled:true,bevelSize:.004,bevelThickness:.004,bevelSegments:3,curveSegments:12,steps:1}),acetate);
      const lensPath=outline(side,true),lens=new T.Shape();lens.curves=lensPath.curves;
      mesh(front,new T.ExtrudeGeometry(lens,{depth:.008,bevelEnabled:true,bevelSize:.002,bevelThickness:.002,bevelSegments:2,curveSegments:12,steps:1}),glass,0,0,.015);
      // Flat, wide temples with a bend behind the ears, as in the reference portrait.
      const arm=new T.Shape();arm.moveTo(0,.108);arm.lineTo(-.12,.091);arm.quadraticCurveTo(-.31,.071,-.39,.038);arm.quadraticCurveTo(-.44,.006,-.46,-.076);arm.lineTo(-.435,-.092);arm.quadraticCurveTo(-.415,-.026,-.378,-.008);arm.lineTo(-.12,.039);arm.lineTo(0,.048);arm.closePath();
      const armGeometry=new T.ExtrudeGeometry(arm,{depth:.019,bevelEnabled:true,bevelSize:.003,bevelThickness:.003,bevelSegments:2,curveSegments:8,steps:1});armGeometry.rotateY(-Math.PI/2);armGeometry.translate(.0095,0,0);
      const p=armGeometry.attributes.position;for(let i=0;i<p.count;i++)p.setX(i,p.getX(i)+side*clamp(-p.getZ(i)/.35,0,1)*.055);armGeometry.computeVertexNormals();
      mesh(glasses,armGeometry,acetate,side*.369,0,-.025);
    }
    const bridge=new T.CatmullRomCurve3([new T.Vector3(-.06,.057,.023),new T.Vector3(-.031,.078,.026),new T.Vector3(0,.069,.021),new T.Vector3(.031,.078,.026),new T.Vector3(.06,.057,.023)]);
    mesh(glasses,new T.TubeGeometry(bridge,18,.016,8,false),acetate);
    return glasses;
  }

  function createHead(){
    const group=new T.Group(),rng=seeded(81),positions=[],uvs=[],sideUvs=[],frontWeights=[],indices=[];
    // Cross-sections measured against the identity sheet: full cheeks and a broad,
    // softly squared jaw. All facial features belong to the same closed surface.
    // y, half width, forehead/cheek depth, back depth.
    const sections=[
      [-.55,0,.25,.0],[-.52,.12,.34,.07],[-.48,.24,.43,.15],
      [-.40,.35,.47,.23],[-.30,.412,.485,.28],[-.18,.448,.49,.32],
      [-.06,.46,.465,.35],[.06,.455,.445,.375],[.18,.443,.435,.39],
      [.30,.442,.448,.395],[.42,.43,.429,.38],[.52,.393,.38,.35],
      [.60,.30,.30,.28],[.66,.17,.18,.18],[.70,0,0,0]
    ];
    function section(y){
      let k=1;while(k<sections.length-1&&sections[k][0]<y)k++;
      const a=sections[k-1],b=sections[k],t=clamp((y-a[0])/(b[0]-a[0]),0,1);
      return a.map((v,i)=>T.MathUtils.lerp(v,b[i],t));
    }
    const bump=(x,y,cx,cy,sx,sy)=>Math.exp(-(((x-cx)/sx)**2)-(((y-cy)/sy)**2));
    function features(x,y){
      return .065*bump(x,y,0,.12,.073,.18) // nasal bridge
        +.10*bump(x,y,0,.015,.089,.073) // rounded nose tip
        +.035*bump(Math.abs(x),y,.079,-.027,.034,.043) // nose wings
        +.027*bump(x,y,0,-.17,.19,.075) // lips and muzzle
        +.045*bump(x,y,0,-.385,.24,.105); // broad chin
    }
    const rows=76,cols=96;
    for(let j=0;j<=rows;j++){
      const y=T.MathUtils.lerp(-.55,.70,j/rows),[,width,depth,back]=section(y);
      for(let i=0;i<=cols;i++){
        const theta=i/cols*Math.PI*2,c=Math.cos(theta),x=Math.sin(theta)*width;
        // Flatten cheek planes instead of stretching a spherical face texture.
        const z=j===0?.10:j===rows?0:c>=0?depth*Math.pow(c,.62)+features(x,y)*Math.pow(c,.5):-back*Math.pow(-c,.9);
        positions.push(x,y,z);uvs.push(323/1942+x*.239,.5+y*.625);
        sideUvs.push(.864-z*.32,.5+y*.625);
        frontWeights.push(c);
      }
    }
    // Rows run from chin to crown, so winding is the reverse of a polar sphere.
    for(let j=0;j<rows;j++)for(let i=0;i<cols;i++){const a=j*(cols+1)+i,b=a+cols+1;indices.push(a,a+1,b,a+1,b+1,b);}
    const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(positions,3));geo.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));geo.setAttribute('sideUv',new T.Float32BufferAttribute(sideUvs,2));geo.setAttribute('faceFront',new T.Float32BufferAttribute(frontWeights,1));geo.setIndex(indices);geo.computeVertexNormals();
    const smiling=positions.slice();
    for(let i=0;i<positions.length;i+=3){const x=positions[i],y=positions[i+1],z=positions[i+2];if(z>.2){const w=bump(Math.abs(x),y,.13,-.175,.072,.061);smiling[i+1]+=w*.022;smiling[i+2]+=w*.006;}}
    geo.morphAttributes.position=[new T.Float32BufferAttribute(smiling,3)];
    const faceMaterial=new T.MeshStandardMaterial({color:'#d69b7c',roughness:.96});
    if(window.ROSA_DRIVER_ATLAS){
      const tx=new T.TextureLoader().load(window.ROSA_DRIVER_ATLAS);tx.colorSpace=T.SRGBColorSpace;tx.anisotropy=4;faceMaterial.map=tx;faceMaterial.color.set('#ffffff');
      faceMaterial.onBeforeCompile=s=>{
        s.vertexShader='attribute vec2 sideUv; attribute float faceFront; varying vec2 vSideUv; varying float vFaceFront;\n'+s.vertexShader;
        s.vertexShader=s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvSideUv=sideUv;vFaceFront=faceFront;');
        s.fragmentShader='varying vec2 vSideUv; varying float vFaceFront;\n'+s.fragmentShader;
        s.fragmentShader=s.fragmentShader.replace('#include <map_fragment>',`
          vec4 frontColor=texture2D(map,vMapUv);
          vec2 sideUv=vec2(min(vSideUv.x,1878.0/1942.0),vSideUv.y);
          vec4 sideColor=texture2D(map,sideUv);
          // Remove the painted ear beneath the separate, textured 3D ear.
          float earMask=smoothstep(1638.0,1660.0,sideUv.x*1942.0)
            *(1.0-smoothstep(1748.0,1772.0,sideUv.x*1942.0))
            *smoothstep(.38,.42,sideUv.y)*(1.0-smoothstep(.59,.62,sideUv.y));
          vec4 cheekColor=texture2D(map,vec2(.22,.54));
          sideColor=mix(sideColor,cheekColor,earMask);
          float frontMix=smoothstep(.12,.72,vFaceFront);
          diffuseColor*=mix(sideColor,frontColor,frontMix);
        `);
      };
      faceMaterial.customProgramCacheKey=()=> 'rosa-identity-v2';
    }
    const face=mesh(group,geo,faceMaterial);face.castShadow=true;face.userData.keep=true;
    const neckGeo=new T.CylinderGeometry(.205,.245,.32,28),neckUv=neckGeo.attributes.uv,np=neckGeo.attributes.position;
    for(let i=0;i<np.count;i++)neckUv.setXY(i,323/1942+np.getX(i)*.239,.5+(np.getY(i)-.59)*.625);
    const skinMaterial=new T.MeshStandardMaterial({map:faceMaterial.map,color:faceMaterial.map?'#ffffff':'#d69b7c',roughness:.96});
    mesh(group,neckGeo,skinMaterial,0,-.59,-.035);
    for(const s of [-1,1]){
      const earGeo=new T.SphereGeometry(1,20,16),ep=earGeo.attributes.position,eu=earGeo.attributes.uv;
      for(let i=0;i<ep.count;i++)eu.setXY(i,(1709-ep.getZ(i)*53)/1942,1-(399-ep.getY(i)*85)/809);
      const ear=mesh(group,earGeo,skinMaterial,s*.457,.035,-.055,.058,.118,.067);ear.rotation.z=s*-.09;
    }
    // Short dense curls follow the skull, including temples and nape. A local
    // procedural curl pattern avoids projecting the atlas background onto hair.
    function scalpPoint(phi,theta){
      const c=Math.cos(theta),boundary=.12+.36*Math.max(c,0)-.36*Math.max(-c,0);
      const y=boundary+(.715-boundary)*Math.cos(phi),[,width,depth,back]=section(y),lift=.022*Math.sin(phi);
      return new T.Vector3(Math.sin(theta)*(width+lift),y,c>=0?(depth+features(0,y)+lift)*Math.pow(c,.62):-(back+lift)*Math.pow(-c,.9));
    }
    const hairTexture=texture((q,s)=>{
      q.fillStyle='#171310';q.fillRect(0,0,s,s);const random=seeded(93);
      for(let i=0;i<1600;i++){
        const x=random()*s,y=random()*s,r=2+random()*4;
        q.strokeStyle=i%3?'#26201b':'#382d23';q.lineWidth=.7+random();q.beginPath();q.ellipse(x,y,r,r*.62,random()*6,0,Math.PI*1.65);q.stroke();
      }
    },512);
    const scalpGeo=new T.SphereGeometry(1,48,24,0,Math.PI*2,0,Math.PI/2),p=scalpGeo.attributes.position;
    for(let i=0;i<p.count;i++){
      const phi=Math.acos(clamp(p.getY(i),0,1)),theta=Math.atan2(p.getX(i),p.getZ(i)),v=scalpPoint(phi,theta);p.setXYZ(i,v.x,v.y,v.z);
    }
    scalpGeo.computeVertexNormals();mesh(group,scalpGeo,new T.MeshStandardMaterial({map:hairTexture,roughness:.94}));
    const count=780,tufts=new T.InstancedMesh(new T.SphereGeometry(1,7,5),material('#ffffff',{roughness:.96}),count);
    const curls=new T.InstancedMesh(new T.TorusGeometry(.015,.006,5,9,Math.PI*1.7),material('#ffffff',{roughness:.9}),count),dummy=new T.Object3D(),color=new T.Color(),up=new T.Vector3(0,0,1),normal=new T.Vector3();
    for(let i=0;i<count;i++){
      const phi=Math.acos(1-(i+.5)/count),theta=i*2.39996323,v=scalpPoint(phi,theta),size=.018+rng()*.008;
      dummy.position.copy(v);dummy.rotation.set(rng()*3,rng()*3,rng()*3);dummy.scale.set(size,size*.8,size);dummy.updateMatrix();tufts.setMatrixAt(i,dummy.matrix);
      color.set('#1c1713').multiplyScalar(.7+rng()*.5);tufts.setColorAt(i,color);
      normal.set(v.x/.44,Math.cos(phi)*1.7,(v.z+.018)/.38).normalize();dummy.position.addScaledVector(normal,size*.6);dummy.quaternion.setFromUnitVectors(up,normal);dummy.rotateZ(rng()*6.28);dummy.scale.setScalar(.75+rng()*.5);dummy.updateMatrix();curls.setMatrixAt(i,dummy.matrix);
      color.set('#30271f').multiplyScalar(.6+rng()*.5);curls.setColorAt(i,color);
    }
    tufts.castShadow=true;curls.castShadow=true;group.add(tufts,curls);
    const glasses=createSunglasses();glasses.position.set(0,.162,.423);glasses.scale.set(1.075,1.035,1);group.add(glasses);
    group.userData={face,glasses};return group;
  }

  function createBuggy(){
    const group=new T.Group(), body=new T.Group();group.add(body);
    const tires=[],frontAxles=[],beacons=[],skin=palette.skin;
    box(body,0,.65,0,2.7,.42,3.9,palette.ink).castShadow=true;
    box(body,0,.97,-1.25,2.65,.75,1.5,palette.yellow).castShadow=true;
    const hood=box(body,0,1.15,1.43,2.8,.5,1.55,palette.yellow,{roughness:.33,metalness:.12});hood.rotation.x=.10;hood.castShadow=true;
    const grille=box(body,0,.86,2.16,2.4,.52,.15,'#202d33');grille.rotation.x=-.12;
    for(let i=0;i<7;i++)box(body,-.65+i*.215,.9,2.25,.1,.25,.05,'#3b4545');
    for(const s of [-1,1]){
      const lamp=box(body,s*.98,1.16,2.17,.56,.18,.08,'#f9f4d4',{emissive:'#fff4c7',emissiveIntensity:.35});lamp.rotation.z=-s*.14;
      box(body,s*1.2,1.13,-.1,.18,.58,1.7,palette.yellow);
      rod(body,[s*.97,.53,2.3],[s*.98,.8,2.47],.075,'#27343a');
      rod(body,[s*.98,.8,2.47],[s*.68,.86,2.53],.075,'#27343a');
      rod(body,[s*1.17,1.2,.8],[s*1.17,3.1,.45],.065,'#26383c');
      rod(body,[s*1.17,1.1,-1],[s*1.17,3.15,-1],.065,'#26383c');
      box(body,s*1.41,2.3,.58,.26,.32,.12,'#26383c');
      box(body,s*1.43,2.3,.65,.2,.25,.035,'#adcbd0',{metalness:.6,roughness:.15});
      box(body,s*.62,1.15,-.18,.84,.22,.85,'#36454a');const seat=box(body,s*.62,1.64,-.56,.84,1,.25,'#34474b');seat.rotation.x=-.12;
      box(body,s*.62,2.1,-.56,.6,.3,.23,'#34474b');
      box(body,s*.95,1,-2.06,.36,.17,.06,'#ec6d64',{emissive:'#e75856',emissiveIntensity:.25});
    }
    rod(body,[-.68,.86,2.53],[.68,.86,2.53],.075,'#27343a');
    box(body,0,3.17,-.24,2.65,.16,2.1,'#3b4d4d').castShadow=true;
    box(body,0,3.48,.6,2.72,.48,.16,'#fff3db');
    label(body,'AMBULÂNCIA',0,3.48,.69,2.56,.37,{fg:'#cf4382',bg:'#fff4df',mirror:true});
    const glass=box(body,0,2.24,.68,2.2,1.48,.025,'#b5e1df',{transparent:true,opacity:.10,roughness:.08,metalness:.1,depthWrite:false});glass.rotation.x=.18;
    rod(body,[-.83,1.57,.81],[-.18,1.91,.77],.012,'#405256');
    for(const s of [-1,1])for(const zz of [-1.35,1.38]){
      const axle=new T.Group();axle.position.set(s*1.43,.64,zz);body.add(axle);const wheel=new T.Group();axle.add(wheel);
      const tire=mesh(wheel,new T.CylinderGeometry(.65,.65,.51,24),material('#253136'));tire.rotation.z=Math.PI/2;tire.castShadow=true;
      const hub=mesh(wheel,new T.CylinderGeometry(.32,.32,.54,12),material('#788789',{metalness:.45,roughness:.4}));hub.rotation.z=Math.PI/2;
      const parts=new T.Group();wheel.add(parts);
      for(let i=0;i<15;i++){const a=i*Math.PI*2/15,t=box(parts,0,Math.sin(a)*.636,Math.cos(a)*.636,.54,.07,.18,'#344044');t.rotation.x=-a;}
      batch(parts);tires.push(wheel);if(zz>0)frontAxles.push(axle);
      box(body,s*1.32,1.3,zz,.3,.12,1.2,palette.yellow);
    }
    box(body,0,1.52,-1.55,2.1,.3,1,'#ece5d0');box(body,0,1.69,-1.55,.16,.02,.62,'#d84d6b');box(body,0,1.69,-1.55,.58,.02,.16,'#d84d6b');
    const beacon=mesh(body,new T.CylinderGeometry(.14,.18,.25,16),material('#e94463',{emissive:'#ed4261',emissiveIntensity:.7,roughness:.25}),0,3.33,-.1);beacons.push(beacon);
    const driver=new T.Group();driver.position.set(-.59,0,-.08);body.add(driver);
    sphere(driver,0,1.58,0,.38,.40,.25,palette.pink);sphere(driver,0,1.82,.015,.40,.18,.24,palette.pink);
    for(const s of [-1,1]){const leg=box(driver,s*.2,1.09,.25,.32,.27,.95,'#365667');leg.rotation.x=.1;box(driver,s*.2,.98,.7,.3,.18,.4,'#efe7cf');}
    const head=createHead();head.position.set(0,2.43,.035);head.scale.setScalar(.86);driver.add(head);
    const steering=new T.Group();steering.position.set(-.59,1.74,.83);steering.rotation.x=-.32;body.add(steering);
    mesh(steering,new T.TorusGeometry(.31,.025,8,32),material('#27383d'));for(let i=0;i<3;i++){const a=i*Math.PI*2/3;rod(steering,[0,0,0],[Math.sin(a)*.29,Math.cos(a)*.29,0],.012,'#6a7776');}
    const hands=[],forearms=[];
    for(const s of [-1,1]){
      const h=sphere(steering,s*.26,.13,.015,.09,.10,.075,skin);hands.push(h);
      rod(driver,[s*.33,1.99,.03],[s*.43,1.63,.28],.13,palette.pink);
      forearms.push(rod(body,[-.59+s*.43,1.63,.2],[-.59+s*.26,1.78,.83],.075,skin));
    }
    const contact=texture((q,s)=>{const g=q.createRadialGradient(s/2,s/2,0,s/2,s/2,s/2);g.addColorStop(0,'rgba(28,35,39,.45)');g.addColorStop(1,'rgba(28,35,39,0)');q.fillStyle=g;q.fillRect(0,0,s,s);},64);
    const shadow=mesh(group,new T.PlaneGeometry(4.8,5.9),new T.MeshBasicMaterial({map:contact,transparent:true,depthWrite:false}),0,.04,0);shadow.rotation.x=-Math.PI/2;
    const hand=new T.Vector3(),inv=new T.Matrix4(),bodyBatch=batch(body,true);
    return {group,body,tires,head,driver,steering,beacons,shadow,update({dt,t,speed,forward,turn,impact,reduced,state}){
      tires.forEach(w=>w.rotation.x+=forward*dt/.65);frontAxles.forEach(a=>a.rotation.y=turn*.33);steering.rotation.z=-turn*.42;
      head.rotation.y=T.MathUtils.damp(head.rotation.y,turn*.14+(state==='cinematic'?.10:0),7,dt);
      head.rotation.z=reduced?0:Math.sin(t*7)*Math.min(speed*.0016,.025)+Math.sin(impact*20)*impact*.055;
      head.rotation.x=reduced?0:-impact*.06;head.userData.face.morphTargetInfluences[0]=T.MathUtils.damp(head.userData.face.morphTargetInfluences[0],state==='won'?.9:state==='lost'?0:.22,6,dt);
      group.updateMatrixWorld(true);inv.copy(body.matrixWorld).invert();
      for(let i=0;i<hands.length;i++){hands[i].getWorldPosition(hand).applyMatrix4(inv);connect(forearms[i],[-.59+(i===0?-1:1)*.43,1.63,.2],hand.toArray(),.075);}
      beacon.material.emissiveIntensity=Math.sin(t*12)>.1?1.5:.25;
      bodyBatch.update();
    }};
  }

  function createPerson(color){
    const g=new T.Group();g.userData.simple=true;box(g,0,.9,0,.45,.62,.29,color);sphere(g,0,1.39,0,.21,.25,.20,'#cb9b78');sphere(g,0,1.53,-.035,.22,.15,.19,'#49382e');
    const limbs=[];
    for(const s of [-1,1]){const leg=new T.Group();leg.position.set(s*.13,.61,0);g.add(leg);box(leg,0,-.23,0,.16,.47,.2,'#42596a');box(leg,0,-.48,.05,.19,.1,.29,'#e8dcc6');
      const arm=new T.Group();arm.position.set(s*.27,1.12,0);g.add(arm);box(arm,0,-.19,0,.13,.39,.16,color);sphere(arm,0,-.4,0,.075,.09,.07,'#cb9b78');limbs.push({leg,arm,s});}
    g.userData.walk=(t,moving=true)=>limbs.forEach(({leg,arm,s})=>{leg.rotation.x=Math.sin(t*6)*.4*s*(moving?1:0);arm.rotation.x=-leg.rotation.x*.75;});return g;
  }
  function createCart(){const g=new T.Group();box(g,0,.65,.1,1.25,.16,1.7,'#649e9a');box(g,0,.95,.1,1.05,.45,1.5,'#c7956c');box(g,-.25,1.33,.1,.5,.35,.7,'#957487');box(g,.3,1.25,.3,.45,.25,.75,'#789898');
    for(const s of [-1,1]){const wheel=mesh(g,new T.CylinderGeometry(.29,.29,.12,12),material('#34434a'),s*.62,.29,.5);wheel.rotation.z=Math.PI/2;rod(g,[s*.55,.7,-.6],[s*.55,1,-1.4],.035,'#649e9a');}
    const person=createPerson('#78a3a7');person.position.set(0,0,-1.9);g.add(person);g.userData.walk=t=>person.userData.walk(t);return g;}
  function createPatrol(){const g=new T.Group();box(g,0,.73,0,2.45,.66,4.4,'#283e50');box(g,0,1.29,-.28,2.1,.83,2.34,'#ede8d6');
    for(const z of [-1.46,.93])box(g,0,1.45,z,1.85,.48,.08,'#466b78');
    for(const s of [-1,1])for(const z of [-1.38,1.38]){const w=mesh(g,new T.CylinderGeometry(.49,.49,.35,16),material('#283940'),s*1.13,.5,z);w.rotation.z=Math.PI/2;}
    for(const s of [-1,1])box(g,s*.83,1,2.23,.5,.18,.07,'#f5e7b7');
    const lights=[];for(const s of [-1,1])lights.push(box(g,s*.4,1.86,-.35,.61,.22,.48,s<0?'#ed4863':'#579dbb',{emissive:s<0?'#ed4863':'#579dbb',emissiveIntensity:.8}));
    label(g,'POLÍCIA',0,1.87,1.2,1.7,.29,{fg:'#283e50',bg:'#ede8d6'});g.userData.lights=lights;return g;}
  function createStretcher(){const g=new T.Group();box(g,0,.75,0,.85,.19,1.8,'#e6eedb');rod(g,[-.3,.1,-.6],[-.3,.7,-.6],.05,'#a9bdb8');rod(g,[.3,.1,.6],[.3,.7,.6],.05,'#a9bdb8');box(g,0,.96,.1,.59,.23,1.15,'#95b1b0');sphere(g,0,1.02,-.58,.22,.18,.23,'#cc9b79');return g;}
  function createDust(scene){const count=48,positions=new Float32Array(count*3),ages=new Float32Array(count).fill(99),velocities=new Float32Array(count*2),g=new T.BufferGeometry();g.setAttribute('position',new T.BufferAttribute(positions,3));
    const m=new T.PointsMaterial({color:'#d9c8a4',size:.28,transparent:true,opacity:.35,depthWrite:false});const points=new T.Points(g,m);points.frustumCulled=false;scene.add(points);let cursor=0,acc=0;
    return {update(dt,x,z,speed,t,reduced,low,playing){acc+=dt;const n=low?18:count;
      if(playing&&!reduced&&speed>5&&Math.abs(x+71)<19&&acc>.055){acc=0;const i=cursor++%n;positions[i*3]=x+Math.sin(t*43)*1.25;positions[i*3+1]=groundHeight(x,z)+.22;positions[i*3+2]=z;ages[i]=0;velocities[i*2]=Math.sin(t*5)*.4;velocities[i*2+1]=Math.cos(t*6)*.4;}
      for(let i=0;i<count;i++){ages[i]+=dt;if(ages[i]<.65&&i<n){positions[i*3]+=velocities[i*2]*dt;positions[i*3+1]+=.35*dt;positions[i*3+2]+=velocities[i*2+1]*dt;}else positions[i*3+1]=-100;}
      g.attributes.position.needsUpdate=true;points.visible=playing&&!reduced;
    }};
  }
  return {createWorld,createBuggy,createPerson,createCart,createPatrol,createStretcher,createDust,batch,groundHeight,createHead};
})();
