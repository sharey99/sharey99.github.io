(() => {
'use strict';
const $=id=>document.getElementById(id);
const list=(id,values,tag='span')=>{if(!Array.isArray(values))return;$(id).replaceChildren(...values.filter(v=>typeof v==='string'&&v.trim()).map(v=>{const e=document.createElement(tag);e.textContent=v;return e;}));};
const frame=$('bigfive-frame');
function setEmbed(value,visible=true){
 const valid=typeof value==='string'&&/^https:\/\/bigfivepersonality\.me\/[a-zA-Z-]+\/embed\/[a-zA-Z0-9_-]+\/?$/.test(value);
 const show=visible!==false&&valid;
 $('personality-panel').hidden=!show;
 document.querySelector('.profile-top').classList.toggle('no-personality',!show);
 if(show){frame.src=value;$('bigfive-report').href=value.replace('/embed/','/r/');}else frame.removeAttribute('src');
}
async function init(){
 try{
  const response=await fetch('./profile.json',{cache:'no-store',signal:AbortSignal.timeout(10000)});
  if(!response.ok)throw new Error('Profile unavailable');
  const p=await response.json();
  if(!p||typeof p!=='object'||Array.isArray(p))throw new Error('Invalid profile');
  if(typeof p.displayName==='string')$('profile-name').textContent=p.displayName;
  if(typeof p.motto==='string')$('profile-motto').textContent=p.motto;
  list('profile-labels',p.labels);list('profile-bio',p.bio,'p');list('profile-values',p.values);
  list('profile-strengths',p.strengths,'li');list('profile-challenges',p.challenges);list('profile-personality',p.personality);
  setEmbed(p.bigFiveEmbed,p.showBigFive);
 }catch(error){setEmbed(frame.dataset.src);console.warn('个人介绍使用页面中的备用内容。',error);}
}
for(const button of document.querySelectorAll('[data-payment]')){
 button.addEventListener('click',()=>{
  const label=button.dataset.payment==='wechat'?'微信赞赏':'支付宝赞赏';
  $('payment-zoom-title').textContent=label;
  const copy=button.querySelector('.qr-viewport').cloneNode(true);
  const img=copy.querySelector('img');img.loading='eager';
  $('payment-zoom-code').replaceChildren(copy);$('payment-zoom').showModal();
 });
}
init();
})();
