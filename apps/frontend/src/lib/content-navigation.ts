type Query = Record<string, unknown>;
type ReadingState = {page:number;q:string;sourceId:string};
const workspaces=['market-impact','stock-market','goods-supply','competitor-watch'];
function preserved(query:Query) {
  const result:Record<string,string>={};
  for(const key of ['reportDate','reportFocus','returnTo']) if(typeof query[key]==='string' && query[key].length<=200)result[key]=query[key];
  return result;
}
export function browseState(query:Query):ReadingState {
  const page=typeof query.contentPage==='string'?Number(query.contentPage):1;
  return {page:Number.isInteger(page)&&page>0&&page<=100000?page:1,q:typeof query.contentQuery==='string'?query.contentQuery.slice(0,200):'',sourceId:typeof query.contentSource==='string'?query.contentSource.slice(0,4000):''};
}
export function readingTarget(id:string,path:string,query:Query,state:ReadingState) {
  const workspace=path.split('/')[2];
  const prefix=path.startsWith('/workspace/')&&workspaces.includes(workspace)?`/workspace/${workspace}`:'';
  const params=new URLSearchParams({...preserved(query),contentOrigin:path,contentPage:String(state.page),contentQuery:state.q,contentSource:state.sourceId});
  return `${prefix}/content/${encodeURIComponent(id)}?${params}`;
}
export function returnTarget(record:{sourceId:string;themeId:string},query:Query) {
  const source=`/sources/${encodeURIComponent(record.sourceId)}`,theme=`/themes/${encodeURIComponent(record.themeId)}`;
  const allowed=[source,theme,...workspaces.flatMap(w=>[`/workspace/${w}/sources/${encodeURIComponent(record.sourceId)}`,`/workspace/${w}/topics/${encodeURIComponent(record.themeId)}`])];
  const origin=typeof query.contentOrigin==='string'&&allowed.includes(query.contentOrigin)?query.contentOrigin:null;
  if(!origin)return `${source}?section=content#collected-content`;
  const state=browseState(query);
  const params=new URLSearchParams({...preserved(query),section:'content',contentPage:String(state.page),contentQuery:state.q,contentSource:state.sourceId});
  return `${origin}?${params}#collected-content`;
}
