(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.SiteNavigation=factory();})(typeof globalThis!=='undefined'?globalThis:this,function(){
 function normalize(data){
  if(!data||typeof data!=='object'||Array.isArray(data))throw new Error('分类配置格式不正确');
  return Object.entries(data).filter(([id,x])=>/^[A-Za-z0-9_-]+$/.test(id)&&x&&typeof x.title==='string'&&x.title.trim()&&x.hidden!==true).map(([id,x])=>({id,label:x.title.trim(),order:Number.isFinite(x.order)?x.order:1e9})).sort((a,b)=>a.order-b.order||a.id.localeCompare(b.id));
 }
 return {normalize};
});
