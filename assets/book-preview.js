/* Book preview: PDF native view and EPUB text reader. ZIP support: JSZip 3.10.1 (MIT). */
(()=>{
'use strict';
const $=id=>document.getElementById(id);
const make=(tag,cls,text)=>{const el=document.createElement(tag);if(cls)el.className=cls;if(text!==undefined)el.textContent=text;return el;};
let state=null,zipPromise=null;
function stop(){
if(state){state.closed=true;state.controller.abort();state.zip=null;state=null;}
const frame=$('pdf-preview-frame');if(frame)frame.src='about:blank';
$('book-preview-content').replaceChildren();$('book-preview-tools').hidden=true;
}
function zipLibrary(){
if(window.JSZip)return Promise.resolve(window.JSZip);
if(zipPromise)return zipPromise;
zipPromise=new Promise((resolve,reject)=>{
const script=document.createElement('script');script.src='./assets/vendor/jszip.min.js';
const timer=setTimeout(()=>{script.remove();zipPromise=null;reject(new Error('阅读组件加载超时，请重试。'));},20000);
script.onload=()=>{clearTimeout(timer);if(window.JSZip)resolve(window.JSZip);else{zipPromise=null;reject(new Error('阅读组件未能加载。'));}};
script.onerror=()=>{clearTimeout(timer);script.remove();zipPromise=null;reject(new Error('阅读组件加载失败，请重试。'));};
document.head.append(script);
});return zipPromise;
}
function doc(text,type='application/xml'){
const parsed=new DOMParser().parseFromString(text,type);
if(type!=='text/html'&&parsed.getElementsByTagName('parsererror').length)throw new Error('书籍结构无法识别。');
return parsed;
}
const all=(node,name)=>[...node.getElementsByTagNameNS('*',name)];
function archivePath(href,base=''){
try{const u=new URL(href,'https://epub.invalid/'+base);if(u.origin!=='https://epub.invalid')return null;return decodeURIComponent(u.pathname.slice(1));}catch{return null;}
}
async function zipText(s,path){
const file=s.zip.file(path);if(!file)throw new Error('书籍中缺少章节文件。');
return file.async('string');
}
function plainDocument(text){
const parsed=doc(text,'application/xhtml+xml');
parsed.querySelectorAll('script,style,iframe,object,embed,form,input,button,link,meta,svg,math,noscript').forEach(e=>e.remove());
return {body:all(parsed,'body')[0]||parsed.documentElement};
}
function safeText(source,target){
const allowed=new Set(['p','div','span','h1','h2','h3','h4','h5','h6','blockquote','ul','ol','li','em','strong','b','i','u','br','hr','pre','table','thead','tbody','tr','td','th']);
for(const node of source.childNodes){
if(node.nodeType===Node.TEXT_NODE){target.append(document.createTextNode(node.textContent));continue;}
if(node.nodeType!==Node.ELEMENT_NODE)continue;
const tag=node.localName.toLowerCase();
if(tag==='img'){const label=node.getAttribute('alt');if(label)target.append(make('p','epub-image-note','[插图：'+label+']'));continue;}
const out=make(allowed.has(tag)?tag:'span');safeText(node,out);target.append(out);
}
}
function controls(s){
$('book-preview-tools').hidden=false;
const select=$('book-chapters');select.replaceChildren();
s.chapters.forEach((chapter,index)=>{const option=make('option','',chapter.label||'第 '+(index+1)+' 节');option.value=String(index);select.append(option);});
}
async function showChapter(s,index){
if(s.closed||index<0||index>=s.chapters.length)return;
const turn=++s.turn;s.index=index;$('book-chapters').value=String(index);
$('book-prev').disabled=index===0;$('book-next').disabled=index===s.chapters.length-1;
$('book-preview-status').textContent='正在读取章节…';
try{
const text=await zipText(s,s.chapters[index].path);
if(s.closed||turn!==s.turn)return;
const parsed=plainDocument(text),article=make('article','epub-text');
article.style.fontSize=$('book-font').value+'px';
safeText(parsed.body,article);
if(!article.textContent.trim())article.append(make('p','','这一节以图片或版式内容为主，请选择其他章节，或下载原文件查看。'));
$('book-preview-content').replaceChildren(article);$('book-preview-content').scrollTop=0;
$('book-preview-status').textContent='第 '+(index+1)+' / '+s.chapters.length+' 节 · EPUB 文字预览';
}catch(error){if(!s.closed){$('book-preview-content').replaceChildren(make('p','preview-error','这一章节暂时无法显示，可选择其他章节或下载原文件。'));$('book-preview-status').textContent='章节加载失败';}}
}
async function loadEpub(s){
const Zip=await zipLibrary();if(s.closed)return;
const response=await fetch(s.item.file,{signal:s.controller.signal});
if(!response.ok)throw new Error('书籍文件暂时无法读取，请稍后重试。');
s.zip=await Zip.loadAsync(await response.arrayBuffer());if(s.closed)return;
const container=doc(await zipText(s,'META-INF/container.xml'));
const packagePath=all(container,'rootfile')[0]?.getAttribute('full-path');if(!packagePath)throw new Error('未找到 EPUB 书籍目录。');
const packageDoc=doc(await zipText(s,packagePath));
const manifest=new Map(all(packageDoc,'item').map(item=>[item.getAttribute('id'),{path:archivePath(item.getAttribute('href'),packagePath),type:item.getAttribute('media-type'),properties:item.getAttribute('properties')||''}]));
s.chapters=all(packageDoc,'itemref').map(ref=>manifest.get(ref.getAttribute('idref'))).filter(item=>item?.path&&s.zip.file(item.path)&&['application/xhtml+xml','text/html'].includes(item.type)).map(item=>({...item,label:''}));
if(!s.chapters.length)throw new Error('没有找到可预览的章节。');
const labels=new Map();
try{
const nav=[...manifest.values()].find(item=>item.properties.split(/\s+/).includes('nav'));
const ncx=[...manifest.values()].find(item=>item.type==='application/x-dtbncx+xml');
if(nav){
const navigation=doc(await zipText(s,nav.path),'application/xhtml+xml');
for(const a of navigation.querySelectorAll('nav a[href]')){const path=archivePath(a.getAttribute('href'),nav.path);if(path&&!labels.has(path))labels.set(path,a.textContent.trim());}
}else if(ncx){
const navigation=doc(await zipText(s,ncx.path));
for(const point of all(navigation,'navPoint')){const source=all(point,'content')[0]?.getAttribute('src');const label=all(point,'navLabel')[0]?.textContent.trim();const path=source&&archivePath(source,ncx.path);if(path&&label&&!labels.has(path))labels.set(path,label);}
}
}catch{/* A missing table of contents does not block the reading order. */}
s.chapters.forEach((chapter,index)=>{chapter.label=labels.get(chapter.path)||'第 '+(index+1)+' 节';});
if(s.closed)return;
controls(s);
let first=0;
for(let i=0;i<Math.min(s.chapters.length,5);i++){
try{const content=plainDocument(await zipText(s,s.chapters[i].path));if(content.body.textContent.trim().length>60){first=i;break;}}catch{}
}
if(s.closed)return;await showChapter(s,first);
}
window.openBookPreview=async function(item,filename){
stop();
const dialog=$('book-preview'),content=$('book-preview-content');
const s={item,controller:new AbortController(),closed:false,zip:null,chapters:[],index:0,turn:0};state=s;
$('book-preview-title').textContent=item.downloadName||item.title;
const download=$('book-preview-download');download.href=item.file;download.download=filename;
$('book-font').value='18';$('book-preview-status').textContent='正在加载书籍…';
dialog.showModal();
const format=new URL(item.file,location.href).pathname.split('.').pop().toLowerCase();
if(format==='pdf'){
const frame=make('iframe','pdf-preview');frame.id='pdf-preview-frame';frame.title=item.title+' PDF 预览';frame.src=item.file+'#toolbar=1';
content.append(frame);
const fallback=make('p','pdf-fallback','如果没有显示 PDF，可使用新窗口预览。');
const open=make('a','','新窗口预览 ↗');open.href=item.file;open.target='_blank';open.rel='noopener noreferrer';fallback.append(' ',open);content.append(fallback);
$('book-preview-status').textContent='PDF 预览';return;
}
try{await loadEpub(s);}catch(error){
if(s.closed)return;
$('book-preview-status').textContent='暂时无法预览';
content.replaceChildren(make('p','preview-error',error.message||'暂时无法预览，可使用右上角下载按钮。'));
}
};
$('book-preview').addEventListener('close',stop);
$('book-chapters').addEventListener('change',()=>{if(state)showChapter(state,Number($('book-chapters').value));});
$('book-prev').addEventListener('click',()=>{if(state)showChapter(state,state.index-1);});
$('book-next').addEventListener('click',()=>{if(state)showChapter(state,state.index+1);});
$('book-font').addEventListener('change',()=>{const article=document.querySelector('.epub-text');if(article)article.style.fontSize=$('book-font').value+'px';});
})();
