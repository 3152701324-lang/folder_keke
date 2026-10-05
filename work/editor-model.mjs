export const copy = value => JSON.parse(JSON.stringify(value));
export const contains = (rect, p) => !!rect && !!p && p.r >= rect.r && p.r < rect.r + rect.h && p.c >= rect.c && p.c < rect.c + rect.w;
export function rectangle(a,b) {
  return {r:Math.min(a.r,b.r),c:Math.min(a.c,b.c),h:Math.abs(a.r-b.r)+1,w:Math.abs(a.c-b.c)+1};
}
export function region(map,rect) {
  return Array.from({length:rect.h},(_,r)=>Array.from({length:rect.w},(_,c)=>copy(map.tiles[rect.r+r][rect.c+c])));
}
function fits(map,rect) {
  if (!rect || rect.r<0 || rect.c<0 || rect.r+rect.h>map.height || rect.c+rect.w>map.width) throw new Error('选区超出地图，操作未应用');
}
function place(map,tiles,r,c) {
  const rect={r,c,h:tiles.length,w:tiles[0].length}; fits(map,rect);
  tiles.forEach((row,dr)=>row.forEach((tile,dc)=>map.tiles[r+dr][c+dc]=copy(tile)));
  return rect;
}
export function pasteRegion(map,tiles,r,c) {
  const next=copy(map),rect=place(next,tiles,r,c); return {map:next,rect};
}
export function changeRegion(map,rect,kind,color) {
  fits(map,rect); const next=copy(map);
  for(let r=rect.r;r<rect.r+rect.h;r++) for(let c=rect.c;c<rect.c+rect.w;c++) {
    const tile=next.tiles[r][c];
    if(kind==='delete') next.tiles[r][c]=null;
    else if(kind==='place' && !tile) next.tiles[r][c]={color,fold:null};
    else if(tile) { tile.color=color; if(color==='black') tile.fold=null; }
  }
  return {map:next,rect};
}
export function moveRegion(map,rect,r,c) {
  fits(map,rect);const tiles=region(map,rect),next=copy(map);
  fits(map,{r,c,h:rect.h,w:rect.w});
  for(let y=rect.r;y<rect.r+rect.h;y++) for(let x=rect.c;x<rect.c+rect.w;x++) next.tiles[y][x]=null;
  const target=place(next,tiles,r,c);
  for(const key of ['spawn','exit']) if(contains(rect,map[key])) next[key]={...map[key],r:r+map[key].r-rect.r,c:c+map[key].c-rect.c};
  return {map:next,rect:target};
}
export function transformRegion(map,rect,kind) {
  fits(map,rect);const tiles=region(map,rect),next=copy(map);
  const rotate=kind==='rotate',h=rotate?rect.w:rect.h,w=rotate?rect.h:rect.w;
  const destination={r:rect.r,c:rect.c,h,w};fits(map,destination);
  const point=(r,c)=>rotate?{r:c,c:rect.h-1-r}:kind==='flipH'?{r,c:rect.w-1-c}:{r:rect.h-1-r,c};
  const output=Array.from({length:h},()=>Array(w).fill(null));
  tiles.forEach((row,r)=>row.forEach((tile,c)=>{
    const to=point(r,c);tile=copy(tile);
    if(tile?.fold) tile.fold=rotate?({h:'v',v:'h',d1:'d2',d2:'d1'})[tile.fold]:({h:'h',v:'v',d1:'d2',d2:'d1'})[tile.fold];
    output[to.r][to.c]=tile;
  }));
  for(let r=rect.r;r<rect.r+rect.h;r++) for(let c=rect.c;c<rect.c+rect.w;c++) next.tiles[r][c]=null;
  place(next,output,rect.r,rect.c);
  for(const key of ['spawn','exit']) if(contains(rect,map[key])) {
    const old=map[key],to=point(old.r-rect.r,old.c-rect.c);
    next[key]={...old,r:rect.r+to.r,c:rect.c+to.c};
    if(key==='spawn') next.spawn.dir=rotate?(old.dir+2)%8:kind==='flipH'?(8-old.dir)%8:(4-old.dir+8)%8;
  }
  return {map:next,rect:destination};
}
export function fillRegion(map,start,color) {
  if(!map.tiles[start.r]?.[start.c]) throw new Error('填充需要从已有方块开始');
  const next=copy(map),original=map.tiles[start.r][start.c].color,queue=[start],visited=new Set();
  for(let i=0;i<queue.length;i++) {
    const {r,c}=queue[i],key=r+','+c;
    if(visited.has(key)||map.tiles[r]?.[c]?.color!==original) continue;
    visited.add(key);next.tiles[r][c].color=color;if(color==='black') next.tiles[r][c].fold=null;
    for(const [dr,dc] of [[1,0],[-1,0],[0,1],[0,-1]]) queue.push({r:r+dr,c:c+dc});
  }
  return {map:next};
}
export function symmetricCells(map,r,c,mode) {
  const cells=[{r,c,flip:null}];
  if(mode==='horizontal'||mode==='both') cells.push({r,c:map.width-1-c,flip:'flipH'});
  if(mode==='vertical'||mode==='both') cells.push({r:map.height-1-r,c,flip:'flipV'});
  if(mode==='both') cells.push({r:map.height-1-r,c:map.width-1-c,flip:'both'});
  return cells.filter((p,i)=>cells.findIndex(q=>q.r===p.r&&q.c===p.c)===i);
}
