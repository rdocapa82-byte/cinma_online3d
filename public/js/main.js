import * as THREE from 'three';
import {socket,emit,now,clock} from './socket.js';
import {S} from './settings.js';
import {makeAvatar,animate,makeTag} from './avatar.js';
import {buildCinema,SEATS,colliders,BOUNDS,seatMeshes,setLights,key} from './cinema.js';
import {initControls,readMove} from './controls.js';
import {cam,updateCamera} from './camera.js';
import {applyVideo,initPlayerUI,onRtc,setVolume,vid} from './player.js';
import {initBrowser,remoteWeb,setCtl} from './browser.js';
import {startAmbient} from './audio.js';
import {$,toast,progress,avatarEditor,addChat,sysChat,renderPlayers,initPanels} from './ui.js';

const canvas=$('game'),renderer=new THREE.WebGLRenderer({canvas,antialias:false,powerPreference:'high-performance'});
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;
const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(70,1,.1,60);
const Q={low:{pr:.6,far:38,l:2,sh:false},mid:{pr:1,far:60,l:4,sh:false},high:{pr:Math.min(devicePixelRatio,2),far:90,l:6,sh:true}};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const wrap=a=>{while(a>Math.PI)a-=2*Math.PI;while(a<-Math.PI)a+=2*Math.PI;return a};
function applySettings(){
  const q=Q[S.q]||Q.mid;renderer.setPixelRatio(q.pr);renderer.setSize(innerWidth,innerHeight,false);
  camera.far=q.far;camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();
  if(scene.fog){scene.fog.far=q.far}setLights(q.l);
  if(key){key.castShadow=q.sh;key.shadow.mapSize.set(1024,1024)}
  scene.traverse(o=>{if(o.isMesh&&o.material)o.material.needsUpdate=o.material.needsUpdate});
  $('fps').hidden=!S.fps;$('pg').hidden=!S.ping;document.querySelector('[data-p=chat]').hidden=!S.chat;if(!S.chat)$('chat').classList.add('hidden');
  remotes.forEach(r=>r.tag.visible=S.names);setVolume();
}
addEventListener('resize',applySettings);

const me={pid:null,pos:new THREE.Vector3(0,0,11),face:0,anim:'idle',seat:-1,av:null};
let room=null,token=null,inRoom=false,nearSeat=-1,players=new Map();
const remotes=new Map(),seatOcc=new Map();
let prevCfg=null,preview=null;

function addRemote(p){
  if(remotes.has(p.id)||p.id===me.pid)return;
  const av=makeAvatar(p.avatar),tag=makeTag(p.name);av.root.add(tag);tag.visible=S.names;
  av.root.traverse(o=>o.castShadow=true);
  av.root.position.set(...p.pos);scene.add(av.root);
  remotes.set(p.id,{av,tag,pos:new THREE.Vector3(...p.pos),yaw:p.yaw,anim:p.anim,hy:p.hy,seat:p.seat,cur:p.yaw});
  if(p.seat>=0)seatOcc.set(p.seat,p.id);
}
function dropRemote(id){const r=remotes.get(id);if(!r)return;scene.remove(r.av.root);remotes.delete(id);players.delete(id);
  for(const[s,i]of seatOcc)if(i===id)seatOcc.delete(s)}
const list=()=>renderPlayers([...players.values()],room,me.pid,(a,id,on)=>socket.emit(a,{id,on}));
const canCtl=()=>room&&(room.owner===me.pid||room.ctrl.has(me.pid));
function refreshPerm(){setCtl(!!canCtl());$('bcast').hidden=!canCtl();$('bar').classList.toggle('ro',!canCtl())}

function enter(res,first){
  room={code:res.code,owner:res.owner,ctrl:new Set(res.ctrl)};token=res.token;me.pid=res.me;
  sessionStorage.setItem('cvroom',JSON.stringify({code:res.code,token}));
  const ids=new Set(res.players.map(p=>p.id));
  for(const id of [...remotes.keys()])if(!ids.has(id))dropRemote(id);
  seatOcc.clear();players.clear();
  res.players.forEach(p=>{players.set(p.id,p);if(p.id===me.pid){me.seat=p.seat;if(first)me.pos.set(...p.pos)}else{if(remotes.has(p.id))remotes.get(p.id).seat=p.seat;addRemote(p)}if(p.seat>=0)seatOcc.set(p.seat,p.id)});
  clock.off=res.now-Date.now();inRoom=true;
  $('rc').textContent=res.code;$('pc').textContent='👥 '+res.players.length+'/'+res.max;
  if(first){$('home').classList.add('hidden');$('hud').classList.remove('hidden');if(preview)preview.visible=false;
    me.av.root.visible=true;startAmbient(S.vol);cam.yaw=0;sysChat('Código da sala: '+res.code)}
  refreshPerm();list();applyVideo(res.video,!!canCtl(),me.pid);if(res.video.kind==='web')remoteWeb(res.video.url);
}
function setupNet(){
  socket.on('pj',p=>{players.set(p.id,p);addRemote(p);sysChat(p.name+' entrou');$('pc').textContent='👥 '+players.size+'/'+(room&&room.max||20);list()});
  socket.on('pl',({id})=>{const p=players.get(id);dropRemote(id);p&&sysChat(p.name+' saiu');$('pc').textContent='👥 '+players.size;list()});
  socket.on('mv',d=>{const r=remotes.get(d.id);if(!r)return;if(r.seat<0)r.pos.set(...d.pos);r.yaw=d.yaw;r.anim=d.anim;r.hy=d.hy});
  socket.on('seat',({id,seat})=>{
    for(const[s,i]of seatOcc)if(i===id)seatOcc.delete(s);if(seat>=0)seatOcc.set(seat,id);
    if(id===me.pid){if(seat<0&&me.seat>=0)me.seat=-1;return}
    const r=remotes.get(id);if(!r)return;
    if(seat<0&&r.seat>=0){const s=SEATS[r.seat];r.pos.set(s.x,0,s.z-1.2)}r.seat=seat});
  socket.on('chat',m=>{addChat(m);if(m.id!==me.pid&&$('chat').classList.contains('hidden')&&S.chat)toast(m.name+': '+m.t.slice(0,40))});
  socket.on('perm',d=>{room.owner=d.owner;room.ctrl=new Set(d.ctrl);refreshPerm();list()});
  socket.on('video',v=>{applyVideo(v,!!canCtl(),me.pid);if(v.kind==='web')remoteWeb(v.url)});
  socket.on('rtc',onRtc);
  socket.on('kicked',()=>{sessionStorage.removeItem('cvroom');alert('Você foi removido da sala.');location.reload()});
  socket.on('disconnect',()=>{if(inRoom)toast('Conexão perdida. Reconectando…')});
  socket.on('connect',async()=>{
    if(!inRoom||!room)return;
    const r=await emit('join',{code:room.code,token});
    if(r.ok){enter(r,false);toast('Reconectado!')}else{sessionStorage.removeItem('cvroom');alert('Não foi possível voltar à sala.');location.reload()}
  });
}

// ---- movimento ----
const dirv=new THREE.Vector3();
function free(x,z){
  if(x<-BOUNDS.x+.4||x>BOUNDS.x-.4||z<BOUNDS.z0+.4||z>BOUNDS.z1-.4)return false;
  for(const c of colliders){const dx=x-clamp(x,c.x0,c.x1),dz=z-clamp(z,c.z0,c.z1);if(dx*dx+dz*dz<.09)return false}return true}
function step(dt){
  if(me.seat>=0){const s=SEATS[me.seat];me.pos.lerp(dirv.set(s.x,0,s.z+.1),1-Math.exp(-8*dt));me.face=0;me.anim='sit';return}
  const m=readMove();
  if(m.l>.1){
    const sp=(m.run?5:2.5)*dt,fx=-Math.sin(cam.yaw),fz=-Math.cos(cam.yaw),rx=Math.cos(cam.yaw),rz=-Math.sin(cam.yaw);
    const dx=(rx*m.x+fx*m.z),dz=(rz*m.x+fz*m.z),nx=me.pos.x+dx*sp,nz=me.pos.z+dz*sp;
    if(free(nx,me.pos.z))me.pos.x=nx;if(free(me.pos.x,nz))me.pos.z=nz;
    me.face+=wrap(Math.atan2(-dx,-dz)-me.face)*Math.min(1,dt*10);me.anim=m.run?'run':'walk';
  }else me.anim='idle';
  // poltrona próxima
  nearSeat=-1;let bd=1.9;
  for(const s of SEATS){if(seatOcc.has(s.id))continue;const d=Math.hypot(s.x-me.pos.x,s.z-me.pos.z);if(d<bd){bd=d;nearSeat=s.id}}
}
async function sit(id){
  if(me.seat>=0||seatOcc.has(id))return;
  const r=await emit('sit',{seat:id});
  if(r.ok){me.seat=id;seatOcc.set(id,me.pid);cam.yaw=0;cam.pitch=.05}else toast('Poltrona ocupada')}
function stand(){const s=SEATS[me.seat];socket.emit('stand');seatOcc.delete(me.seat);me.seat=-1;me.pos.set(s.x,0,s.z-1.2)}
const interact=()=>{if(!inRoom)return;me.seat>=0?stand():nearSeat>=0&&sit(nearSeat)};
$('sit').onclick=interact;

const ray=new THREE.Raycaster();
function onTap(x,y){
  if(!inRoom||me.seat>=0)return;
  ray.setFromCamera(new THREE.Vector2(x/innerWidth*2-1,-(y/innerHeight)*2+1),camera);
  const h=ray.intersectObjects(seatMeshes,true)[0];if(!h)return;
  let o=h.object;while(o&&o.userData.seat===undefined)o=o.parent;
  if(o&&h.distance<12)sit(o.userData.seat);
}

// ---- loop ----
const clk=new THREE.Clock();let sendT=0,fpsN=0,fpsT=0;
function loop(){
  requestAnimationFrame(loop);const dt=Math.min(clk.getDelta(),.1),t=clk.elapsedTime;
  if(inRoom){
    step(dt);
    const third=S.view==='third'&&me.seat<0;
    updateCamera(camera,me.pos,me.seat>=0,third);
    me.av.root.visible=third;me.av.root.position.copy(me.pos);me.av.root.rotation.y=me.face;
    const hy=me.seat>=0?cam.yaw:wrap(cam.yaw-me.face);
    animate(me.av,me.anim,dt,third?0:hy);
    sendT+=dt;if(sendT>.08&&socket.connected){sendT=0;socket.volatile.emit('mv',{pos:[me.pos.x,me.pos.y,me.pos.z],yaw:me.face,anim:me.anim,hy:clamp(hy,-1.1,1.1)})}
    const show=me.seat>=0||nearSeat>=0;$('sit').classList.toggle('hidden',!show);$('sit').textContent=me.seat>=0?'LEVANTAR':'SENTAR';
    remotes.forEach(r=>{
      let tp=r.pos,yaw=r.yaw;
      if(r.seat>=0){const s=SEATS[r.seat];tp=dirv.set(s.x,0,s.z+.1);yaw=0}
      r.av.root.position.lerp(tp,1-Math.exp(-10*dt));r.cur+=wrap(yaw-r.cur)*Math.min(1,dt*10);r.av.root.rotation.y=r.cur;
      animate(r.av,r.seat>=0?'sit':r.anim,dt,r.hy)});
    $('pg').textContent=Math.round(clock.ping)+' ms';
  }else{ // lobby: câmera cinematográfica lenta
    camera.position.set(Math.sin(t*.12)*4,3.2+Math.sin(t*.2)*.4,12.5);camera.lookAt(0,2.6,-6);
    if(preview){preview.rotation.y=Math.sin(t*.5)*.5;animate(preview.userData.av,'idle',dt)}
  }
  fpsN++;fpsT+=dt;if(fpsT>1){$('fps').textContent=fpsN+' FPS';fpsN=0;fpsT=0}
  renderer.render(scene,camera);
}

// ---- inicialização ----
const tick=()=>new Promise(r=>setTimeout(r,16));
async function boot(){
  progress(5);await tick();
  buildCinema(scene,p=>progress(5+Math.round(p*.8)));await tick();
  me.av=makeAvatar({g:0,hair:0,top:0,bot:0,shoe:0,acc:0,skin:'#e0ac86',topC:'#1e3a8a',botC:'#1f2937',hairC:'#2a1a10'});
  scene.add(me.av.root);me.av.root.visible=false;me.av.root.traverse(o=>o.castShadow=true);
  initControls(canvas,{sens:()=>S.sens,onTap,onInteract:interact});
  initPlayerUI();initBrowser();initPanels(applySettings);setupNet();
  progress(92);
  const cfgNow=avatarEditor(cfg=>{
    prevCfg=cfg;
    if(preview){scene.remove(preview)}
    const a=makeAvatar(cfg);preview=new THREE.Group();preview.add(a.root);preview.userData.av=a;preview.position.set(0,0,9.5);
    a.root.traverse(o=>o.castShadow=true);scene.add(preview);
  });
  const nm=localStorage.getItem('cvname');if(nm)$('name').value=nm;
  const rebuildMe=()=>{scene.remove(me.av.root);me.av=makeAvatar(prevCfg);scene.add(me.av.root);me.av.root.traverse(o=>o.castShadow=true)};
  const err=m=>$('err').textContent=m||'';
  const ident=()=>{const n=$('name').value.trim()||'Visitante';localStorage.setItem('cvname',n);rebuildMe();return{name:n,avatar:prevCfg}};
  $('tjoin').onclick=()=>{$('tjoin').classList.add('on');$('tcreate').classList.remove('on');$('pjoin').classList.remove('hidden');$('pcreate').classList.add('hidden')};
  $('tcreate').onclick=()=>{$('tcreate').classList.add('on');$('tjoin').classList.remove('on');$('pcreate').classList.remove('hidden');$('pjoin').classList.add('hidden')};
  $('bjoin').onclick=async()=>{err();const r=await emit('join',{...ident(),code:$('code').value,password:$('jpass').value});r.ok?enter(r,true):err(r.err||'Erro')};
  $('bcreate').onclick=async()=>{err();const r=await emit('create',{...ident(),pub:$('cpub').checked,password:$('cpass').value,max:+$('cmax').value});r.ok?enter(r,true):err(r.err||'Erro')};
  $('bleave').onclick=()=>{socket.emit('leave');sessionStorage.removeItem('cvroom');location.reload()};
  $('csend').onclick=()=>{const v=$('cin').value.trim();if(v){socket.emit('chat',{t:v});$('cin').value=''}};
  $('cin').onkeydown=e=>{e.stopPropagation();if(e.key==='Enter')$('csend').onclick()};
  const pubs=async()=>{const l=await emit('rooms');const b=$('pubs');b.innerHTML='';(Array.isArray(l)?l:[]).forEach(r=>{const x=document.createElement('button');x.textContent=`${r.code} • ${r.n}/${r.max}${r.lock?' 🔒':''}`;x.onclick=()=>{$('code').value=r.code};b.appendChild(x)})};
  socket.on('connect',pubs);if(socket.connected)pubs();
  applySettings();loop();progress(100);await tick();
  $('loading').classList.add('hidden');$('home').classList.remove('hidden');
  const c=new URLSearchParams(location.search).get('sala');if(c)$('code').value=c.toUpperCase();
}
boot().catch(e=>{console.error(e);$('lpct').textContent='Erro ao carregar: '+e.message});
