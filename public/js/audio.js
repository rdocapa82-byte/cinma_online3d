let ac,g,master=.03;
export function startAmbient(vol){
  if(ac)return;try{
  ac=new(window.AudioContext||window.webkitAudioContext)();g=ac.createGain();g.gain.value=.03*vol;
  const f=ac.createBiquadFilter();f.type='lowpass';f.frequency.value=380;
  [55,82.4,110.3].forEach(fr=>{const o=ac.createOscillator();o.type='sawtooth';o.frequency.value=fr;const og=ac.createGain();og.gain.value=.3;o.connect(og);og.connect(f);o.start()});
  f.connect(g);g.connect(ac.destination)}catch{}
}
export function ambient(playing,vol){if(g)g.gain.setTargetAtTime(playing?.004*vol:.03*vol,ac.currentTime,.8)}
