(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.SiteNavigation=factory();})(typeof globalThis!=='undefined'?globalThis:this,function(){
 function normalizeChildren(rows){
  return (Array.isArray(rows)?rows:[]).filter(x=>x&&/^[-A-Za-z0-9_]+$/.test(x.id||'')&&typeof x.title==='string'&&x.title.trim()).map(x=>({id:x.id,label:x.title.trim(),order:Number.isFinite(x.order)?x.order:1e9,description:typeof x.description==='string'?x.description:''})).sort((a,b)=>a.order-b.order||a.id.localeCompare(b.id));
 }
 function resolveSubcategory(categories,parent,value){return categories.find(x=>x.id===parent)?.children?.some(x=>x.id===value)?value:'';}
 function matchesSubcategory(item,selected){return selected==='all'||(selected==='none'?!item.subcategory:item.subcategory===selected);}
 function normalize(data){
  if(!data||typeof data!=='object'||Array.isArray(data))throw new Error('分类配置格式不正确');
  return Object.entries(data).filter(([id,x])=>/^[A-Za-z0-9_-]+$/.test(id)&&x&&typeof x.title==='string'&&x.title.trim()&&x.hidden!==true).map(([id,x])=>({id,label:x.title.trim(),order:Number.isFinite(x.order)?x.order:1e9,description:typeof x.description==='string'?x.description:'',children:normalizeChildren(x.children)})).sort((a,b)=>a.order-b.order||a.id.localeCompare(b.id));
 }
 return {normalize,resolveSubcategory,matchesSubcategory};
});
