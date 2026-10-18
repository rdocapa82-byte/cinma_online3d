export const input={mx:0,mz:0,run:false,keys:{}};
export const look={dx:0,dy:0};
export function initControls(canvas,{sens,onTap,onInteract}){
  const k=input.keys;
  addEventListener('keydown',e=>{if(/INPUT|SELECT|TEXTAREA/.test(e.target.tagName))return;k[e.code]=1;if(e.code==='KeyE')onInteract()});
  addEventListener('keyup',e=>{k[e.code]=0});
  const joy=document.getElementById('joy'),knob=joy.firstElementChild;let jid=null;
  const jm=e=>{const r=joy.getBoundingClientRect(),R=r.width/2;let x=e.clientX-r.left-R,y=e.clientY-r.top-R;const l=Math.hypot(x,y);if(l>R*.8){x*=R*.8/l;y*=R*.8/l}
    knob.style.transform=`translate(${x}px,${y}px)`;input.jx=x/(R*.8);input.jy=-y/(R*.8)};
  joy.addEventListener('pointerdown',e=>{jid=e.pointerId;joy.setPointerCapture(jid);jm(e)});
  joy.addEventListener('pointermove',e=>{if(e.pointerId===jid)jm(e)});
  const jend=e=>{if(e.pointerId===jid){jid=null;input.jx=input.jy=0;knob.style.transform=''}};
  joy.addEventListener('pointerup',jend);joy.addEventListener('pointercancel',jend);
  const run=document.getElementById('run');
  run.addEventListener('click',()=>{input.run=!input.run;run.classList.toggle('on',input.run)});
  const drag=new Map();
  canvas.addEventListener('pointerdown',e=>{drag.set(e.pointerId,{x:e.clientX,y:e.clientY,sx:e.clientX,sy:e.clientY,t:Date.now()});canvas.setPointerCapture(e.pointerId)});
  canvas.addEventListener('pointermove',e=>{const d=drag.get(e.pointerId);if(!d)return;
    look.dx+=(e.clientX-d.x)*.005*sens();look.dy+=(e.clientY-d.y)*.005*sens();d.x=e.clientX;d.y=e.clientY});
  const up=e=>{const d=drag.get(e.pointerId);drag.delete(e.pointerId);
    if(d&&e.type==='pointerup'&&Math.hypot(e.clientX-d.sx,e.clientY-d.sy)<8&&Date.now()-d.t<350)onTap(e.clientX,e.clientY)};
  canvas.addEventListener('pointerup',up);canvas.addEventListener('pointercancel',up);
}
export function readMove(){
  const k=input.keys;let x=(input.jx||0)+((k.KeyD||k.ArrowRight)?1:0)-((k.KeyA||k.ArrowLeft)?1:0);
  let z=(input.jy||0)+((k.KeyW||k.ArrowUp)?1:0)-((k.KeyS||k.ArrowDown)?1:0);
  const l=Math.hypot(x,z);if(l>1){x/=l;z/=l}
  return{x,z,l:Math.min(l,1),run:input.run||!!(k.ShiftLeft||k.ShiftRight)};
}
