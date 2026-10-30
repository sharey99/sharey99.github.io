const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
function generate(base,records){
 const manager={"name":"navigation","label":"顶部分类管理 · 改名 / 新增 / 删除","type":"collection","path":"_data/navigation","format":"json","filename":{"template":"category-{year}{month}{day}-{hour}{minute}{second}.json","field":false},"operations":{"create":true,"rename":false,"delete":true},"subfolders":false,"view":{"primary":"title","fields":["title","order","hidden"],"sort":["order","title"],"search":["title"],"default":{"sort":"order","order":"asc"}},"fields":[{"name":"title","label":"分类标题","type":"string","required":true,"options":{"maxlength":40},"description":"这里的文字就是网站顶部选项卡和后台对应栏目的名称。"},{"name":"order","label":"显示顺序","type":"number","description":"数字越小越靠前。"},{"name":"hidden","label":"暂时隐藏此分类","type":"boolean","description":"勾选后从网站暂时隐藏；默认显示。删除分类也不会删除原有卡片文件。"}]};
 const clone=v=>JSON.parse(JSON.stringify(v));
 const tabs=Object.entries(records).map(([id,value])=>{if(!/^[A-Za-z0-9_-]+$/.test(id)||!value||typeof value.title!=='string'||!value.title.trim())throw new Error('Invalid navigation record: '+id);return {id,...value,title:value.title.trim()};}).sort((a,b)=>(a.order??1e9)-(b.order??1e9)||a.id.localeCompare(b.id));
 const home=clone(base.home);home.label='主页 · '+(records.all?.title||'全部收藏');const content=[manager,home];
 for(const tab of tabs){if(tab.id==='all')continue;if(tab.id==='resources'){const group=clone(base.resources);group.label=tab.title;content.push(group);}else{const item=clone(base.collection);item.name=tab.id;item.label=tab.title;item.path='_data/cards/'+tab.id;content.push(item);}}
 content.push(clone(base.about),clone(base.support));return {media:base.media,content};
}
function synchronize(target=root){
 const read=file=>JSON.parse(fs.readFileSync(file,'utf8').replace(/^\uFEFF/,''));
 const base=read(path.join(target,'scripts/cms-base.json')),dir=path.join(target,'_data/navigation'),records={};
 for(const name of fs.readdirSync(dir).filter(x=>x.endsWith('.json')))records[path.basename(name,'.json')]=read(path.join(dir,name));
 const config=generate(base,records);fs.writeFileSync(path.join(target,'.pages.yml'),JSON.stringify(config,null,2)+'\n');
 for(const item of config.content.filter(x=>x.type==='collection'&&x.name!=='navigation')){const folder=path.join(target,item.path);fs.mkdirSync(folder,{recursive:true});if(fs.readdirSync(folder).length===0)fs.writeFileSync(path.join(folder,'.gitkeep'),'');}
 return config;
}
module.exports={generate,synchronize};
if(require.main===module){const config=synchronize();console.log('Synchronized '+config.content.length+' CMS entries.');}
