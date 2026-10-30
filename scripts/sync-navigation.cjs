const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const categoryField={"name":"categories","label":"顶部分类 · 名称、增删与顺序","type":"object","list":{"collapsible":{"collapsed":true,"summary":"{title}"}},"description":"展开一项改名；Add 添加分类，垃圾桶删除，显示顺序越小越靠前。保存后等待后台同步，再刷新左侧栏目。","fields":[{"name":"key","type":"uuid","hidden":true,"required":true,"options":{"editable":false,"generate":false}},{"name":"legacyId","type":"string","hidden":true},{"name":"title","label":"分类名称","type":"string","required":true,"options":{"maxlength":40}},{"name":"order","label":"显示顺序","type":"number"},{"name":"hidden","label":"暂时隐藏","type":"boolean"},{"name":"children","label":"子分类（最后一级）","type":"object","list":{"collapsible":{"collapsed":true,"summary":"{title}"}},"description":"在网站收藏、游戏攻略等内容栏目下添加；这里只能再分这一层。“全部收藏”是汇总入口，无需子分类。","fields":[{"name":"key","type":"uuid","hidden":true,"required":true,"options":{"editable":false,"generate":false}},{"name":"title","label":"子分类名称","type":"string","required":true,"options":{"maxlength":40}},{"name":"order","label":"显示顺序","type":"number"}]}]};
const clone=v=>JSON.parse(JSON.stringify(v));
function childrenFromRows(rows){
 if(rows==null)return [];
 if(!Array.isArray(rows))throw new Error('子分类需要是列表');
 const seen=new Set();
 return rows.map(row=>{
  if(!row||!/^[-A-Za-z0-9_]+$/.test(row.key||'')||typeof row.title!=='string'||!row.title.trim())throw new Error('子分类名称或标识无效，请刷新后台重新添加');
  if(row.children?.length)throw new Error('子分类已经是最后一级，不能继续嵌套');
  if(seen.has(row.key))throw new Error('子分类标识重复');
  seen.add(row.key);return {id:row.key,title:row.title.trim(),...(Number.isFinite(row.order)?{order:row.order}:{})};
 }).sort((a,b)=>(a.order??1e9)-(b.order??1e9)||a.id.localeCompare(b.id));
}
function recordsFromHome(home){
 if(!Array.isArray(home.categories))throw new Error('首页设置缺少分类列表');
 const records={};
 for(const row of home.categories){
  if(!row)throw new Error('分类内容为空');
  const id=row.legacyId||('category-'+row.key);
  if(!/^[A-Za-z0-9_-]+$/.test(id)||id==='category-undefined'||typeof row.title!=='string'||!row.title.trim())throw new Error('分类名称或标识无效，请刷新后台重新添加');
  if(Object.hasOwn(records,id))throw new Error('分类标识重复，请使用 Add 添加新的分类');
  const children=childrenFromRows(row.children);
  if(id==='all'&&children.length)throw new Error('全部收藏是汇总入口，请在具体栏目下添加子分类');
  records[id]={title:row.title.trim(),...(Number.isFinite(row.order)?{order:row.order}:{}),hidden:row.hidden===true,children};
 }
 return records;
}
function cardFields(fields,children){
 const result=clone(fields).filter(x=>x.name!=='subcategory');
 if(children?.length)result.splice(1,0,{name:'subcategory',label:'所属子分类（最后一级）',type:'select',description:'可留在父栏目，或选择下面的子分类。',options:{values:[{name:'none',label:'未分类'},...children.map(x=>({name:x.id,label:x.title}))]}});
 return result;
}
function generate(base,records){
 const tabs=Object.entries(records).map(([id,x])=>({id,...x})).sort((a,b)=>(a.order??1e9)-(b.order??1e9)||a.id.localeCompare(b.id));
 const settings=clone(base.home.items[0]);settings.label='首页设置';settings.operations={create:true,rename:false,delete:false};
 settings.fields=[categoryField,...settings.fields.filter(x=>x.name!=='categories')];
 const catalog={name:'collection',label:records.all?.title||'全部收藏',type:'group',items:[settings]};
 for(const tab of tabs){if(tab.id==='all')continue;if(tab.id==='resources'){const group=clone(base.resources);group.label=tab.title;for(const item of group.items)item.fields=cardFields(item.fields,tab.children);catalog.items.push(group);}else{const item=clone(base.collection);item.name=tab.id;item.label=tab.title;item.path='_data/cards/'+tab.id;item.fields=cardFields(item.fields,tab.children);catalog.items.push(item);}}
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
module.exports={generate,recordsFromHome,childrenFromRows,cardFields,synchronize};
if(require.main===module){const config=synchronize();console.log('Synchronized grouped CMS sidebar: '+config.content[0].items.length+' entries.');}
