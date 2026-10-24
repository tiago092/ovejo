/* Browser boundary. No mission rules live here. */
(()=>{'use strict';
 const KEY='codigo-rosa-godot-v2', media=matchMedia('(prefers-reduced-motion: reduce)'),coarse=matchMedia('(pointer: coarse)');
 let saved={},callback=null,active=false,playing=false,widget=null,ready=false,lastSnapshot=null;
 const read=key=>{try{const raw=localStorage.getItem(key);const value=raw?JSON.parse(raw):null;return value&&typeof value==='object'&&!Array.isArray(value)?value:null;}catch{return null;}};
 saved=read(KEY);
 if(!saved){const previous=read('codigo-rosa-godot-v1')||{};let legacyQuality='auto',legacyBest=0;try{legacyQuality=localStorage.getItem('codigo-rosa-quality')||'auto';legacyBest=Number(localStorage.getItem('codigo-rosa-3d-best'))||0;}catch{}
 saved={...previous,version:2,quality:previous.quality||legacyQuality,legacy_best:Number.isFinite(previous.best)?Math.max(0,previous.best):legacyBest,best:0};try{localStorage.setItem(KEY,JSON.stringify(saved));}catch{}}
 if(!saved||typeof saved!=='object'||Array.isArray(saved))saved={};
 if(!['auto','high','low'].includes(saved.quality))saved.quality='auto';
 saved.best=Number.isFinite(saved.best)?Math.max(0,saved.best):0;
 saved.legacy_best=Number.isFinite(saved.legacy_best)?Math.max(0,saved.legacy_best):0;
 const emit=message=>callback?.(JSON.stringify(message));
 const audioStatus=value=>{if(playing===value)return;playing=value;emit({type:'audio',playing:value});};
 function connectWidget(){
  if(widget||!window.SC?.Widget)return;
  widget=SC.Widget(document.getElementById('trackPlayer'));const events=SC.Widget.Events;
  widget.bind(events.READY,()=>{ready=true;if(active)widget.play();});
  widget.bind(events.PLAY,()=>{if(!active){widget.pause();audioStatus(false);return;}audioStatus(true);});
  widget.bind(events.PAUSE,()=>audioStatus(false));
  widget.bind(events.ERROR,()=>audioStatus(false));
  widget.bind(events.FINISH,()=>{audioStatus(false);if(active){widget.seekTo(0);widget.play();}});
 }
 window.RosaHost={
  connectGame(cb,verification){callback=cb;connectWidget();if(verification)window.__rosa={command:message=>emit({type:'test',...message}),snapshot:()=>lastSnapshot};},
  preferences(){const safe=getComputedStyle(document.getElementById('safe'));return JSON.stringify({...saved,touch:coarse.matches,dpr:devicePixelRatio||1,safe:[safe.paddingTop,safe.paddingRight,safe.paddingBottom,safe.paddingLeft].map(v=>parseFloat(v)||0),reduced:saved.reduced_explicit?saved.reduced:media.matches});},
  save(json){try{const next=JSON.parse(json);saved={...saved,...next,version:2};try{localStorage.setItem(KEY,JSON.stringify(saved));}catch{}}catch{}},
  announce(text){document.getElementById('announcement').textContent=text;},
  music(wanted){const changed=active!==wanted;active=!!wanted;if(!active){if(ready)widget.pause();audioStatus(false);}else if(changed&&ready)widget.play();},
  report(json){lastSnapshot=JSON.parse(json);},
  connectWidget
 };
 document.addEventListener('visibilitychange',()=>{if(document.hidden){emit({type:'hidden'});if(ready)widget.pause();}});
 window.addEventListener('blur',()=>{emit({type:'blur'});});
 window.addEventListener('pointercancel',()=>emit({type:'release'}));
 window.addEventListener('touchcancel',()=>emit({type:'release'}));
 window.addEventListener('orientationchange',()=>emit({type:'release'}));
 window.addEventListener('resize',()=>emit({type:'preferences'}));
 media.addEventListener('change',()=>{if(!saved.reduced_explicit)emit({type:'preferences',reduced:media.matches});});
 coarse.addEventListener('change',()=>emit({type:'preferences'}));
 document.getElementById('extras').addEventListener('toggle',event=>{if(event.target.open)emit({type:'blur'});});
 document.getElementById('loadTrack').addEventListener('click',()=>{
  const frame=document.getElementById('trackPlayer');if(frame.src)return;
  frame.src='https://w.soundcloud.com/player/?url=https%3A%2F%2Fsoundcloud.com%2Fthedjfrankieg%2Fmagalenha-frankie-g-rio-dub&color=%23ed5598&auto_play=false&show_artwork=false&visual=false';
  const script=document.createElement('script');script.src='https://w.soundcloud.com/player/api.js';script.onload=connectWidget;document.head.append(script);
 });
 document.getElementById('canvas').addEventListener('webglcontextlost',()=>{document.getElementById('loadStatus').hidden=false;document.getElementById('loadText').textContent='Se interrumpieron los gráficos. Recargá la página para volver al menú.';emit({type:'hidden'});});
})();
