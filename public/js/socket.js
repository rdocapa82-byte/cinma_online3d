export const socket=io({reconnectionDelay:500,reconnectionDelayMax:3000});
export const clock={off:0,ping:0};
export const now=()=>Date.now()+clock.off;
export const emit=(e,d)=>new Promise(r=>socket.timeout(8000).emit(e,d,(err,res)=>r(err?{ok:false,err:'Sem resposta do servidor'}:res)));
setInterval(()=>{if(!socket.connected)return;const t=Date.now();socket.emit('p',t,st=>{clock.ping=Date.now()-t;clock.off=st+clock.ping/2-Date.now()})},3000);
