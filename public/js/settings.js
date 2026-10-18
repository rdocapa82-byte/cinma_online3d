const D={vol:.8,sens:1,q:'mid',view:'third',names:true,chat:true,fps:false,ping:true};
let saved={};try{saved=JSON.parse(localStorage.getItem('cv')||'{}')}catch{}
export const S=Object.assign({},D,saved);
export const save=()=>{try{localStorage.setItem('cv',JSON.stringify(S))}catch{}};
