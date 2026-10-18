import * as THREE from 'three';
export const BOUNDS={x:10.5,z0:-12.6,z1:14.5};
export const SEATS=[],colliders=[],seatMeshes=[],lights=[];
const XS=[-6,-4.2,-2.4,2.4,4.2,6];
[-7,-4.6,-2.2,.2].forEach((z,r)=>XS.forEach(x=>SEATS.push({id:SEATS.length,x,z,row:r})));
export let screenMat,defTex,key;
const NEON=['#38bdf8','#a855f7','#f5c451'];
export function buildCinema(scene,progress=()=>{}){
  const std=(c,o={})=>new THREE.MeshStandardMaterial({color:c,roughness:.7,metalness:.1,...o});
  const glow=c=>new THREE.MeshStandardMaterial({color:'#000',emissive:c,emissiveIntensity:1.6});
  const box=(w,h,d,m,x,y,z,col)=>{const b=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);b.position.set(x,y,z);scene.add(b);
    if(col)colliders.push({x0:x-w/2,x1:x+w/2,z0:z-d/2,z1:z+d/2});return b};
  scene.background=new THREE.Color('#05060a');scene.fog=new THREE.Fog('#05060a',20,70);
  scene.add(new THREE.HemisphereLight('#6674ff','#10101a',.55));
  const floor=box(22,.2,30,std('#0d0e15',{roughness:.28,metalness:.55}),0,-.1,.5);floor.receiveShadow=true;
  box(22,.2,30,std('#07080d'),0,8,.5);
  const wall=std('#12131c');
  box(22,8,.4,wall,0,4,-14.6);box(22,8,.4,wall,0,4,15.2);box(.4,8,30,wall,-11,4,.5);box(.4,8,30,wall,11,4,.5);
  box(8.5,8,.4,wall,-6.35,4,6.6,true);box(8.5,8,.4,wall,6.35,4,6.6,true);box(3,2,.4,wall,0,7,6.6);
  [[-1.6],[1.6]].forEach(([x])=>box(.1,6,.1,glow('#f5c451'),x,3,6.6));
  progress(25);
  // tela
  const cv=document.createElement('canvas');cv.width=1024;cv.height=432;const g=cv.getContext('2d');
  const gr=g.createLinearGradient(0,0,1024,432);gr.addColorStop(0,'#0b1020');gr.addColorStop(.5,'#1a0f33');gr.addColorStop(1,'#0b1020');g.fillStyle=gr;g.fillRect(0,0,1024,432);
  g.fillStyle='#f5c451';g.font='700 70px sans-serif';g.textAlign='center';g.fillText('CINEVERSE 3D',512,220);
  g.fillStyle='#8ab4ff';g.font='28px sans-serif';g.fillText('Assista junto. Mesmo estando longe.',512,275);
  defTex=new THREE.CanvasTexture(cv);defTex.colorSpace=THREE.SRGBColorSpace;
  box(16.8,7.4,.15,std('#050505'),0,5.2,-14.3);
  screenMat=new THREE.MeshBasicMaterial({map:defTex});
  const sc=new THREE.Mesh(new THREE.PlaneGeometry(16,6.75),screenMat);sc.position.set(0,5.2,-14.2);scene.add(sc);
  box(16.9,.06,.2,glow('#f5c451'),0,8.92-1.5,-14.25);box(16.9,.06,.2,glow('#a855f7'),0,1.46,-14.25);
  box(16,.4,2,std('#101018'),0,.2,-13.2,true);
  progress(45);
  // LEDs
  [-1.2,1.2].forEach(x=>box(.06,.02,15,glow('#38bdf8'),x,.01,-1));
  [-10.9,10.9].forEach((x,i)=>{box(.06,.08,28,glow(NEON[i]),x,.3,.5);box(.06,.08,28,glow(NEON[2-i]),x,6.5,.5)});
  for(let z=-12;z<=14;z+=3.2)[-10.8,10.8].forEach((x,i)=>box(.1,2.4,.1,glow(NEON[(z/3.2|0)&1?1:0]),x,3.2,z));
  box(22,.06,.06,glow('#a855f7'),0,7.2,-14.35);
  // poltronas
  const sm=std('#1b1c28',{roughness:.55}),sm2=std('#2a1c44');
  SEATS.forEach(s=>{
    const gp=new THREE.Group();gp.position.set(s.x,0,s.z);gp.userData.seat=s.id;
    const mk=(w,h,d,m,x,y,z)=>{const b=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);b.position.set(x,y,z);b.castShadow=true;gp.add(b)};
    mk(1,.4,.9,sm,0,.25,0);mk(.9,.12,.8,sm2,0,.5,-.02);mk(1,.9,.2,sm,0,.8,.42);mk(.12,.3,.8,sm,-.55,.5,0);mk(.12,.3,.8,sm,.55,.5,0);
    mk(.9,.04,.05,glow(NEON[s.row%3]),0,1.26,.42);
    scene.add(gp);seatMeshes.push(gp);colliders.push({x0:s.x-.55,x1:s.x+.55,z0:s.z-.45,z1:s.z+.5});
  });
  progress(70);
  // lobby
  box(5,1.1,.9,std('#14141c'),0,.55,11.5,true);box(5,.05,.95,glow('#f5c451'),0,1.12,11.5);
  [-8,8].forEach((x,i)=>{const pc=document.createElement('canvas');pc.width=128;pc.height=192;const p=pc.getContext('2d');
    const q=p.createLinearGradient(0,0,128,192);q.addColorStop(0,i?'#a855f7':'#38bdf8');q.addColorStop(1,'#0b0b14');p.fillStyle=q;p.fillRect(0,0,128,192);
    const t=new THREE.CanvasTexture(pc);t.colorSpace=THREE.SRGBColorSpace;const m=new THREE.Mesh(new THREE.PlaneGeometry(2,3),new THREE.MeshBasicMaterial({map:t}));m.position.set(x,3,14.95);m.rotation.y=Math.PI;scene.add(m)});
  [-9,9].forEach(x=>{box(.1,3.4,2,glow('#38bdf8'),x<0?-10.8:10.8,1.7,11);});
  // luzes
  [['#38bdf8',-8,-6],['#a855f7',8,-6],['#f5c451',0,-12],['#a855f7',-8,2],['#38bdf8',8,2],['#f5c451',0,11]].forEach(([c,x,z])=>{
    const l=new THREE.PointLight(c,14,18,1.6);l.position.set(x,5,z);scene.add(l);lights.push(l)});
  key=new THREE.SpotLight('#ffffff',60,40,.8,.6);key.position.set(0,7.5,6);key.target.position.set(0,0,-4);scene.add(key,key.target);
  progress(100);
}
export const setLights=n=>lights.forEach((l,i)=>l.visible=i<n);
export const setScreen=t=>{screenMat.map=t||defTex;screenMat.needsUpdate=true};
