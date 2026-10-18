import {S,save} from './settings.js';
export const $=id=>document.getElementById(id);
let tt;export function toast(m){const t=$('toast');t.textContent=m;t.classList.add('on');clearTimeout(tt);tt=setTimeout(()=>t.classList.remove('on'),2600)}
window.addEventListener('cv-toast',e=>toast(e.detail));
export function progress(p){$('lbar').style.width=p+'%';$('lpct').textContent=p+'%'}
const F=[['g','Gênero',['Masculino','Feminino']],['hair','Cabelo',['Curto','Médio','Longo','Rabo de cavalo','Black power']],['top','Roupa',['Camiseta','Moletom','Jaqueta','Regata']],['bot','Calça',['Jeans','Shorts','Saia','Jogger']],['shoe','Tênis',['Branco','Bota','Neon']],['acc','Acessório',['Nenhum','Óculos','Boné','Fone','Mochila']]];
const C=[['skin','Pele'],['hairC','Cabelo'],['topC','Roupa'],['botC','Calça']];
const DEF={g:0,hair:0,top:0,bot:0,shoe:0,acc:0,skin:'#e0ac86',hairC:'#2a1a10',topC:'#1e3a8a',botC:'#1f2937'};
export function avatarEditor(onChange){
  let cfg={...DEF};try{Object.assign(cfg,JSON.parse(localStorage.getItem('cvav')||'{}'))}catch{}
  const box=$('avedit');box.innerHTML='';
  const ch=()=>{try{localStorage.setItem('cvav',JSON.stringify(cfg))}catch{}onChange(cfg)};
  F.forEach(([k,l,o])=>{const lb=document.createElement('label');lb.textContent=l;const s=document.createElement('select');
    o.forEach((n,i)=>s.add(new Option(n,i)));s.value=cfg[k];s.onchange=()=>{cfg[k]=+s.value;ch()};lb.appendChild(s);box.appendChild(lb)});
  C.forEach(([k,l])=>{const lb=document.createElement('label');lb.textContent=l;const i=document.createElement('input');i.type='color';i.value=cfg[k];i.oninput=()=>{cfg[k]=i.value;ch()};lb.appendChild(i);box.appendChild(lb)});
  onChange(cfg);return cfg;
}
const T=ts=>new Date(ts).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});
export function addChat(m){ // textContent => sem XSS
  const p=document.createElement('p'),s=document.createElement('small'),b=document.createElement('b'),t=document.createElement('span');
  s.textContent=T(m.ts)+' ';b.textContent=m.name+': ';t.textContent=m.t;p.append(s,b,t);
  const l=$('msgs');l.appendChild(p);while(l.children.length>150)l.firstChild.remove();l.scrollTop=l.scrollHeight;
}
export function sysChat(t){addChat({ts:Date.now(),name:'•',t})}
export function renderPlayers(list,room,me,act){
  const l=$('plist');l.innerHTML='';
  list.forEach(p=>{const d=document.createElement('div');d.className='pl';const n=document.createElement('span');
    n.textContent=(p.id===room.owner?'👑 ':room.ctrl.has(p.id)?'🎬 ':'')+p.name+(p.id===me?' (você)':'');d.appendChild(n);
    if(room.owner===me&&p.id!==me){
      const c=document.createElement('button');c.textContent=room.ctrl.has(p.id)?'Tirar 🎬':'Dar 🎬';c.onclick=()=>act('perm',p.id,!room.ctrl.has(p.id));
      const k=document.createElement('button');k.textContent='Expulsar';k.onclick=()=>act('kick',p.id);d.append(c,k)}
    l.appendChild(d)});
}
export function initPanels(apply){
  document.querySelectorAll('#side [data-p]').forEach(b=>b.onclick=()=>{const t=$(b.dataset.p),open=t.classList.contains('hidden');
    ['chat','pl','set'].forEach(i=>$(i).classList.add('hidden'));if(open)t.classList.remove('hidden')});
  const emo=document.querySelector('.emo');['😀','😂','😍','👍','🔥','😮','😢','🎬','🍿'].forEach(e=>{const b=document.createElement('button');b.textContent=e;b.onclick=()=>{$('cin').value+=e;$('cin').focus()};emo.appendChild(b)});
  [['vol','s_vol'],['sens','s_sens'],['q','s_q'],['view','s_view']].forEach(([k,id])=>{const e=$(id);e.value=S[k];e.oninput=()=>{S[k]=e.type==='range'?+e.value:e.value;save();apply()}});
  [['names','s_names'],['chat','s_chat'],['fps','s_fps'],['ping','s_ping']].forEach(([k,id])=>{const e=$(id);e.checked=S[k];e.onchange=()=>{S[k]=e.checked;save();apply()}});
  $('eye').onclick=()=>{document.body.classList.toggle('nohud')};
}
