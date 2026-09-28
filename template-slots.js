(function(root){
  'use strict';
  function signature(d){return d?{width:d.width,height:d.height,ratio:d.ratio,bits:Array.from(d.mask).join('')}:null;}
  function normalize(d){return d&&Number.isInteger(d.width)&&Number.isInteger(d.height)&&d.width>0&&d.height>0&&d.width*d.height<=4096&&d.ratio>0&&Number.isFinite(d.ratio)&&typeof d.bits==='string'&&d.bits.length===d.width*d.height&&/^[01]+$/.test(d.bits)?{width:d.width,height:d.height,ratio:d.ratio,bits:d.bits}:null;}
  function distance(d,s){
    if(!d||!s||d.width!==s.width||d.height!==s.height)return 0;
    let intersection=0,union=0;for(let i=0;i<d.mask.length;i++){const a=!!d.mask[i],b=s.bits[i]==='1';if(a&&b)intersection++;if(a||b)union++;}
    return union?1-intersection/union:0;
  }
  // Minimum-cost matching; neither product IDs nor adjacency can move saved slots.
  // Stable priority and slot order settle equally good matches.
  function assign(items,slots,cost){
    if(items.length>slots.length){
      const padded=slots.concat(Array.from({length:items.length-slots.length},()=>({extra:true})));
      return assign(items,padded,(r,s)=>s.extra?100000:cost(r,s)).filter(p=>!p.slot.extra);
    }
    const rows=items.slice().sort((a,b)=>a.index-b.index),n=rows.length,m=slots.length;
    const u=Array(n+1).fill(0),v=Array(m+1).fill(0),p=Array(m+1).fill(0),way=Array(m+1).fill(0);
    const costs=rows.map(r=>slots.map(s=>Math.round(cost(r,s)*1000)/1000));
    for(let i=1;i<=n;i++){
      p[0]=i;let j0=0;const min=Array(m+1).fill(Infinity),used=Array(m+1).fill(false);
      do {used[j0]=true;const i0=p[j0];let delta=Infinity,j1=0;
        for(let j=1;j<=m;j++)if(!used[j]){const cur=costs[i0-1][j-1]-u[i0]-v[j];if(cur<min[j]){min[j]=cur;way[j]=j0;}if(min[j]<delta){delta=min[j];j1=j;}}
        for(let j=0;j<=m;j++)if(used[j]){u[p[j]]+=delta;v[j]-=delta;}else min[j]-=delta;
        j0=j1;
      }while(p[j0]!==0);
      do {const j1=way[j0];p[j0]=p[j1];j0=j1;}while(j0);
    }
    return p.slice(1).flatMap((i,j)=>i?[{item:rows[i-1],slot:slots[j],slotIndex:j}]:[]).sort((a,b)=>a.item.index-b.item.index);
  }
  function supplement(extras,fixed,b,getRatio){
    const added=[];let crowded=false;
    const box=r=>{const a=(r.rotation||0)*Math.PI/180,w=Math.abs(r.w*Math.cos(a))+Math.abs(r.h*Math.sin(a)),h=Math.abs(r.w*Math.sin(a))+Math.abs(r.h*Math.cos(a));return{x:r.x+r.w/2-w/2,y:r.y+r.h/2-h/2,w,h};};
    for(const item of extras){
      const ratio=getRatio(item),references=fixed.concat(added).filter(r=>r.type===item.type);
      const ref=references.find(r=>r.key.split(':')[1]===item.key.split(':')[1])||references.slice().sort((a,z)=>Math.abs(Math.log(a.w/a.h/ratio))-Math.abs(Math.log(z.w/z.h/ratio)))[0];
      const h=ref?Math.min(ref.h,ref.w/ratio):Math.min(b.h*.4,b.w*.4/ratio),w=h*ratio,rotation=ref?.rotation||0;
      const initial={w,h,rotation,x:0,y:0},q=box(initial),fit=Math.min(1,b.w*.96/q.w,b.h*.96/q.h);
      let best=null;
      for(const reduction of [1,.85,.7]){
        const rw=w*fit*reduction,rh=h*fit*reduction,shape=box({x:0,y:0,w:rw,h:rh,rotation});
        for(let iy=0;iy<=24;iy++)for(let ix=0;ix<=24;ix++){
          const x=b.x+(b.w-shape.w)*ix/24,y=b.y+(b.h-shape.h)*iy/24;
          let overlap=0;
          for(const old of fixed.concat(added)){const o=box(old);overlap+=Math.max(0,Math.min(x+shape.w,o.x+o.w)-Math.max(x,o.x))*Math.max(0,Math.min(y+shape.h,o.y+o.h)-Math.max(y,o.y));}
          const fraction=overlap/(shape.w*shape.h),distance=ref?Math.hypot(x+shape.w/2-ref.x-ref.w/2,y+shape.h/2-ref.y-ref.h/2)/Math.max(b.w,b.h):iy/24;
          const score=fraction*100+distance*.1+(1-reduction)*.2;
          if(!best||score<best.score)best={score,fraction,item:{key:item.key,type:item.type,index:item.index,x:x+shape.w/2-rw/2,y:y+shape.h/2-rh/2,w:rw,h:rh,rotation}};
        }
        if(best.fraction===0)break;
      }
      if(best){added.push(best.item);if(best.fraction>.05)crowded=true;}
    }
    return {items:added,crowded};
  }
  function select(presets,mains,gifts,getSlots,cost,preferred){
    const candidates=Object.entries(presets).map(([name,preset])=>{
      let total=0,count=0,worst=0,delta=0;
      for(const [role,items] of [['main',mains],['gift',gifts]]){
        const slots=getSlots(preset,role);delta+=Math.abs(items.length-slots.length);
        for(const pair of assign(items,slots,cost)){const value=cost(pair.item,pair.slot);total+=value;count++;worst=Math.max(worst,value);}
        if(items.length&&!slots.length){total+=items.length*3;count+=items.length;worst=3;}
      }
      const shape=total/Math.max(1,count),matched=delta===0&&shape<=.65&&worst<=1.1;
      return {name,preset,matched,delta,shape,changed:name!==preferred};
    });
    candidates.sort((a,b)=>Number(b.matched)-Number(a.matched)||a.delta-b.delta||a.shape-b.shape||Number(a.changed)-Number(b.changed)||a.name.localeCompare(b.name));
    return candidates[0]||null;
  }
  root.TemplateSlots={signature,normalize,distance,assign,supplement,select};if(typeof module!=='undefined')module.exports=root.TemplateSlots;
})(typeof globalThis!=='undefined'?globalThis:this);
