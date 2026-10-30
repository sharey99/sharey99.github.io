const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),FIXED_WEBSITES=[{"folder":"navigation","id":"9a00aa2e-b2ca-4789-87be-3350a240e334","title":"聚合导航"},{"folder":"resources","id":"87ff92ab-7f1a-46e6-833f-aa30bab1f30f","title":"资源网站"},{"folder":"tools","id":"2ad38163-5545-4f52-91af-24872c84e74c","title":"工具网站"},{"folder":"learning","id":"learning","title":"学习网站"},{"folder":"ai","id":"ai","title":"ai相关"}],categoryField={"name":"categories","label":"栏目名称与显示顺序","type":"object","list":{"collapsible":{"collapsed":true,"summary":"{title}"}},"description":"修改现有栏目的名称和顺序。网站收藏下面的五个子项固定，不在这里新增或删除。","fields":[{"name":"key","type":"uuid","hidden":true,"required":true,"options":{"editable":false,"generate":false}},{"name":"legacyId","type":"string","hidden":true},{"name":"title","label":"分类名称","type":"string","required":true,"options":{"maxlength":40}},{"name":"description","label":"栏目介绍（可选）","type":"text"},{"name":"order","label":"显示顺序","type":"number"},{"name":"hidden","label":"暂时隐藏","type":"boolean"}]},websiteField={"name":"websiteSections","label":"网站收藏 · 子项名称与介绍","type":"object","description":"五个子项固定保留，可修改显示名称和介绍。卡片请从左侧对应子项进入编辑。","fields":[{"name":"navigation","label":"聚合导航","type":"object","fields":[{"name":"title","label":"显示名称","type":"string","required":true},{"name":"description","label":"介绍（可选）","type":"text"}]},{"name":"resources","label":"资源网站","type":"object","fields":[{"name":"title","label":"显示名称","type":"string","required":true},{"name":"description","label":"介绍（可选）","type":"text"}]},{"name":"tools","label":"工具网站","type":"object","fields":[{"name":"title","label":"显示名称","type":"string","required":true},{"name":"description","label":"介绍（可选）","type":"text"}]},{"name":"learning","label":"学习网站","type":"object","fields":[{"name":"title","label":"显示名称","type":"string","required":true},{"name":"description","label":"介绍（可选）","type":"text"}]},{"name":"ai","label":"ai相关","type":"object","fields":[{"name":"title","label":"显示名称","type":"string","required":true},{"name":"description","label":"介绍（可选）","type":"text"}]}]};
const clone=v=>JSON.parse(JSON.stringify(v));
function websiteSections(home){return FIXED_WEBSITES.map((item,index)=>({...item,title:home.websiteSections?.[item.folder]?.title?.trim()||item.title,description:typeof home.websiteSections?.[item.folder]?.description==='string'?home.websiteSections[item.folder].description:'',order:index+1}));}
function recordsFromHome(home){
 if(!Array.isArray(home.categories))throw new Error('首页设置缺少栏目列表');
 const records={};
 for(const row of home.categories){
  const id=row?.legacyId||('category-'+row?.key);
  if(!row||!/^[-A-Za-z0-9_]+$/.test(id)||id==='category-undefined'||typeof row.title!=='string'||!row.title.trim()||Object.hasOwn(records,id))throw new Error('栏目名称或标识无效');
  records[id]={title:row.title.trim(),...(Number.isFinite(row.order)?{order:row.order}:{}),hidden:row.hidden===true,children:id==='tools'?websiteSections(home):[]};
  if(typeof row.description==='string'&&row.description.trim())records[id].description=row.description;
 }
 return records;
}
function generate(base,records,home={}){
 const settings=clone(base.home.items[0]);settings.label='首页设置';settings.operations={create:true,rename:false,delete:false};settings.fields=[categoryField,websiteField,...settings.fields.filter(x=>!['categories','websiteSections'].includes(x.name))];
 const catalog={name:'collection',label:records.all?.title||'全部收藏',type:'group',items:[settings]};
 const tabs=Object.entries(records).map(([id,x])=>({id,...x})).sort((a,b)=>(a.order??1e9)-(b.order??1e9)||a.id.localeCompare(b.id));
 for(const tab of tabs){
  if(tab.id==='all')continue;
  if(tab.id==='resources'){const group=clone(base.resources);group.label=tab.title;catalog.items.push(group);}
  else if(tab.id==='tools'){catalog.items.push({name:'tools',label:tab.title,type:'group',items:websiteSections(home).map(section=>{const item=clone(base.collection);item.name='tools-'+section.folder;item.label=section.title;item.path='_data/cards/tools/'+section.folder;item.fields=item.fields.filter(x=>x.name!=='subcategory');return item;})});}
  else{const item=clone(base.collection);item.name=tab.id;item.label=tab.title;item.path='_data/cards/'+tab.id;item.fields=item.fields.filter(x=>x.name!=='subcategory');catalog.items.push(item);}
 }
 return {media:base.media,content:[catalog,clone(base.about),clone(base.support)]};
}
function synchronize(target=root){
 const read=file=>JSON.parse(fs.readFileSync(file,'utf8').replace(/^\uFEFF/,''));
 const base=read(path.join(target,'scripts/cms-base.json')),home=read(path.join(target,'_data/home/introduction.json')),records=recordsFromHome(home),config=generate(base,records,home),dir=path.join(target,'_data/navigation');fs.mkdirSync(dir,{recursive:true});
 for(const [id,value] of Object.entries(records))fs.writeFileSync(path.join(dir,id+'.json'),JSON.stringify(value,null,2)+'\n');
 for(const name of fs.readdirSync(dir).filter(x=>x.endsWith('.json')))if(!Object.hasOwn(records,path.basename(name,'.json')))fs.unlinkSync(path.join(dir,name));
 fs.writeFileSync(path.join(target,'.pages.yml'),JSON.stringify(config,null,2)+'\n');
 const ensure=items=>{for(const item of items){if(item.type==='group')ensure(item.items);else if(item.type==='collection'){const folder=path.join(target,item.path);fs.mkdirSync(folder,{recursive:true});if(fs.readdirSync(folder).length===0)fs.writeFileSync(path.join(folder,'.gitkeep'),'');}}};ensure(config.content);
 return config;
}
module.exports={FIXED_WEBSITES,websiteSections,recordsFromHome,generate,synchronize};
if(require.main===module){synchronize();console.log('Synchronized fixed website submenus.');}
