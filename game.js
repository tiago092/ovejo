/* Código Rosa · simulation, mission state and browser controls. */
'use strict';
(() => {
  const $=id=>document.getElementById(id),canvas=$('game'),stage=$('stage');
  if(!window.THREE||!window.RosaVisuals){$('content').innerHTML='<h1>Faltan archivos del juego.</h1><p>Abrí la carpeta completa.</p>';return;}
  const T=THREE,V=RosaVisuals,clamp=T.MathUtils.clamp,rand=(a,b)=>a+Math.random()*(b-a);
  let renderer;
  try{renderer=new T.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});}
  catch{$('content').innerHTML='<h1>Activá los gráficos 3D.</h1><p>Este juego necesita WebGL y aceleración gráfica.</p>';return;}
  renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.info.autoReset=false;
  const scene=new T.Scene(),camera=new T.PerspectiveCamera(48,1,.08,600),driverCamera=new T.PerspectiveCamera(34,1,.05,100);
  const art=V.createWorld(scene),{walls,roadXs,roadZs,groundHeight}=art;
  const vehicle=V.createBuggy(),buggy=vehicle.group;scene.add(buggy);
  const actors=new T.Group();scene.add(actors);
  const pedestrians=[];
  for(let i=0;i<30;i++){const g=V.createPerson(['#d489a5','#91afbd','#dcbd7e','#7eaba0','#a58ab4'][i%5]);actors.add(g);pedestrians.push({g,x:0,z:0,dx:0,dz:0,change:0,cool:0,club:i<18});}
  const taxis=[];
  for(let i=0;i<5;i++){const g=V.createCart();actors.add(g);taxis.push({g,x:0,z:roadZs[i%4]+(i%2?4:-4),dir:i%2?-1:1,speed:1.1+i*.15,stop:0,next:3+i});}
  const patrol=V.createPatrol();actors.add(patrol);const actorBatch=V.batch(actors,true);
  const police={g:patrol,x:-60,z:-150,angle:0,speed:0,cool:0,waypoint:0,warning:false};
  const routeNodes=roadZs.flatMap(z=>roadXs.map(x=>({x,z})));
  const pickup={x:-28,z:-110},hospital={x:76,z:100};
  const marker=new T.Group();scene.add(marker);
  const ring=new T.Mesh(new T.RingGeometry(4.5,4.8,64),new T.MeshBasicMaterial({color:'#ed5598',side:T.DoubleSide,transparent:true,opacity:.85}));ring.rotation.x=-Math.PI/2;ring.position.y=.15;marker.add(ring);
  const markerArrow=new T.Mesh(new T.ConeGeometry(.4,.9,4),new T.MeshStandardMaterial({color:'#ed5598',emissive:'#ed5598',emissiveIntensity:.45}));markerArrow.rotation.z=Math.PI;marker.add(markerArrow);
  const stretcher=V.createStretcher();stretcher.position.set(pickup.x-2,groundHeight(pickup.x-2,pickup.z-4.5),pickup.z-4.5);scene.add(stretcher);
  const dust=V.createDust(scene);
  const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)'),coarsePointer=matchMedia('(pointer: coarse)');
  let qualityPreference='auto',lowQuality=false,panelOpen=false,cw=0,ch=0;
  try{const q=localStorage.getItem('codigo-rosa-quality');if(['auto','high','low'].includes(q))qualityPreference=q;}catch{}
  function applyQuality(){
    lowQuality=qualityPreference==='low'||(qualityPreference==='auto'&&coarsePointer.matches);
    renderer.setPixelRatio(Math.min(devicePixelRatio||1,lowQuality?1:1.5));
    art.sun.shadow.mapSize.set(lowQuality?512:1024,lowQuality?512:1024);
    if(art.sun.shadow.map){art.sun.shadow.map.dispose();art.sun.shadow.map=null;}
    renderer.shadowMap.needsUpdate=true;cw=ch=0;$('quality').value=qualityPreference;panelOpen=!lowQuality;updatePanel();
    $('qualityLabel').textContent=lowQuality?'MODO LIGERO':'AMANECER EN MORRO';
  }
  function updatePanel(){ $('driverPanel').hidden=!panelOpen;$('driverToggle').setAttribute('aria-expanded',String(panelOpen));$('driverToggle').textContent=panelOpen?'Ocultar conductor':'Ver conductor'; }
  let state='intro',pausedFrom='playing',phase=0,time=90,health=100,x=-78,z=-112,angle=0,vx=0,vz=0,speed=0;
  let clock=0,visualTime=0,last=0,cooldown=0,sirenLeft=0,impact=0,load=0,pedHits=0,bumps=0,noticeTimer=0,cameraMode=0;
  let cinematicTime=0,introSeen=false,sirenTick=0,policeTick=0,best=0,soundOn=false,soundPreferenceSet=false,audio=null,music=null;
  let reactionTime=0,manualPanel=false,hudTimer=0,route=[],routeX=Infinity,routeZ=Infinity,routePhase=-1;
  const keys={up:false,down:false,left:false,right:false},initialContent=$('content').innerHTML;
  try{best=Number(localStorage.getItem('codigo-rosa-3d-best'))||0;}catch{}
  function setState(next){state=next;document.body.dataset.state=state;}
  function clearKeys(){Object.keys(keys).forEach(k=>keys[k]=false);document.querySelectorAll('.touch .held').forEach(b=>b.classList.remove('held'));}
  function ensureAudio(){if(audio)return true;try{audio=new(window.AudioContext||window.webkitAudioContext)();music=new RosaTrackAudio(audio);return true;}catch{return false;}}
  function soundUI(){const b=$('sound');b.textContent=soundOn?'♫ Música: sí':'♫ Música: no';b.setAttribute('aria-pressed',String(soundOn));}
  function beep(f=600,d=.13){if(!soundOn||!audio)return;const o=audio.createOscillator(),g=audio.createGain();o.frequency.value=f;g.gain.setValueAtTime(.035,audio.currentTime);g.gain.exponentialRampToValueAtTime(.001,audio.currentTime+d);o.connect(g);g.connect(audio.destination);o.start();o.stop(audio.currentTime+d);}
  function notice(message){$('notice').textContent=message;$('notice').classList.add('visible');noticeTimer=3;$('announcement').textContent=message;}
  function reaction(caption){$('driverCaption').textContent=caption;reactionTime=2.6;if(!lowQuality&&!manualPanel){panelOpen=true;updatePanel();}}
  function blocked(px,pz,r=1.6){return px< -93||px>117||pz< -162||pz>151||walls.some(b=>Math.abs(px-b.x)<b.w+r&&Math.abs(pz-b.z)<b.d+r);}
  function closestNode(px,pz){let best=0,d=Infinity;routeNodes.forEach((n,i)=>{const nd=Math.hypot(px-n.x,pz-n.z);if(nd<d){d=nd;best=i;}});return best;}
  function nextRouteNode(from,to){
    if(from===to)return from;const queue=[from],seen=new Set(queue),parent=new Map();
    for(let i=0;i<queue.length;i++){const node=queue[i],row=Math.floor(node/3),col=node%3;for(const n of [col>0?node-1:-1,col<2?node+1:-1,row>0?node-3:-1,row<3?node+3:-1]){if(n<0||seen.has(n))continue;seen.add(n);parent.set(n,node);queue.push(n);}}
    if(!seen.has(to))return from;let next=to;while(parent.get(next)!==from)next=parent.get(next);return next;
  }
  function clearSegment(a,b){const count=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)/.8));for(let i=0;i<=count;i++){const t=i/count;if(blocked(a.x+(b.x-a.x)*t,a.z+(b.z-a.z)*t))return false;}return true;}
  // Shared collision-checked route for the arrow and minimap.
  function planRoute(start,target){
    if(clearSegment(start,target))return [start,target];
    const nodes=[...routeNodes,start,target],n=nodes.length,from=n-2,to=n-1,dist=Array(n).fill(Infinity),previous=Array(n).fill(-1),done=new Set();dist[from]=0;
    for(let k=0;k<n;k++){
      let u=-1;for(let i=0;i<n;i++)if(!done.has(i)&&(u<0||dist[i]<dist[u]))u=i;
      if(u<0||!Number.isFinite(dist[u])||u===to)break;done.add(u);
      for(let v=0;v<n;v++){
        if(v===u||done.has(v))continue;const grid=u<routeNodes.length&&v<routeNodes.length;
        if(grid&&!(Math.floor(u/3)===Math.floor(v/3)&&Math.abs(u-v)===1||u%3===v%3&&Math.abs(u-v)===3))continue;
        if(!clearSegment(nodes[u],nodes[v]))continue;
        const next=dist[u]+Math.hypot(nodes[u].x-nodes[v].x,nodes[u].z-nodes[v].z);if(next<dist[v]){dist[v]=next;previous[v]=u;}
      }
    }
    if(!Number.isFinite(dist[to]))return [start];const path=[];for(let i=to;i>=0;i=previous[i]){path.unshift(nodes[i]);if(i===from)break;}return path;
  }
  function currentRoute(){if(Math.hypot(x-routeX,z-routeZ)>1.5||routePhase!==phase){route=planRoute({x,z},phase?hospital:pickup);routeX=x;routeZ=z;routePhase=phase;}return route;}
  function routeCue(){const path=currentRoute(),p=path.slice(1).find(p=>Math.hypot(p.x-x,p.z-z)>2.5)||path.at(-1);if(!p||path.length<2)return '◎';const bearing=Math.atan2(p.x-x,p.z-z),relative=Math.atan2(Math.sin(bearing-angle),Math.cos(bearing-angle));return ['↑','↗','→','↘','↓','↙','←','↖'][(Math.round(relative/(Math.PI/4))+8)%8];}
  function reset(){
    phase=0;time=90;health=100;x=-78;z=-112;angle=0;vx=vz=speed=clock=0;cooldown=sirenLeft=impact=load=pedHits=bumps=0;
    cinematicTime=0;cameraMode=0;sirenTick=policeTick=0;noticeTimer=0;reactionTime=2.6;hudTimer=0;routePhase=-1;manualPanel=false;panelOpen=!lowQuality;updatePanel();clearKeys();
    $('notice').classList.remove('visible');$('driverCaption').textContent='REMERITA ROSA. CONFIANZA DE SOBRA.';
    for(let i=0;i<pedestrians.length;i++){const p=pedestrians[i];p.x=p.club?rand(-46,-13):roadXs[i%3]+rand(-5,5);p.z=p.club?rand(-121,-103):roadZs[i%4]+rand(-5,5);p.dx=rand(-1,1);p.dz=rand(-1,1);p.change=rand(1,4);p.cool=0;p.g.visible=true;p.g.position.set(p.x,groundHeight(p.x,p.z),p.z);}
    taxis.forEach((t,i)=>{t.x=rand(10,105);t.stop=0;t.next=3+i;t.g.visible=true;t.g.position.set(t.x,groundHeight(t.x,t.z),t.z);t.g.rotation.y=t.dir*Math.PI/2;});
    Object.assign(police,{x:-60,z:-150,angle:0,speed:0,cool:0,waypoint:0,warning:false});police.g.position.set(police.x,groundHeight(police.x,police.z),police.z);police.g.rotation.set(0,0,0);
    stretcher.visible=true;marker.position.set(pickup.x,groundHeight(pickup.x,pickup.z),pickup.z);ring.material.color.set('#ed5598');markerArrow.material.color.set('#ed5598');markerArrow.material.emissive.set('#ed5598');
    buggy.position.set(x,groundHeight(x,z)+.04,z);buggy.rotation.set(0,angle,0);vehicle.body.position.y=0;vehicle.head.rotation.set(0,0,0);updateHud();
  }
  function prepareAudio(){if(!soundPreferenceSet){soundOn=ensureAudio();soundUI();}if(soundOn&&ensureAudio())music.play();}
  function start(forceIntro=false){prepareAudio();reset();last=performance.now();$('overlay').hidden=true;$('portraitCard').hidden=true;
    if((forceIntro||!introSeen)&&!reducedMotion.matches){setState('cinematic');$('cinematic').hidden=false;cinematicTime=0;police.g.visible=false;marker.visible=false;}else beginPlaying();canvas.focus();setCamera(true);
  }
  function beginPlaying(){introSeen=true;setState('playing');$('cinematic').hidden=true;police.g.visible=true;marker.visible=true;clearKeys();last=performance.now();notice('Frená en Segunda Praia para subir al paciente');setCamera(true);canvas.focus();}
  function skipIntro(){if(state==='cinematic')beginPlaying();}
  function showMenu(){music?.stop();setState('intro');reset();$('content').innerHTML=initialContent;$('overlay').hidden=false;$('portraitCard').hidden=false;$('cinematic').hidden=true;marker.visible=false;police.g.visible=false;bindMenu();setCamera(true);$('start').focus();}
  function bindMenu(){$('start').onclick=()=>start();$('watchIntro').onclick=()=>start(true);}
  function pause(){
    if(state==='playing'||state==='cinematic'){pausedFrom=state;setState('paused');music?.stop();clearKeys();$('portraitCard').hidden=true;
      $('content').innerHTML='<div class="eyebrow">TURNO EN PAUSA</div><h1 class="resultTitle">Hasta el caos<br><em>necesita un respiro.</em></h1><p class="brief">WASD / flechas: conducir. Espacio: sirena.<br>C: cámara. Frená en el círculo para recoger o entregar.</p><button class="primary" id="resume">VOLVER AL VOLANTE ↗</button>';
      $('overlay').hidden=false;$('resume').onclick=pause;$('resume').focus();
    }else if(state==='paused'){setState(pausedFrom);if(soundOn)music?.play();$('overlay').hidden=true;last=performance.now();canvas.focus();}
  }
  function finish(win){
    setState(win?'won':'lost');music?.stop();clearKeys();$('cinematic').hidden=true;panelOpen=false;updatePanel();
    const score=win?Math.max(0,Math.round(time*100+health*20+1500-pedHits*500)):0,stars=win?(pedHits===0&&health>=85?3:pedHits===0&&health>=50?2:1):0;
    if(score>best){best=score;try{localStorage.setItem('codigo-rosa-3d-best',String(best));}catch{}}
    $('record').textContent=best?'RÉCORD '+best.toLocaleString('es-AR'):'RÉCORD —';$('portraitCard').hidden=true;
    $('content').innerHTML='<div class="eyebrow">'+(win?'PACIENTE A SALVO':'FIN DEL TURNO')+'</div><h1 class="resultTitle">'+(win?'Dijo «yo manejo».<br><em>Y llegó.</em>':health<=0?'Era prestado…<br><em>y lo rompiste.</em>':'Se hizo de día.<br><em>Se acabó el turno.</em>')+'</h1><div class="stars" aria-label="'+stars+' de 3 estrellas">'+('★'.repeat(stars)+'☆'.repeat(3-stars))+'</div><div class="resultStats"><div><small>PUNTOS</small><strong>'+score.toLocaleString('es-AR')+'</strong></div><div><small>CHOQUES</small><strong>'+bumps+'</strong></div><div><small>ATROPELLOS</small><strong>'+pedHits+'</strong></div></div><p class="brief">'+(win?'El paciente llegó. La confianza ya venía de antes.':'Soltá el acelerador antes de doblar y usá la sirena.')+'</p><div class="actions"><button class="primary" id="again">OTRA VUELTA ↻</button><button class="secondary" id="backMenu">VOLVER AL INICIO</button></div>';
    $('overlay').hidden=false;$('again').onclick=()=>start();$('backMenu').onclick=showMenu;$('again').focus();$('announcement').textContent=win?'Paciente a salvo. '+score+' puntos.':'Fin del turno';updateHud();setCamera(true);beep(win?880:120,.35);
  }
  function activateSiren(){if(state!=='playing'||cooldown>0)return;cooldown=7;sirenLeft=2.2;sirenTick=0;notice('¡Paso al buggy!');reaction('TRANQUILOS. ÉL MANEJA.');}
  function damage(amount,ped=false){if(impact>0)return;health=Math.max(0,health-amount);impact=1;if(ped){pedHits++;time=Math.max(0,time-8);notice('¡Cuidado con la gente! −8 segundos');}else{bumps++;notice('¡Choque! −'+amount+'% del buggy');}reaction('ESTABA TODO CALCULADO. CASI.');beep(100,.2);}
  function updatePolice(dt){
    police.cool=Math.max(0,police.cool-dt);const toPlayer=Math.hypot(x-police.x,z-police.z);
    if(toPlayer>115){const n=routeNodes[closestNode(x,z)];police.x=n.x;police.z=n.z-18;police.waypoint=closestNode(police.x,police.z);police.speed=0;}
    const at=routeNodes[police.waypoint];if(Math.hypot(police.x-at.x,police.z-at.z)<3.1)police.waypoint=nextRouteNode(police.waypoint,closestNode(x,z));
    const destination=Math.hypot(x-police.x,z-police.z)<17?{x,z}:routeNodes[police.waypoint],desired=Math.atan2(destination.x-police.x,destination.z-police.z),delta=Math.atan2(Math.sin(desired-police.angle),Math.cos(desired-police.angle));
    police.angle+=clamp(delta,-1.75*dt,1.75*dt);const slow=clamp(Math.hypot(destination.x-police.x,destination.z-police.z)*1.8,4,phase?17:14.5);
    police.speed+=(slow-police.speed)*Math.min(1,dt*2.2);const nx=police.x+Math.sin(police.angle)*police.speed*dt,nz=police.z+Math.cos(police.angle)*police.speed*dt;
    if(!blocked(nx,nz,1.35)){police.x=nx;police.z=nz;}else if(!blocked(nx,police.z,1.35))police.x=nx;else if(!blocked(police.x,nz,1.35))police.z=nz;else{police.speed=0;police.waypoint=closestNode(police.x,police.z);}
    police.g.position.set(police.x,groundHeight(police.x,police.z)+.02,police.z);police.g.rotation.y=police.angle;
    const distance=Math.hypot(x-police.x,z-police.z);
    if(distance<20&&!police.warning){police.warning=true;notice('¡La patrulla te sigue! Seguí hacia '+(phase?'el puesto de salud.':'el paciente.'));}
    if(distance<27&&soundOn){policeTick-=dt;if(policeTick<=0){beep(Math.floor(clock*3)%2?520:740,.10);policeTick=.8;}}
    if(distance<3.5&&police.cool<=0&&impact<=0){police.cool=2.8;impact=1;bumps++;health=Math.max(0,health-12);time=Math.max(0,time-3);const dx=(x-police.x)/Math.max(distance,.1),dz=(z-police.z)/Math.max(distance,.1);vx+=dx*5;vz+=dz*5;police.x-=dx*3.8;police.z-=dz*3.8;notice('¡Te alcanzó la patrulla! −12% y −3 segundos');reaction('ME PARECE QUE NOS VIERON.');beep(170,.22);}
  }
  function step(dt){
    clock+=dt;time=Math.max(0,time-dt);cooldown=Math.max(0,cooldown-dt);sirenLeft=Math.max(0,sirenLeft-dt);impact=Math.max(0,impact-dt);
    if(time<=0||health<=0){finish(false);return;}
    const turn=Number(keys.left)-Number(keys.right),drive=Number(keys.up)-Number(keys.down);let forward=vx*Math.sin(angle)+vz*Math.cos(angle);
    angle+=turn*1.85*clamp(Math.abs(forward)/5,0,1)*(forward<-.1?-1:1)*dt;forward+=drive*(drive<0&&forward>0?34:16)*dt;forward*=Math.exp(-(drive?.27:1.9)*dt);forward=clamp(forward,-7,24);
    const lateral=(vx*Math.cos(angle)-vz*Math.sin(angle))*Math.exp(-6*dt);vx=forward*Math.sin(angle)+lateral*Math.cos(angle);vz=forward*Math.cos(angle)-lateral*Math.sin(angle);speed=Math.hypot(vx,vz);
    const nx=x+vx*dt,nz=z+vz*dt;if(!blocked(nx,z))x=nx;else{if(speed>3)damage(12);vx*=-.4;}if(!blocked(x,nz))z=nz;else{if(speed>3)damage(12);vz*=-.4;}
    updatePolice(dt);
    for(const t of taxis){t.next-=dt;if(t.next<0){t.stop=rand(.2,1.3);t.next=rand(3,7);}t.stop=Math.max(0,t.stop-dt);t.x+=t.dir*t.speed*(t.stop>0?.05:1)*(sirenLeft>0&&Math.hypot(x-t.x,z-t.z)<20?.2:1)*dt;if(t.x>113)t.x=-85;if(t.x< -85)t.x=113;t.g.position.set(t.x,groundHeight(t.x,t.z),t.z);t.g.userData.walk(clock);if(Math.abs(x-t.x)<2.4&&Math.abs(z-t.z)<1.7){damage(15);vx*=-.4;vz*=-.4;z+=z<t.z?-.5:.5;}}
    for(const p of pedestrians){p.cool=Math.max(0,p.cool-dt);p.change-=dt;if(p.change<=0){p.dx=rand(-1,1);p.dz=rand(-1,1);p.change=rand(1,3);}const d=Math.hypot(x-p.x,z-p.z);let dx=p.dx*.85,dz=p.dz*.85;
      if(d<5||(sirenLeft>0&&d<20)){dx=(p.x-x)/Math.max(d,.1)*(sirenLeft>0?5.3:2.6);dz=(p.z-z)/Math.max(d,.1)*(sirenLeft>0?5.3:2.6);}
      const px=p.x+dx*dt,pz=p.z+dz*dt;if(!blocked(px,pz,.4)){p.x=px;p.z=pz;}else{p.dx=-p.dx;p.dz=-p.dz;}p.g.position.set(p.x,groundHeight(p.x,p.z),p.z);p.g.rotation.y=Math.atan2(dx,dz);p.g.userData.walk(clock+p.x);p.g.visible=p.cool<=0||Math.floor(clock*8)%2===0;
      if(d<1.65&&speed>3&&p.cool<=0&&impact<=0){damage(5,true);p.cool=2;vx*=.4;vz*=.4;}
    }
    if(time<=0||health<=0){finish(false);return;}
    const target=phase?hospital:pickup;
    if(Math.hypot(x-target.x,z-target.z)<4.6&&speed<2){load+=dt;if(load>=1.3){load=0;if(phase===0){phase=1;routePhase=-1;stretcher.visible=false;marker.position.set(hospital.x,groundHeight(hospital.x,hospital.z),hospital.z);ring.material.color.set('#79d6c0');markerArrow.material.color.set('#79d6c0');markerArrow.material.emissive.set('#79d6c0');notice('¡Paciente a bordo! Al puesto de salud.');reaction('AHORA SÍ. RESPONSABILIDAD.');}else{finish(true);return;}}}else load=0;
    if(sirenLeft>0){sirenTick-=dt;if(sirenTick<=0){beep(Math.floor(sirenLeft*6)%2?650:950,.17);sirenTick=.18;}}
    const slope=(groundHeight(x+Math.sin(angle)*2,z+Math.cos(angle)*2)-groundHeight(x-Math.sin(angle)*2,z-Math.cos(angle)*2))/4;
    buggy.position.set(x,groundHeight(x,z)+.04,z);buggy.rotation.set(-Math.atan(slope),angle,reducedMotion.matches?0:turn*clamp(speed/24,0,1)*.035);vehicle.body.position.y=reducedMotion.matches?0:Math.sin(clock*15)*Math.min(speed*.0015,.025);
  }
  function updateHud(){
    const seconds=Math.ceil(time);$('time').textContent=String(Math.floor(seconds/60)).padStart(2,'0')+':'+String(seconds%60).padStart(2,'0');$('time').classList.toggle('urgent',time<20);
    $('health').textContent=Math.ceil(health)+'%';$('healthFill').style.width=health+'%';$('healthFill').style.background=health<35?'#f0878e':'#80d6bf';$('phase').textContent=phase?'02 / TRASLADO':'01 / RESCATE';$('objective').textContent=phase?'Llevá al paciente al puesto de salud':'Recogé al paciente en Segunda Praia';
    $('siren').textContent=sirenLeft>0?'ACTIVA':cooldown>0?Math.ceil(cooldown)+' s':'LISTA';$('sirenFill').style.width=(sirenLeft>0?100:100*(1-cooldown/7))+'%';$('touchSiren').classList.toggle('active',sirenLeft>0);$('touchSiren').textContent=sirenLeft>0?'ACTIVA':cooldown>0?Math.ceil(cooldown)+' s':'SIRENA';
    const pd=Math.hypot(x-police.x,z-police.z);$('policeDistance').textContent=Math.round(pd)+' m';$('policeDistance').classList.toggle('near',pd<17);$('speedValue').textContent=Math.round(speed*3.6);const target=phase?hospital:pickup,inZone=Math.hypot(x-target.x,z-target.z)<4.6;
    $('destination').textContent=load>0?(phase?'ENTREGANDO':'SUBIENDO')+' · '+Math.round(load/1.3*100)+'%':inZone?'FRENÁ PARA '+(phase?'ENTREGAR':'SUBIR AL PACIENTE'):routeCue()+' '+(phase?'POSTO DE SAÚDE':'SEGUNDA PRAIA')+' · '+Math.round(Math.hypot(x-target.x,z-target.z))+' m';
    $('loadProgress').hidden=load<=0;$('loadFill').style.width=clamp(load/1.3*100,0,100)+'%';$('cameraLabel').textContent=cameraMode?'VISTA FRONTAL':'CÁMARA DE SEGUIMIENTO';$('record').textContent=best?'RÉCORD '+best.toLocaleString('es-AR'):'RÉCORD —';drawMap();
  }
  const mapCtx=$('map').getContext('2d');
  function drawMap(){const q=mapCtx,w=210,h=170,sx=w/240,sz=h/325,p=(x,z)=>[(x+120)*sx,(z+165)*sz];q.clearRect(0,0,w,h);q.fillStyle='#e0d1af';q.fillRect(0,0,w,h);q.fillStyle='#5caaa8';q.fillRect(0,0,23,h);q.fillStyle='#f6ead0';roadXs.forEach(x=>q.fillRect((x+120)*sx-5.4*sx,0,10.8*sx,h));roadZs.forEach(z=>q.fillRect(0,(z+165)*sz-5.4*sz,w,10.8*sz));for(const b of walls){q.fillStyle='#b9a88b';const a=p(b.x-b.w,b.z-b.d);q.fillRect(a[0],a[1],2*b.w*sx,2*b.d*sz);}const path=currentRoute();q.beginPath();q.moveTo(...p(x,z));path.slice(1).forEach(n=>q.lineTo(...p(n.x,n.z)));q.strokeStyle='#328c76';q.lineWidth=2.7;q.stroke();const target=phase?hospital:pickup,t=p(target.x,target.z);q.fillStyle=phase?'#328c76':'#d94c8a';q.beginPath();q.arc(...t,5,0,Math.PI*2);q.fill();q.fillStyle='#c55864';q.beginPath();q.arc(...p(police.x,police.z),3.5,0,Math.PI*2);q.fill();q.save();q.translate(...p(x,z));q.rotate(-angle);q.fillStyle='#263e44';q.strokeStyle='#fff5d8';q.lineWidth=1.5;q.beginPath();q.moveTo(0,6);q.lineTo(-4,-4);q.lineTo(4,-4);q.closePath();q.fill();q.stroke();q.restore();}
  const camPos=new T.Vector3(),camTarget=new T.Vector3(),offset=new T.Vector3(),tmp=new T.Vector3(),axisY=new T.Vector3(0,1,0),cameraRay=new T.Ray(),cameraBox=new T.Box3(),hit=new T.Vector3(),direction=new T.Vector3();
  function setCamera(snap=false,dt=.016){
    const y=groundHeight(x,z),portrait=stage.clientHeight>stage.clientWidth;
    if(state==='cinematic'||state==='paused'&&pausedFrom==='cinematic'){
      const t=cinematicTime;if(t<2.2){camPos.set(x+10+t*.3,y+6,z+13);camTarget.set(-37,groundHeight(-37,-130)+3,-130);}
      else if(t<4.6){buggy.updateMatrixWorld(true);camPos.copy(buggy.localToWorld(tmp.set(-.46,2.67,2.12)));camTarget.copy(buggy.localToWorld(new T.Vector3(-.59,2.5,.12)));}
      else{const a=(t-4.6)/2.4,theta=(1-a)*Math.PI*.88;offset.set(Math.sin(theta)*12,4+a*3.5,-Math.cos(theta)*12);camPos.set(x,y,z).add(offset);camTarget.set(x,y+1.9,z+2);}snap=true;
    }else if(state==='intro'){offset.set(portrait?6:6.5,4.6,10);camPos.set(x,y,z).add(offset);camTarget.set(x-1,y+1.9,z);}
    else if(state==='won'||state==='lost'){buggy.updateMatrixWorld(true);camPos.copy(buggy.localToWorld(tmp.set(portrait?1.3:2.2,2.95,3.6)));camTarget.copy(buggy.localToWorld(tmp.set(portrait?-.6:-1.5,2.46,portrait?.1:1.0)));}
    else{
      offset.set(cameraMode?9:0,cameraMode?8:portrait?9:7.5,cameraMode?13:portrait?-15:-12);offset.applyAxisAngle(axisY,angle);camTarget.set(x+Math.sin(angle)*(cameraMode?0:4),y+1.9,z+Math.cos(angle)*(cameraMode?0:4));camPos.set(x,y,z).add(offset);
      direction.copy(camPos).sub(camTarget);const distance=direction.length();direction.normalize();cameraRay.set(camTarget,direction);let available=distance;
      for(const b of walls){const floor=groundHeight(b.x,b.z);cameraBox.min.set(b.x-b.w-.3,floor-.5,b.z-b.d-.3);cameraBox.max.set(b.x+b.w+.3,floor+b.h,b.z+b.d+.3);if(cameraRay.intersectBox(cameraBox,hit)){const d=hit.distanceTo(camTarget);if(d>1&&d<available)available=Math.max(1.2,d-.5);}}
      if(available<distance)camPos.copy(camTarget).addScaledVector(direction,available);camPos.y=Math.max(camPos.y,groundHeight(camPos.x,camPos.z)+1.1);
    }
    if(snap||reducedMotion.matches)camera.position.copy(camPos);else camera.position.lerp(camPos,1-Math.exp(-dt*5));camera.lookAt(camTarget);buggy.updateMatrixWorld(true);driverCamera.position.copy(buggy.localToWorld(tmp.set(-.52,2.67,2.7)));driverCamera.lookAt(buggy.localToWorld(tmp.set(-.59,2.42,.10)));
  }
  function render(dt){const w=stage.clientWidth,h=stage.clientHeight;if(w!==cw||h!==ch){cw=w;ch=h;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();}setCamera(false,dt);actorBatch.update();renderer.info.reset();renderer.setScissorTest(false);renderer.setViewport(0,0,w,h);renderer.render(scene,camera);
    if(panelOpen&&state==='playing'){const frame=$('driverViewport').getBoundingClientRect(),base=stage.getBoundingClientRect();if(frame.width&&frame.height){renderer.clearDepth();renderer.setScissorTest(true);renderer.setScissor(frame.left-base.left,base.bottom-frame.bottom,frame.width,frame.height);renderer.setViewport(frame.left-base.left,base.bottom-frame.bottom,frame.width,frame.height);driverCamera.aspect=frame.width/frame.height;driverCamera.updateProjectionMatrix();renderer.render(scene,driverCamera);renderer.setScissorTest(false);}}
  }
  function tick(ms){const rawDt=(ms-last)/1000||0,dt=Math.min(rawDt,.25);last=ms;
    if(state==='playing'){time=Math.max(0,time-Math.max(0,rawDt-dt));let remaining=dt;while(remaining>0&&state==='playing'){const slice=Math.min(remaining,.025);step(slice);remaining-=slice;}noticeTimer-=dt;if(noticeTimer<=0)$('notice').classList.remove('visible');reactionTime-=dt;if(reactionTime<=0&&!manualPanel&&panelOpen){panelOpen=false;updatePanel();}}
    if(state==='cinematic'){cinematicTime=Math.min(7,cinematicTime+Math.max(0,rawDt));$('cinematicLine').textContent=cinematicTime<2.2?'MORRO. SALIDA DE LA DISCO.':cinematicTime<4.6?'«YO MANEJO».':'LA ÚLTIMA VUELTA.';$('cinematicProgress').style.width=cinematicTime/7*100+'%';if(cinematicTime>=7)beginPlaying();}
    const active=state!=='paused';if(active)visualTime+=dt;const visualDt=active?dt:0,turn=Number(keys.left)-Number(keys.right),forward=vx*Math.sin(angle)+vz*Math.cos(angle);
    vehicle.update({dt:visualDt,t:visualTime,speed,forward:state==='playing'?forward:0,turn,impact,reduced:reducedMotion.matches,state});art.update(reducedMotion.matches?0:visualTime,x,z);dust.update(visualDt,x,z,speed,visualTime,reducedMotion.matches,lowQuality,state==='playing');
    marker.visible=state==='playing';markerArrow.position.y=4.5+(reducedMotion.matches?0:Math.sin(visualTime*2.5)*.3);markerArrow.rotation.y=reducedMotion.matches?0:visualTime*.6;patrol.userData.lights.forEach((l,i)=>l.material.emissiveIntensity=Math.floor(visualTime*5)%2===i?1.4:.1);
    hudTimer+=dt;if(hudTimer>.08){updateHud();hudTimer=0;}render(visualDt);requestAnimationFrame(tick);
  }
  const keyMap={ArrowUp:'up',ArrowDown:'down',ArrowLeft:'left',ArrowRight:'right',w:'up',W:'up',s:'down',S:'down',a:'left',A:'left',d:'right',D:'right'};
  window.addEventListener('keydown',e=>{if(/^(SELECT|INPUT|TEXTAREA)$/.test(e.target.tagName))return;if(state==='cinematic'&&(e.code==='Space'||e.key==='Enter')){e.preventDefault();if(!e.repeat)skipIntro();return;}if(keyMap[e.key]&&state==='playing'){e.preventDefault();keys[keyMap[e.key]]=true;}if(e.code==='Space'&&state==='playing'){e.preventDefault();if(!e.repeat)activateSiren();}if(!e.repeat){if(['p','P','Escape'].includes(e.key))pause();if(['c','C'].includes(e.key)&&state==='playing'){cameraMode=1-cameraMode;setCamera(true);updateHud();}}});
  window.addEventListener('keyup',e=>{if(keyMap[e.key])keys[keyMap[e.key]]=false;});window.addEventListener('blur',()=>{clearKeys();if((state==='playing'||state==='cinematic')&&document.activeElement?.id!=='trackPlayer')pause();});document.addEventListener('visibilitychange',()=>{if(document.hidden&&(state==='playing'||state==='cinematic'))pause();});
  for(const b of document.querySelectorAll('[data-key]')){b.addEventListener('pointerdown',e=>{e.preventDefault();if(state==='playing'){keys[b.dataset.key]=true;b.classList.add('held');b.setPointerCapture(e.pointerId);}});const release=()=>{keys[b.dataset.key]=false;b.classList.remove('held');};b.addEventListener('pointerup',release);b.addEventListener('pointercancel',release);b.addEventListener('lostpointercapture',release);}
  $('skipIntro').onclick=skipIntro;$('pause').onclick=pause;$('cameraButton').onclick=()=>{if(state==='playing'){cameraMode=1-cameraMode;setCamera(true);updateHud();}};$('touchSiren').onclick=activateSiren;
  $('driverToggle').onclick=()=>{manualPanel=true;panelOpen=!panelOpen;updatePanel();};$('quality').onchange=()=>{qualityPreference=$('quality').value;try{localStorage.setItem('codigo-rosa-quality',qualityPreference);}catch{}applyQuality();};coarsePointer.addEventListener('change',()=>{if(qualityPreference==='auto')applyQuality();});reducedMotion.addEventListener('change',()=>{if(reducedMotion.matches&&state==='cinematic')beginPlaying();});
  $('sound').onclick=()=>{soundPreferenceSet=true;soundOn=!soundOn;if(soundOn){soundOn=ensureAudio();if(soundOn&&(state==='playing'||state==='cinematic'))music.play();}else music?.stop();soundUI();};canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();if(state==='playing'||state==='cinematic')pause();notice('Se interrumpieron los gráficos. Recargá la página para continuar.');});
  applyQuality();reset();setState('intro');marker.visible=false;police.g.visible=false;bindMenu();setCamera(true);requestAnimationFrame(tick);
})();
