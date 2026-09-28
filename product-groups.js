(function(root){
  'use strict';
  const identity=r=>r.type+':'+String(r.key).split(':')[1];
  function groups(items){const map=new Map();for(const r of items){const key=identity(r);if(!map.has(key))map.set(key,[]);map.get(key).push(r);}return [...map.values()];}
  function ordered(items){return groups(items).flat();}
  function assign(items,slots,cost){
    const available=slots.map((slot,index)=>({slot,index})),out=[];
    for(const group of groups(items)){
      const chosen=[];
      for(const item of group){
        if(!available.length)break;
        let best=0,score=Infinity;
        available.forEach((candidate,i)=>{
          const s=candidate.slot,cx=s.x+s.w/2,cy=s.y+s.h/2;
          const distance=chosen.length?Math.min(...chosen.map(p=>Math.hypot(cx-p.x,cy-p.y))):0;
          const value=chosen.length?distance*10+cost(item,s)*.1:cost(item,s);
          if(value<score){score=value;best=i;}
        });
        const selected=available.splice(best,1)[0],s=selected.slot;
        chosen.push({x:s.x+s.w/2,y:s.y+s.h/2});
        out.push({item,slot:s,slotIndex:selected.index});
      }
    }
    return out;
  }
  function equalize(items){
    for(const group of groups(items)){
      if(group.length<2)continue;
      // Fit the smallest allocated slot instead of enlarging into neighbouring products.
      const reference=group.reduce((a,b)=>a.w*a.h<b.w*b.h?a:b);
      for(const r of group){const cx=r.x+r.w/2,bottom=r.y+r.h;r.w=reference.w;r.h=reference.h;r.x=cx-r.w/2;r.y=bottom-r.h;}
    }
    return items;
  }
  function arrangeRows(items,b){
    const batches=groups(items);if(!batches.some(g=>g.length>1)||!(b.w>0&&b.h>0))return;
    const pad=Math.min(b.w,b.h)*.025,gap=Math.min(b.w,b.h)*.035;
    const rows=batches.map(group=>{
      const ref=group[0],angle=(ref.rotation||0)*Math.PI/180;
      const rw=Math.abs(ref.w*Math.cos(angle))+Math.abs(ref.h*Math.sin(angle));
      const rh=Math.abs(ref.w*Math.sin(angle))+Math.abs(ref.h*Math.cos(angle));
      // Slanted cutouts have empty corners: bring copies closer without resizing.
      return {group,ref:{...ref},rw,rh,space:-rw*.22};
    });
    // One common reduction preserves earlier same-silhouette size synchronization.
    const scale=Math.min(1,(b.h-2*pad-gap*(rows.length-1))/rows.reduce((sum,r)=>sum+r.rh,0),...rows.map(r=>(b.w-2*pad)/(r.rw*r.group.length+r.rw*.08*(r.group.length-1))));
    if(!(scale>0))return;
    const height=rows.reduce((sum,r)=>sum+r.rh*scale,0)+gap*(rows.length-1);
    let y=b.y+(b.h-height)/2;
    for(const row of rows){
      const width=(row.rw*row.group.length+row.space*(row.group.length-1))*scale;
      let x=b.x+(b.w-width)/2;
      for(const r of row.group){r.w=row.ref.w*scale;r.h=row.ref.h*scale;r.rotation=row.ref.rotation||0;r.x=x+row.rw*scale/2-r.w/2;r.y=y+row.rh*scale/2-r.h/2;x+=(row.rw+row.space)*scale;}
      y+=row.rh*scale+gap;
    }
  }
  root.ProductGroups={ordered,assign,equalize,arrangeRows};if(typeof module!=='undefined')module.exports=root.ProductGroups;
})(typeof globalThis!=='undefined'?globalThis:this);
