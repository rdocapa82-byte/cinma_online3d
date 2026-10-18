import * as THREE from 'three';
import {BOUNDS} from './cinema.js';
import {look} from './controls.js';
export const cam={yaw:0,pitch:.12};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function updateCamera(camera,pos,seated,third){
  cam.yaw-=look.dx;cam.pitch=clamp(cam.pitch+look.dy*-1,-1.2,1.2);look.dx=look.dy=0;
  if(seated)cam.yaw=clamp(cam.yaw,-1.3,1.3);
  const eye=new THREE.Vector3(pos.x,pos.y+(seated?1.38:1.62),pos.z);
  camera.rotation.order='YXZ';
  if(!third||seated){camera.position.copy(eye);camera.rotation.set(-cam.pitch,cam.yaw,0);return false}
  const d=3,cp=Math.cos(cam.pitch);
  const p=new THREE.Vector3(Math.sin(cam.yaw)*cp*d,Math.sin(cam.pitch)*d+.2,Math.cos(cam.yaw)*cp*d).add(eye);
  p.x=clamp(p.x,-BOUNDS.x+.2,BOUNDS.x-.2);p.z=clamp(p.z,BOUNDS.z0+.2,BOUNDS.z1-.2);p.y=clamp(p.y,.4,7.5);
  camera.position.copy(p);camera.lookAt(eye);return true;
}
