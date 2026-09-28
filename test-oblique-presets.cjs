const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const ctx={state:{customTemplates:[]},mode:'oblique',layoutViewMode:()=>ctx.mode};vm.createContext(ctx);
vm.runInContext(fs.readFileSync('oblique-presets.js','utf8'),ctx);
const source=fs.readFileSync('app.js','utf8');
vm.runInContext(source.slice(source.indexOf('const BASE_LAYOUT_PRESETS='),source.indexOf('const CUSTOM_TEMPLATE_KEY=')),ctx);
for(const name of ['customTemplateMap','allLayoutPresets','getLayoutPreset','presetLabel'])vm.runInContext(source.split(/\r?\n/).find(l=>l.startsWith('function '+name+'(')),ctx);
assert.equal(Object.keys(ctx.allLayoutPresets()).length,18);
for(const [id,p] of Object.entries(ctx.allLayoutPresets())){assert.equal(p.viewMode,'oblique');assert.equal(p.main,p.slots.filter(s=>s.role==='main').length);assert.equal(p.gift,p.slots.filter(s=>s.role==='gift').length);assert(ctx.presetLabel(id).startsWith('基础斜视'));assert(ctx.getLayoutPreset(id));}
ctx.mode='front';assert.equal(Object.keys(ctx.allLayoutPresets()).length,4);
assert(Object.values(ctx.allLayoutPresets()).every(p=>p.viewMode!=='oblique'));
const html=fs.readFileSync('index.html','utf8');assert(html.indexOf('oblique-presets.js')<html.indexOf('src="app.js"'));
console.log('PASS 18 built-in oblique templates with empty browser storage, 4 original front templates, labels and script loading');
