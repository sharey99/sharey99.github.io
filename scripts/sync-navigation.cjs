const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const categoryField={"name":"categories","label":"顶部分类 · 名称、增删与顺序","type":"object","list":{"collapsible":{"collapsed":true,"summary":"{title}"}},"description":"展开一项改名；Add 添加分类，垃圾桶删除，显示顺序越小越靠前。保存后等待后台同步，再刷新左侧栏目。","fields":[{"name":"key","type":"uuid","hidden":true,"required":true,"options":{"editable":false,"generate":false}},{"name":"legacyId","type":"string","hidden":true},{"name":"title","label":"分类名称","type":"string","required":true,"options":{"maxlength":40}},{"name":"order","label":"显示顺序","type":"number"},{"name":"hidden","label":"暂时隐藏","type":"boolean"}]};
const clone=v=>JSON.parse(JSON.stringify(v));
function recordsFromHome(home){
 if(!Array.isArray(home.categories))throw new Error('首页设置缺少分类列表');
 const records={};
 for(const row of home.categories){
  const id=row.legacyId||('category-'+row.key);
  if(!/^[A-Za-z0-9_-]+$/.test(id)||id==='category-undefined'||!row||typeof row.title!=='string'||!row.title.trim())throw new Error('分类名称或标识无效，请刷新后台重新添加');
  if(Object.hasOwn(records,id))throw new Error('分类标识重复，请使用 Add 添加新的分类');
  records[id]={title:row.title.trim(),...(Number.isFinite(row.order)?{order:row.order}:{}),hidden:row.hidden===true};
 }
 return records;
}
function generate(base,records){
 const tabs=Object.entries(records).map(([id,x])=>({id,...x})).sort((a,b)=>(a.order??1e9)-(b.order??1e9)||a.id.localeCompare(b.id));
 const settings=clone(base.home.items[0]);settings.label='首页设置';settings.operations={create:true,rename:false,delete:false};
 settings.fields=[categoryField,...settings.fields.filter(x=>x.name!=='categories')];
 const catalog={name:'collection',label:records.all?.title||'全部收藏',type:'group',items:[settings]};
 for(const tab of tabs){if(tab.id==='all')continue;if(tab.id==='resources'){const group=clone(base.resources);group.label=tab.title;catalog.items.push(group);}else{const item=clone(base.collection);item.name=tab.id;item.label=tab.title;item.path='_data/cards/'+tab.id;catalog.items.push(item);}}
 return {media:base.media,content:[catalog,clone(base.about),clone(base.support)]};
}
function synchronize(target=root){
 const read=file=>JSON.parse(fs.readFileSync(file,'utf8').replace(/^\uFEFF/,''));
 const base=read(path.join(target,'scripts/cms-base.json')),home=read(path.join(target,'_data/home/introduction.json'));
 const records=recordsFromHome(home),config=generate(base,records),dir=path.join(target,'_data/navigation');fs.mkdirSync(dir,{recursive:true});
 for(const [id,value] of Object.entries(records))fs.writeFileSync(path.join(dir,id+'.json'),JSON.stringify(value,null,2)+'\n');
 for(const name of fs.readdirSync(dir).filter(x=>x.endsWith('.json'))){if(!Object.hasOwn(records,path.basename(name,'.json')))fs.unlinkSync(path.join(dir,name));}
 fs.writeFileSync(path.join(target,'.pages.yml'),JSON.stringify(config,null,2)+'\n');
 for(const item of config.content[0].items.filter(x=>x.type==='collection')){const folder=path.join(target,item.path);fs.mkdirSync(folder,{recursive:true});if(fs.readdirSync(folder).length===0)fs.writeFileSync(path.join(folder,'.gitkeep'),'');}
 return config;
}
module.exports={generate,recordsFromHome,synchronize};
if(require.main===module){const config=synchronize();console.log('Synchronized grouped CMS sidebar: '+config.content[0].items.length+' entries.');}
