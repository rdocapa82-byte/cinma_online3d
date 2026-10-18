import {socket} from './socket.js';
const $=id=>document.getElementById(id);
const hist=[];let idx=-1,canCtl=false;
const TILES=[['Wikipedia','https://pt.wikipedia.org'],['Internet Archive','https://archive.org'],['Vimeo','https://vimeo.com'],['Dailymotion','https://www.dailymotion.com']];
export function normalize(s){
  s=(s||'').trim();if(!s)return'about:home';
  if(/^(javascript|data|file|blob|vbscript|about):/i.test(s))return null;
  if(/^https?:\/\//i.test(s)){try{const u=new URL(s);u.protocol='https:';return u.href}catch{return null}}
  if(/^[^\s]+\.[a-z]{2,}(:\d+)?(\/\S*)?$/i.test(s))return'https://'+s;
  return'https://duckduckgo.com/?q='+encodeURIComponent(s);
}
function show(w){['b_home_pg','b_block','b_frame'].forEach(i=>$(i).classList.toggle('hidden',i!==w))}
async function load(url){
  $('b_addr').value=url==='about:home'?'':url;
  if(url==='about:home'){$('b_frame').src='about:blank';return show('b_home_pg')}
  let ok=true;try{ok=(await(await fetch('/api/embeddable?url='+encodeURIComponent(url))).json()).ok}catch{}
  if(!ok){$('b_new').onclick=()=>window.open(url,'_blank','noopener,noreferrer');return show('b_block')}
  $('b_frame').src=url;show('b_frame');
}
function go(url,push=true,share=true){
  if(!url)return;
  if(push){hist.splice(idx+1);hist.push(url);idx=hist.length-1}
  load(url);if(share&&canCtl&&url!=='about:home')socket.emit('vset',{kind:'web',url});
}
export const openBrowser=()=>$('browser').removeAttribute('hidden');
export const setCtl=c=>{canCtl=c;$('b_addr').readOnly=!c;$('b_vurl').disabled=!c};
export function remoteWeb(url){openBrowser();go(url,true,false)}
export function initBrowser(){
  const t=document.querySelector('.tiles');
  TILES.forEach(([n,u])=>{const b=document.createElement('button');b.textContent=n;b.onclick=()=>canCtl&&go(u);t.appendChild(b)});
  $('bro').onclick=()=>$('browser').toggleAttribute('hidden');
  $('b_x').onclick=()=>$('browser').setAttribute('hidden','');
  $('b_back').onclick=()=>{if(idx>0){idx--;load(hist[idx]);canCtl&&hist[idx]!=='about:home'&&socket.emit('vset',{kind:'web',url:hist[idx]})}};
  $('b_fwd').onclick=()=>{if(idx<hist.length-1){idx++;load(hist[idx]);canCtl&&hist[idx]!=='about:home'&&socket.emit('vset',{kind:'web',url:hist[idx]})}};
  $('b_ref').onclick=()=>hist[idx]&&load(hist[idx]);
  $('b_home').onclick=()=>go('about:home',true,false);
  $('b_fs').onclick=()=>{const b=$('browser');document.fullscreenElement?document.exitFullscreen():b.requestFullscreen&&b.requestFullscreen()};
  $('b_addr').onkeydown=e=>{if(e.key==='Enter'&&canCtl){const u=normalize(e.target.value);u?go(u):(e.target.value='Endereço inválido')}};
  const vg=()=>{if(!canCtl)return;try{const u=new URL($('b_vurl').value.trim());if(!/^https?:$/.test(u.protocol))throw 0;socket.emit('vset',{kind:'video',url:u.href});$('browser').setAttribute('hidden','')}catch{$('b_vurl').value='';$('b_vurl').placeholder='URL inválida (use http/https)'}};
  $('b_vgo').onclick=vg;$('b_vurl').onkeydown=e=>e.key==='Enter'&&vg();
  go('about:home',true,false);
}
