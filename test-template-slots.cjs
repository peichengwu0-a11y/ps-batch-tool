const assert=require('node:assert/strict'),T=require('./template-slots.js'),fs=require('node:fs'),vm=require('node:vm');
const slots=[{x:.1,y:.2,w:.1,h:.5,ratio:.2},{x:.5,y:.3,w:.3,h:.3,ratio:1}];
const items=[{key:'new-round',index:0,ratio:1},{key:'new-tall',index:1,ratio:.2}];
const before=JSON.stringify(slots),match=()=>T.assign(items,slots,(r,s)=>Math.abs(Math.log(r.ratio/s.ratio)));
assert.deepEqual(match().map(p=>p.slotIndex),[1,0]);assert.equal(JSON.stringify(slots),before);
assert.deepEqual(match(),match());
assert.deepEqual(T.assign(items,slots,()=>0).map(p=>p.slotIndex),[0,1]);
const shape={width:2,height:2,ratio:1,mask:[1,0,1,0]},sig=T.signature(shape);
assert.deepEqual(T.normalize(JSON.parse(JSON.stringify(sig))),sig);assert.equal(T.distance(shape,sig),0);
assert.equal(T.distance({width:2,height:2,mask:[0,1,0,1]},sig),1);
assert.equal(T.normalize({...sig,bits:'oops'}),null);
// Real entry point must never run automatic regrouping/resizing for custom templates.
const code=fs.readFileSync('app.js','utf8'),combo={order:['main:a:1','gift:b:1'],previewLayout:{items:[]}},preset={main:1,gift:1,slots:[]};
const slot={x:.2,y:.3,w:.2,h:.4,rotation:12,custom:true};
let notices=[];
const ctx={TemplateSlots:T,SilhouetteSize:{descriptor:()=>null},ProductGroups:{ordered:x=>x},activeCombo:()=>combo,
resolveCapacityPreset:()=>({name:'custom-test',preset,matched:true}),presetLabel:x=>x,
allLayoutPresets:()=>({'custom-test':preset}),toast:x=>notices.push(x),parseInstanceKey:key=>({type:key.split(':')[0],id:key.split(':')[1]}),
state:{assets:{main:[{id:'a'}],gift:[{id:'b'}]},zones:{}},presetRoleSlots:()=>[slot],
assignItemsToSlots:(items,slots)=>items.map(item=>({item,slot:slots[0]})),zoneBounds:()=>({x:0,y:0,w:1000,h:1000}),
intentRoleBounds:()=>({x:0,y:0,w:1000,h:1000}),intentAssetRatio:()=>.5,pushIntentHistory:()=>{},buildIntentLayout:()=>combo.previewLayout,layoutViewMode:()=>'front',$:()=>({}),renderIntentPreview:()=>{}};
vm.createContext(ctx);
for(const name of ['intentItemForSlot','applyIntentPreset'])vm.runInContext(code.split(/\r?\n/).find(l=>l.startsWith('function '+name+'(')),ctx);
vm.runInContext('applyIntentPreset("custom-test")',ctx);
assert.equal(combo.previewLayout.items.length,2);
for(const r of combo.previewLayout.items){assert.equal(r.x,200);assert.equal(r.y,300);assert.equal(r.w,200);assert.equal(r.h,400);assert.equal(r.rotation,12);}
const first=JSON.stringify(combo.previewLayout.items);vm.runInContext('applyIntentPreset("custom-test")',ctx);assert.equal(JSON.stringify(combo.previewLayout.items),first);
const more=[...items,{key:'extra',index:2,ratio:2}];
assert.equal(T.assign(more,slots,(r,s)=>Math.abs(Math.log(r.ratio/s.ratio))).length,2);
assert.equal(T.assign(more,[],()=>0).length,0);
const fixed=[{key:'main:a:1',type:'main',index:0,x:0,y:0,w:100,h:200,rotation:0}],saved=JSON.stringify(fixed);
const extras=[{key:'main:a:2',type:'main',index:1},{key:'main:a:3',type:'main',index:2}];
const extraResult=T.supplement(extras,fixed,{x:0,y:0,w:500,h:500},()=>.5);
assert.equal(extraResult.items.length,2);assert.equal(JSON.stringify(fixed),saved);assert(!extraResult.crowded);
assert.deepEqual(T.supplement(extras,fixed,{x:0,y:0,w:500,h:500},()=>.5),extraResult);
const mains=Array.from({length:5},(_,index)=>({index,ratio:index===4?1:.2})),gifts=Array.from({length:3},(_,index)=>({index,ratio:index===2?1:.3}));
const exact={main:mains.map(r=>({ratio:r.ratio})),gift:gifts.map(r=>({ratio:r.ratio}))};
const wrong={main:[{ratio:.2},{ratio:1}],gift:exact.gift};
const badShape={main:mains.map(()=>({ratio:3})),gift:exact.gift};
const getSlots=(p,role)=>p[role],cost=(r,s)=>Math.abs(Math.log(r.ratio/s.ratio));
const selected=T.select({wrong,badShape,exact},mains,gifts,getSlots,cost,'wrong');
assert.equal(selected.name,'exact');assert(selected.matched);assert(selected.changed);
assert.equal(T.select({wrong,badShape},mains,gifts,getSlots,cost,'wrong').matched,false);
assert.equal(T.select({},mains,gifts,getSlots,cost,'wrong'),null);
assert.equal(T.select({exact,copy:exact},mains,gifts,getSlots,cost,'copy').name,'copy');
console.log('PASS stable geometry, search all templates, exact 5+3 count and shape prioritized, mismatch fallback, deterministic ties');
