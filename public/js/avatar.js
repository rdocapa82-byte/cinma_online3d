import * as THREE from 'three';
const mat=(c,r=.8)=>new THREE.MeshStandardMaterial({color:c,roughness:r});
const cap=(r,l,m)=>new THREE.Mesh(new THREE.CapsuleGeometry(r,l,4,10),m);
const sph=(r,m)=>new THREE.Mesh(new THREE.SphereGeometry(r,14,10),m);
const dome=(r,m)=>new THREE.Mesh(new THREE.SphereGeometry(r,16,10,0,Math.PI*2,0,Math.PI/2),m);
const at=(o,x,y,z)=>{o.position.set(x,y,z);return o};
export function makeAvatar(c){
  const f=c.g===1,sk=mat(c.skin,.6),tp=mat(c.topC),bt=mat(c.botC),hr=mat(c.hairC,.5),dk=mat('#15161c');
  const root=new THREE.Group(),hips=new THREE.Group();hips.position.y=.95;root.add(hips);root.scale.setScalar(.95);
  const tw=f?.16:.2,sleeve=c.top===3?sk:tp;
  const torso=cap(tw,.36,c.top===3?sk:tp);torso.scale.set(c.top===1?1.15:1,1,.72);at(torso,0,.3,0);hips.add(torso);
  if(c.top===3){const t=cap(tw*1.02,.2,tp);t.scale.set(1,1,.74);at(t,0,.28,0);hips.add(t)}
  if(c.top===2){const s=new THREE.Mesh(new THREE.BoxGeometry(.04,.5,.3),mat('#f5c451'));at(s,0,.3,-.005);hips.add(s)}
  hips.add(at(cap(f?.2:.19,.04,bt),0,-.02,0));
  if(c.bot===2){const k=new THREE.Mesh(new THREE.CylinderGeometry(.2,.3,.34,14),bt);at(k,0,-.15,0);hips.add(k)}
  const arm=s=>{const sh=new THREE.Group();at(sh,s*(tw+.1),.55,0);
    const u=cap(.06,.2,c.top===0?tp:sleeve);at(u,0,-.17,0);sh.add(u);
    const el=new THREE.Group();at(el,0,-.34,0);sh.add(el);
    const l=cap(.055,.2,c.top===0||c.top===3?sk:tp);at(l,0,-.17,0);el.add(l);el.add(at(sph(.06,sk),0,-.36,0));hips.add(sh);return{sh,el}};
  const A=[arm(-1),arm(1)];
  const leg=s=>{const hp=new THREE.Group();at(hp,s*.1,-.02,0);
    const u=cap(.085,.3,c.bot===2?sk:bt);at(u,0,-.22,0);hp.add(u);
    const kn=new THREE.Group();at(kn,0,-.43,0);hp.add(kn);
    const lo=cap(.07,.3,c.bot===1||c.bot===2?sk:bt);at(lo,0,-.22,0);kn.add(lo);
    const sm=mat(['#eeeeee','#3a2a22','#22d3ee'][c.shoe],.5);
    const sh=new THREE.Mesh(new THREE.BoxGeometry(.13,.08,.28),sm);at(sh,0,-.46,-.06);kn.add(sh);hips.add(hp);return{hp,kn}};
  const L=[leg(-1),leg(1)];
  const head=new THREE.Group();at(head,0,.76,0);hips.add(head);
  const hd=sph(f?.12:.13,sk);hd.scale.y=1.12;at(hd,0,.1,0);head.add(hd);
  [-1,1].forEach(s=>head.add(at(sph(.017,dk),s*.045,.12,-.115)));
  const hy=.11;
  if(c.hair===0)head.add(at(dome(.138,hr),0,hy,0));
  if(c.hair===1){head.add(at(dome(.145,hr),0,hy+.01,.01));head.add(at(cap(.12,.04,hr),0,hy-.02,.06))}
  if(c.hair===2){head.add(at(dome(.145,hr),0,hy+.01,.01));const b=cap(.13,.28,hr);b.scale.z=.6;head.add(at(b,0,hy-.12,.08))}
  if(c.hair===3){head.add(at(dome(.14,hr),0,hy,0));const b=cap(.045,.2,hr);b.rotation.x=.5;head.add(at(b,0,hy-.02,.17))}
  if(c.hair===4)head.add(at(sph(.2,hr),0,hy+.04,.01));
  if(c.acc===1)[-1,1].forEach(s=>{const t=new THREE.Mesh(new THREE.TorusGeometry(.035,.007,6,14),dk);head.add(at(t,s*.05,.12,-.12))});
  if(c.acc===2){head.add(at(dome(.15,dk),0,hy+.02,0));head.add(at(new THREE.Mesh(new THREE.BoxGeometry(.2,.015,.12),dk),0,hy+.03,-.15))}
  if(c.acc===3){const t=new THREE.Mesh(new THREE.TorusGeometry(.15,.012,6,16,Math.PI),dk);t.rotation.z=0;head.add(at(t,0,.12,0));
    [-1,1].forEach(s=>{const e=new THREE.Mesh(new THREE.CylinderGeometry(.04,.04,.03,10),new THREE.MeshStandardMaterial({color:'#111',emissive:'#38bdf8',emissiveIntensity:.8}));e.rotation.z=Math.PI/2;head.add(at(e,s*.15,.12,0))})}
  if(c.acc===4)hips.add(at(new THREE.Mesh(new THREE.BoxGeometry(.28,.38,.12),mat('#7c3aed')),0,.33,.17));
  return{root,hips,head,A,L,t:0,c:{hy:.95,l0:0,l1:0,k0:0,k1:0,s0:0,s1:0,e:.1,lean:0,hd:0}};
}
export function animate(a,anim,dt,hd=0){
  const sit=anim==='sit',run=anim==='run',walk=run||anim==='walk';
  a.t+=dt*(run?12:walk?8:1.6);const s=Math.sin(a.t),amp=run?1:.6,k=1-Math.exp(-14*dt),c=a.c;
  const T={hy:sit?.55:.95,l0:sit?1.45:walk?s*amp:0,l1:sit?1.45:walk?-s*amp:0,
    k0:sit?-1.45:walk?Math.max(0,-s)*amp*1.6:0,k1:sit?-1.45:walk?Math.max(0,s)*amp*1.6:0,
    s0:sit?.5:walk?-s*amp*.8:Math.sin(a.t)*.03,s1:sit?.5:walk?s*amp*.8:-Math.sin(a.t)*.03,
    e:sit?.6:run?1.3:walk?.3:.1,lean:run?-.25:0,hd:Math.max(-1.1,Math.min(1.1,hd))};
  for(const q in T)c[q]+=(T[q]-c[q])*k;
  a.hips.position.y=c.hy+(sit||walk?0:Math.sin(a.t)*.004);a.hips.rotation.x=c.lean;
  a.L[0].hp.rotation.x=c.l0;a.L[1].hp.rotation.x=c.l1;a.L[0].kn.rotation.x=c.k0;a.L[1].kn.rotation.x=c.k1;
  a.A[0].sh.rotation.x=c.s0;a.A[1].sh.rotation.x=c.s1;a.A[0].el.rotation.x=c.e;a.A[1].el.rotation.x=c.e;
  a.head.rotation.y=c.hd;
}
export function makeTag(name){
  const cv=document.createElement('canvas');cv.width=256;cv.height=64;const g=cv.getContext('2d');
  g.font='600 30px sans-serif';g.textAlign='center';g.textBaseline='middle';g.fillStyle='rgba(0,0,0,.45)';
  const w=Math.min(250,g.measureText(name).width+28);g.beginPath();g.roundRect(128-w/2,8,w,48,24);g.fill();
  g.fillStyle='#fff';g.fillText(name,128,33);
  const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(cv),transparent:true,depthWrite:false}));
  sp.scale.set(.9,.225,1);sp.position.y=2.0;return sp;
}
