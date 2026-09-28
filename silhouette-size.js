(function(root){
  'use strict';
  const cache=new WeakMap();
  function describe(alpha,width,height,ratio){
    const mask=Uint8Array.from(alpha,v=>v>=32?1:0),area=mask.reduce((a,b)=>a+b,0);
    if(!area||area/mask.length>.985)return null; // Opaque backgrounds are not product silhouettes.
    return {mask,width,height,ratio,area};
  }
  function descriptor(asset){
    if(!asset?.img||!asset.alphaBounds)return null;
    if(cache.has(asset))return cache.get(asset);
    let value=null;
    try{
      const b=asset.alphaBounds,canvas=document.createElement('canvas');canvas.width=48;canvas.height=48;
      const g=canvas.getContext('2d',{willReadFrequently:true});g.drawImage(asset.img,b.x,b.y,b.w,b.h,0,0,48,48);
      const pixels=g.getImageData(0,0,48,48).data;
      value=describe(Array.from({length:48*48},(_,i)=>pixels[i*4+3]),48,48,b.w/b.h);
    }catch(_){/* An unreadable image must never prevent layout. */}
    cache.set(asset,value);return value;
  }
  function similar(a,b){
    if(!a||!b||a.width!==b.width||a.height!==b.height||Math.abs(Math.log(a.ratio/b.ratio))>Math.log(1.08))return false;
    let intersection=0,union=0;
    for(let i=0;i<a.mask.length;i++){intersection+=a.mask[i]&&b.mask[i]?1:0;union+=a.mask[i]||b.mask[i]?1:0;}
    return union>0&&intersection/union>=.9;
  }
  function synchronize(items,getDescriptor){
    const groups=[];let changed=0;
    for(const item of items.slice().sort((a,b)=>a.index-b.index)){
      const shape=getDescriptor(item);if(!shape)continue;
      // Complete-link grouping avoids gradually merging unrelated silhouettes.
      let group=groups.find(g=>g.role===item.type&&g.members.every(m=>similar(m.shape,shape)));
      if(!group){group={role:item.type,members:[]};groups.push(group);}
      group.members.push({item,shape});
    }
    for(const group of groups){
      const reference=group.members[0].item,target=Math.max(reference.w,reference.h);
      for(const {item} of group.members.slice(1)){
        const longest=Math.max(item.w,item.h);if(longest<=0||Math.abs(longest-target)<.001)continue;
        const factor=target/longest,cx=item.x+item.w/2,cy=item.y+item.h/2;
        item.w*=factor;item.h*=factor;item.x=cx-item.w/2;item.y=cy-item.h/2;changed++;
      }
    }
    return changed;
  }
  root.SilhouetteSize={describe,descriptor,similar,synchronize};
  if(typeof module!=='undefined')module.exports=root.SilhouetteSize;
})(typeof globalThis!=='undefined'?globalThis:this);
