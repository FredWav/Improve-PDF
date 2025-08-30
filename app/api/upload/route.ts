import { NextResponse } from "next/server";
import { ensureManifest } from "@/lib/manifest";
const BLOB_URL="https://blob.vercel-storage.com";
export const maxDuration=60; export const runtime="nodejs"; export const dynamic="force-dynamic";
function auth(){ const t=process.env.BLOB_READ_WRITE_TOKEN; if(!t) throw new Error("Missing BLOB_READ_WRITE_TOKEN"); return { Authorization:`Bearer ${t}` }; }
function newJobId(){ return `job-${Date.now()}-${Math.random().toString(36).slice(2,8)}`; }
export async function POST(req:Request){
  const form=await req.formData(); const file=form.get("file") as File|null;
  if(!file) return NextResponse.json({error:"Aucun fichier reçu."},{status:400});
  const id=newJobId(); const inputKey=`jobs/${id}/input.pdf`;
  const buf=Buffer.from(await file.arrayBuffer());
  const put=await fetch(`${BLOB_URL}/${inputKey}`,{method:"PUT",headers:{...auth(),"Content-Type":"application/pdf"},body:buf});
  if(!put.ok) return NextResponse.json({error:"Upload vers Blob échoué."},{status:500});
  await ensureManifest(id,inputKey); return NextResponse.json({id});
}
