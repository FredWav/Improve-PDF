export type Step = "queued"|"extract"|"normalize"|"rewrite"|"images"|"render"|"done"|"error";
export type JobManifest = { id:string; createdAt:number; status:Step; inputKey:string; files:Record<string,string>; };
const BLOB_URL = "https://blob.vercel-storage.com";
function auth(){ const t=process.env.BLOB_READ_WRITE_TOKEN; if(!t) throw new Error("Missing BLOB_READ_WRITE_TOKEN"); return { Authorization:`Bearer ${t}` }; }
export function manifestKey(jobId:string){ return `jobs/${jobId}/manifest.json`; }
export async function blobHead(key:string){ const r=await fetch(`${BLOB_URL}/${key}`,{method:"HEAD",headers:auth()}); return r.ok; }
export async function blobPutJSON(key:string,data:unknown){
  const r=await fetch(`${BLOB_URL}/${key}`,{method:"PUT",headers:{...auth(),"Content-Type":"application/json"},body:JSON.stringify(data)});
  if(!r.ok) throw new Error(`Blob PUT failed for ${key}`);
}
export async function blobGetJSON<T>(key:string):Promise<T|null>{ const r=await fetch(`${BLOB_URL}/${key}`,{headers:auth()});
  if(r.status===404) return null; if(!r.ok) throw new Error(`Blob GET failed for ${key}`); return (await r.json()) as T; }
export async function ensureManifest(jobId:string,inputKey:string){
  const key=manifestKey(jobId); if(await blobHead(key)) return;
  const m:JobManifest={ id:jobId, createdAt:Date.now(), status:"queued", inputKey, files:{} }; await blobPutJSON(key,m);
}
export async function readManifest(jobId:string){ return await blobGetJSON<JobManifest>(manifestKey(jobId)); }
export async function writeManifest(jobId:string,data:JobManifest){ await blobPutJSON(manifestKey(jobId),data); return data; }
