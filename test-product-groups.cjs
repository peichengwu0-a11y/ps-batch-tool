const assert=require('node:assert/strict'),P=require('./product-groups.js');
const items=['main:a:1','main:b:1','main:a:2','gift:a:1'].map((key,index)=>({key,type:key.split(':')[0],index,x:index*20,y:10,w:20+index*5,h:40+index*10}));
assert.deepEqual(P.ordered(items).map(r=>r.key),['main:a:1','main:a:2','main:b:1','gift:a:1']);
const slots=[{x:0,y:0,w:.1,h:.4},{x:.8,y:0,w:.1,h:.4},{x:.15,y:0,w:.1,h:.4}];
const result=P.assign(items.slice(0,3),slots,()=>0);
assert.deepEqual(result.map(p=>p.slotIndex),[0,2,1]);
const giftWidth=items[3].w;P.equalize(items);
assert.equal(items[0].w,items[2].w);assert.equal(items[0].h,items[2].h);assert.equal(items[3].w,giftWidth);
assert.equal(new Set(result.map(p=>p.item.key)).size,3);
console.log('PASS same product grouping, nearby slots, exact size equality, role separation, no missing instances');
const six=['a','a','b','b','a','b'].map((id,index)=>({key:`gift:${id}:${index}`,type:'gift',index,x:0,y:0,w:25,h:85,rotation:12}));
P.arrangeRows(six,{x:100,y:50,w:130,h:220});
for(const id of ['a','b']){const batch=six.filter(r=>r.key.split(':')[1]===id);assert.equal(new Set(batch.map(r=>r.y)).size,1);assert.equal(new Set(batch.map(r=>r.w)).size,1);assert(Math.abs((batch[1].x-batch[0].x)-(batch[2].x-batch[1].x))<1e-8);}
assert(six[0].y<six[2].y);assert.equal(six.length,6);
for(const r of six){const angle=r.rotation*Math.PI/180,rw=Math.abs(r.w*Math.cos(angle))+Math.abs(r.h*Math.sin(angle)),rh=Math.abs(r.w*Math.sin(angle))+Math.abs(r.h*Math.cos(angle));assert(r.x+r.w/2-rw/2>=100&&r.x+r.w/2+rw/2<=230);assert(r.y+r.h/2-rh/2>=50&&r.y+r.h/2+rh/2<=270);}
console.log('PASS six gifts become two compact equal-size rows, rotated bounds retained');
const tight=[0,1,2].map(index=>({key:`gift:t:${index}`,type:'gift',index,x:0,y:0,w:40,h:100,rotation:0}));
P.arrangeRows(tight,{x:0,y:0,w:300,h:200});
assert.equal(tight[0].w,40);assert.equal(tight[0].h,100);
assert(Math.abs(tight[1].x-tight[0].x-40*.78)<1e-8);
assert(Math.abs(tight[0].x+(tight[2].x+40-tight[0].x)/2-150)<1e-8);
console.log('PASS tighter spacing preserves product size and group center');
