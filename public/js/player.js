import * as THREE from 'three';
import {socket,emit,now} from './socket.js';
import {setScreen} from './cinema.js';
import {S} from './settings.js';
import {ambient} from './audio.js';
export const vid=document.getElementById('vid');
const tex=new THREE.VideoTexture(vid);tex.colorSpace=THREE.SRGBColorSpace;
let V=null,canCtl=false,myPid=null,stream=null,corsFallback=false;const pcs=new Map();
const $=id=>document.getElementById(id);
const ICE={iceServers:[{urls:'stun:stun.l.google.com:19302'}]};
vid.crossOrigin='anonymous';
const expected=v=>v.playing?v.time+(now()-v.ts)/1000:v.time;
const fmt=t=>{t=Math.max(0,t|0);return(t/60|0)+':'+String(t%60).padStart(2,'0')};
export const setVolume=()=>{if(V)vid.volume=Math.min(1,V.vol*S.vol)};
vid.onerror=()=>{ // sem CORS o vídeo não vira textura 3D: exibe em overlay (sem contornar nada)
  if(vid.crossOrigin&&V&&V.kind==='video'&&!corsFallback){corsFallback=true;vid.removeAttribute('crossorigin');vid.classList.add('ov');vid.controls=false;vid.src=V.url;vid.load()}};
function drift(hard){
  if(!V||V.kind!=='video'||!vid.src||vid.readyState<1)return;
  const t=expected(V),d=t-vid.currentTime;
  if(!V.playing){if(Math.abs(d)>.3)vid.currentTime=t;vid.playbackRate=1;return}
  const a=Math.abs(d);
  if(a<.5){if(vid.playbackRate!==1)vid.playbackRate=1}
  else if(a<2.5&&!hard)vid.playbackRate=1+Math.sign(d)*.06;
  else{vid.currentTime=t;vid.playbackRate=1}
}
setInterval(()=>{if(!canCtl)drift(false)},1000);
vid.onloadedmetadata=()=>drift(true);
export function applyVideo(v,ctl,pid){
  V=v;canCtl=ctl;myPid=pid;setVolume();updateBar();
  if(v.kind!=='screen')closeRtc();
  if(v.kind==='video'){
    vid.classList.toggle('ov',corsFallback);
    if(vid.getAttribute('data-u')!==v.url){corsFallback=false;vid.classList.remove('ov');vid.crossOrigin='anonymous';vid.setAttribute('data-u',v.url);vid.srcObject=null;vid.src=v.url;vid.load()}
    else drift(true);
    setScreen(tex);
    if(v.playing)vid.play().catch(()=>{vid.muted=true;vid.play().catch(()=>{});toast2('Toque em ▶ para ativar o som')});else vid.pause();
    vid.muted=false;
  }else if(v.kind==='screen'){
    vid.classList.remove('ov');setScreen(tex);
    if(v.sharer===pid&&stream){vid.srcObject=stream;vid.muted=true;vid.play().catch(()=>{})}
    else{vid.removeAttribute('data-u');emit('rtc',{to:v.sharer,data:{want:1}})}
  }else{vid.pause();vid.removeAttribute('src');vid.removeAttribute('data-u');vid.srcObject=null;vid.classList.remove('ov');setScreen(null)}
  ambient(v.kind!=='none'&&v.kind!=='web'&&v.playing,S.vol);
  $('bar').classList.toggle('ro',!ctl);
}
const toast2=m=>window.dispatchEvent(new CustomEvent('cv-toast',{detail:m}));
function updateBar(){$('pp').textContent=V&&V.playing?'⏸':'▶'}
vid.addEventListener('timeupdate',()=>{if(vid.duration&&!$('seek').matches(':active'))$('seek').value=vid.currentTime/vid.duration*1000;$('tm').textContent=fmt(vid.currentTime)});
export function initPlayerUI(){
  const cmd=(a,x={})=>canCtl&&V&&V.kind==='video'&&socket.emit('vctl',{a,t:vid.currentTime,...x});
  $('pp').onclick=()=>{vid.muted=false;V&&V.playing?cmd('pause'):cmd('play')};
  $('bk').onclick=()=>cmd('seek',{t:Math.max(0,vid.currentTime-10)});
  $('fw').onclick=()=>cmd('seek',{t:vid.currentTime+10});
  $('seek').onchange=e=>vid.duration&&cmd('seek',{t:e.target.value/1000*vid.duration});
  $('vol').oninput=e=>{canCtl?socket.emit('vctl',{a:'vol',vol:+e.target.value}):0};
  $('sy').onclick=()=>cmd('sync');
  $('fs').onclick=()=>{const f=vid.requestFullscreen||vid.webkitEnterFullscreen||vid.webkitRequestFullscreen;f&&f.call(vid)};
  $('bcast').onclick=()=>stream?stopShare():startShare();
  window.addEventListener('pointerdown',()=>{if(V&&V.kind==='video'&&V.playing&&vid.paused)vid.play().catch(()=>{})},{once:true});
}
// ---- compartilhamento de tela (API oficial; o navegador pede autorização) ----
async function startShare(){
  if(!canCtl)return toast2('Apenas quem tem controle pode compartilhar');
  if(!navigator.mediaDevices||!navigator.mediaDevices.getDisplayMedia)return toast2('Seu navegador não suporta compartilhar tela');
  try{stream=await navigator.mediaDevices.getDisplayMedia({video:true,audio:true})}catch{return toast2('Compartilhamento cancelado')}
  stream.getVideoTracks()[0].onended=stopShare;socket.emit('sstart');
}
function stopShare(){if(stream){stream.getTracks().forEach(t=>t.stop());stream=null;socket.emit('sstop')}}
function closeRtc(){pcs.forEach(p=>p.close());pcs.clear();if(!stream)return}
export async function onRtc({from,data}){
  try{
    let pc=pcs.get(from);
    if(data.want&&stream){
      pc&&pc.close();pc=new RTCPeerConnection(ICE);pcs.set(from,pc);
      stream.getTracks().forEach(t=>pc.addTrack(t,stream));
      pc.onicecandidate=e=>e.candidate&&socket.emit('rtc',{to:from,data:{ice:e.candidate}});
      await pc.setLocalDescription(await pc.createOffer());socket.emit('rtc',{to:from,data:{sdp:pc.localDescription}});
    }else if(data.sdp&&data.sdp.type==='offer'){
      pc&&pc.close();pc=new RTCPeerConnection(ICE);pcs.set(from,pc);
      pc.ontrack=e=>{vid.srcObject=e.streams[0];vid.muted=false;vid.play().catch(()=>{vid.muted=true;vid.play().catch(()=>{})})};
      pc.onicecandidate=e=>e.candidate&&socket.emit('rtc',{to:from,data:{ice:e.candidate}});
      await pc.setRemoteDescription(data.sdp);await pc.setLocalDescription(await pc.createAnswer());
      socket.emit('rtc',{to:from,data:{sdp:pc.localDescription}});
    }else if(data.sdp&&pc)await pc.setRemoteDescription(data.sdp);
    else if(data.ice&&pc)await pc.addIceCandidate(data.ice).catch(()=>{});
  }catch(e){console.warn('rtc',e)}
}
