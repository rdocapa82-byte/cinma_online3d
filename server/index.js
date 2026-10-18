const express=require('express'),http=require('http'),path=require('path'),crypto=require('crypto');
const {Server}=require('socket.io');
const app=express(),srv=http.createServer(app);
const io=new Server(srv,{pingInterval:8000,pingTimeout:10000,maxHttpBufferSize:5e4});
app.use('/vendor',express.static(path.join(__dirname,'..','node_modules','three','build')));
app.use(express.static(path.join(__dirname,'..','public')));
app.get('/health',(_,s)=>s.send('ok'));

// Apenas DETECTA se o site declara bloquear incorporação (X-Frame-Options / frame-ancestors). Não contorna nada.
const PRIV=/^(localhost|127\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.|0\.|\[?::1?\]?$)/;
app.get('/api/embeddable',async(req,res)=>{
  try{
    const u=new URL(String(req.query.url||''));
    if(!/^https?:$/.test(u.protocol)||PRIV.test(u.hostname))return res.json({ok:false});
    const r=await fetch(u,{redirect:'follow',signal:AbortSignal.timeout(5000),headers:{'user-agent':'CineverseCheck/1.0'}});
    const xfo=(r.headers.get('x-frame-options')||'').toLowerCase(),csp=(r.headers.get('content-security-policy')||'').toLowerCase();
    const m=csp.match(/frame-ancestors([^;]*)/);
    try{r.body&&r.body.cancel()}catch{}
    res.json({ok:!(/deny|sameorigin/.test(xfo)||(m&&!/\*/.test(m[1])))});
  }catch{res.json({ok:true,unknown:true})}
});

const rooms=new Map(),AL='ABCDEFGHJKMNPQRSTUVWXYZ23456789',GRACE=30000,NSEATS=24;
const mkcode=()=>{let c;do{c=Array.from({length:5},()=>AL[crypto.randomInt(AL.length)]).join('')}while(rooms.has(c));return c};
const hash=(p,s)=>crypto.scryptSync(p,s,32);
const S=(v,n)=>typeof v==='string'?v.replace(/[\u0000-\u001f<>]/g,'').trim().slice(0,n):'';
const hex=v=>/^#[0-9a-f]{6}$/i.test(v)?v:'#888888';
const I=(v,a,b)=>Math.min(b,Math.max(a,Number.isFinite(+v)?Math.floor(+v):a));
const F=(v,a,b)=>Math.min(b,Math.max(a,Number.isFinite(+v)?+v:0));
const avatar=a=>{a=a||{};return{g:I(a.g,0,1),hair:I(a.hair,0,4),top:I(a.top,0,3),bot:I(a.bot,0,3),shoe:I(a.shoe,0,2),acc:I(a.acc,0,4),skin:hex(a.skin),topC:hex(a.topC),botC:hex(a.botC),hairC:hex(a.hairC)}};
const cleanUrl=v=>{try{const u=new URL(String(v));return/^https?:$/.test(u.protocol)&&String(v).length<2000?u.href:null}catch{return null}};
const ANIMS=['idle','walk','run','sit'];
const pub=p=>({id:p.pid,name:p.name,avatar:p.avatar,pos:p.pos,yaw:p.yaw,anim:p.anim,seat:p.seat,hy:p.hy});
const newPlayer=d=>({pid:crypto.randomBytes(4).toString('hex'),token:crypto.randomBytes(16).toString('hex'),name:S(d.name,16)||'Visitante',avatar:avatar(d.avatar),pos:[0,0,11],yaw:0,anim:'idle',seat:-1,hy:0,sock:null,timer:null,t:0,tc:0});
const snap=(r,p)=>({code:r.code,me:p.pid,token:p.token,owner:r.owner,ctrl:[...r.ctrl],players:[...r.players.values()].map(pub),video:r.video,now:Date.now(),max:r.max});
const cur=v=>v.playing?v.time+(Date.now()-v.ts)/1000:v.time;
const canCtl=(r,p)=>r.owner===p.pid||r.ctrl.has(p.pid);

function attach(socket,r,p){p.sock=socket.id;clearTimeout(p.timer);socket.data.room=r.code;socket.data.pid=p.pid;socket.join(r.code)}
function remove(r,p){
  clearTimeout(p.timer);
  if(p.seat>=0&&r.seats.get(p.seat)===p.pid)r.seats.delete(p.seat);
  r.players.delete(p.pid);r.ctrl.delete(p.pid);
  io.to(r.code).emit('pl',{id:p.pid});
  if(r.video.sharer===p.pid){r.video={kind:'none',url:'',time:0,playing:false,ts:Date.now(),vol:r.video.vol};io.to(r.code).emit('video',r.video)}
  if(!r.players.size){rooms.delete(r.code);return}
  if(r.owner===p.pid){r.owner=[...r.players.keys()][0];io.to(r.code).emit('perm',{owner:r.owner,ctrl:[...r.ctrl]})}
}

io.on('connection',socket=>{
  const ctx=()=>{const r=rooms.get(socket.data.room),p=r&&r.players.get(socket.data.pid);return p&&p.sock===socket.id?{r,p}:{}};
  socket.on('p',(t,ack)=>typeof ack==='function'&&ack(Date.now()));
  socket.on('rooms',(_,ack)=>typeof ack==='function'&&ack([...rooms.values()].filter(r=>r.pub).slice(0,20).map(r=>({code:r.code,n:r.players.size,max:r.max,lock:!!r.ph}))));

  socket.on('create',(d,ack)=>{
    if(typeof ack!=='function')return;d=d||{};
    const r={code:mkcode(),owner:null,pub:!!d.pub,max:I(d.max,2,20),salt:null,ph:null,players:new Map(),ctrl:new Set(),seats:new Map(),video:{kind:'none',url:'',time:0,playing:false,ts:Date.now(),vol:.8}};
    const pw=S(d.password,40);if(pw){r.salt=crypto.randomBytes(8).toString('hex');r.ph=hash(pw,r.salt)}
    const p=newPlayer(d);r.owner=p.pid;r.players.set(p.pid,p);rooms.set(r.code,r);attach(socket,r,p);
    ack({ok:true,...snap(r,p)});
  });

  socket.on('join',(d,ack)=>{
    if(typeof ack!=='function')return;d=d||{};
    const r=rooms.get(S(d.code,8).toUpperCase());
    if(!r)return ack({ok:false,err:'Sala não encontrada'});
    let p=d.token?[...r.players.values()].find(x=>x.token===d.token):null,fresh=false;
    if(!p){
      if(r.players.size>=r.max)return ack({ok:false,err:'Sala cheia'});
      if(r.ph&&!crypto.timingSafeEqual(hash(S(d.password,40),r.salt),r.ph))return ack({ok:false,err:'Senha incorreta'});
      p=newPlayer(d);r.players.set(p.pid,p);fresh=true;
    }else if(p.sock&&p.sock!==socket.id){const old=io.sockets.sockets.get(p.sock);p.sock=socket.id;old&&old.disconnect(true)}
    attach(socket,r,p);
    if(fresh)socket.to(r.code).emit('pj',pub(p));
    ack({ok:true,...snap(r,p)});
  });

  socket.on('mv',d=>{
    const {r,p}=ctx();if(!p||!d||!Array.isArray(d.pos))return;
    const t=Date.now();if(t-p.t<45)return;p.t=t;
    if(p.seat<0)p.pos=[F(d.pos[0],-30,30),F(d.pos[1],0,5),F(d.pos[2],-30,30)];
    p.yaw=F(d.yaw,-10,10);p.hy=F(d.hy,-1.2,1.2);p.anim=ANIMS.includes(d.anim)?d.anim:'idle';
    if(p.seat>=0)p.anim='sit';
    socket.to(r.code).volatile.emit('mv',{id:p.pid,pos:p.pos,yaw:p.yaw,anim:p.anim,hy:p.hy});
  });
  socket.on('sit',(d,ack)=>{
    const {r,p}=ctx();if(!p||typeof ack!=='function')return;
    const s=I(d&&d.seat,0,NSEATS-1);
    if(r.seats.has(s)&&r.seats.get(s)!==p.pid)return ack({ok:false});
    if(p.seat>=0)r.seats.delete(p.seat);
    r.seats.set(s,p.pid);p.seat=s;p.anim='sit';
    io.to(r.code).emit('seat',{id:p.pid,seat:s});ack({ok:true});
  });
  socket.on('stand',()=>{
    const {r,p}=ctx();if(!p||p.seat<0)return;
    r.seats.delete(p.seat);p.seat=-1;p.anim='idle';io.to(r.code).emit('seat',{id:p.pid,seat:-1});
  });
  socket.on('chat',d=>{
    const {r,p}=ctx();if(!p)return;
    const t=Date.now();if(t-p.tc<600)return;p.tc=t;
    const text=S(d&&d.t,300);if(text)io.to(r.code).emit('chat',{id:p.pid,name:p.name,t:text,ts:t});
  });

  socket.on('vset',d=>{
    const {r,p}=ctx();if(!p||!canCtl(r,p))return;
    const url=cleanUrl(d&&d.url),kind=d&&d.kind==='web'?'web':'video';if(!url)return;
    r.video={kind,url,time:0,playing:false,ts:Date.now(),vol:r.video.vol};io.to(r.code).emit('video',r.video);
  });
  socket.on('vctl',d=>{
    const {r,p}=ctx();if(!p||!canCtl(r,p)||!d)return;
    const v=r.video;if(v.kind==='screen'&&d.a!=='vol')return;const n=Date.now();
    switch(d.a){
      case'play':v.time=F(d.t,0,1e7);v.playing=true;v.ts=n;break;
      case'pause':v.time=F(d.t,0,1e7);v.playing=false;v.ts=n;break;
      case'seek':v.time=F(d.t,0,1e7);v.ts=n;break;
      case'vol':v.vol=F(d.vol,0,1);break;
      case'sync':v.time=cur(v);v.ts=n;break;
      default:return;
    }
    io.to(r.code).emit('video',v);
  });
  socket.on('sstart',()=>{
    const {r,p}=ctx();if(!p||!canCtl(r,p))return;
    r.video={kind:'screen',url:'',sharer:p.pid,time:0,playing:true,ts:Date.now(),vol:r.video.vol};io.to(r.code).emit('video',r.video);
  });
  socket.on('sstop',()=>{
    const {r,p}=ctx();if(!p||r.video.sharer!==p.pid)return;
    r.video={kind:'none',url:'',time:0,playing:false,ts:Date.now(),vol:r.video.vol};io.to(r.code).emit('video',r.video);
  });
  socket.on('rtc',d=>{
    const {r,p}=ctx();if(!p||!d||typeof d.data!=='object'||JSON.stringify(d.data).length>20000)return;
    const t=r.players.get(d.to);if(t&&t.sock)io.to(t.sock).emit('rtc',{from:p.pid,data:d.data});
  });

  socket.on('kick',d=>{
    const {r,p}=ctx();if(!p||r.owner!==p.pid)return;
    const t=r.players.get(d&&d.id);if(!t||t.pid===p.pid)return;
    if(t.sock){io.to(t.sock).emit('kicked');const s=io.sockets.sockets.get(t.sock);s&&setTimeout(()=>s.disconnect(true),200)}
    remove(r,t);
  });
  socket.on('perm',d=>{
    const {r,p}=ctx();if(!p||r.owner!==p.pid)return;
    const t=r.players.get(d&&d.id);if(!t||t.pid===r.owner)return;
    d.on?r.ctrl.add(t.pid):r.ctrl.delete(t.pid);
    io.to(r.code).emit('perm',{owner:r.owner,ctrl:[...r.ctrl]});
  });
  socket.on('leave',()=>{const {r,p}=ctx();if(p){remove(r,p);socket.leave(r.code);socket.data.room=null}});
  socket.on('disconnect',()=>{
    const {r,p}=ctx();if(!p)return;
    p.sock=null;p.timer=setTimeout(()=>{const rr=rooms.get(r.code);rr&&rr.players.get(p.pid)===p&&!p.sock&&remove(rr,p)},GRACE);
  });
});
const PORT=process.env.PORT||3000;
srv.listen(PORT,'0.0.0.0',()=>console.log('CINEVERSE 3D rodando na porta '+PORT));
