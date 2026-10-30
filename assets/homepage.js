(() => {
'use strict';
const text=(id,value)=>{if(typeof value==='string')document.getElementById(id).textContent=value;};
fetch('./homepage.json',{cache:'no-store',signal:AbortSignal.timeout(10000)}).then(r=>{if(!r.ok)throw new Error('Homepage unavailable');return r.json();}).then(data=>{
 const p=data.introduction||{},s=data.support||{};
 if(typeof p.titleFirst==='string'&&typeof p.titleSecond==='string'){
  const first=document.createTextNode(p.titleFirst),br=document.createElement('br'),second=document.createElement('span');second.textContent=p.titleSecond;
  document.getElementById('hero-title').replaceChildren(first,br,second);
 }
 text('home-eyebrow',p.eyebrow);text('home-description',p.description);text('collection-title',p.collectionTitle);text('collection-eyebrow',p.collectionEyebrow);
 text('support-title',s.title);text('support-description',s.description);
}).catch(error=>console.warn('开场介绍使用页面中的备用内容。',error));
})();
