import { NextResponse } from "next/server";
import { ensureManifest, readManifest, writeManifest, JobManifest } from "@/lib/manifest";
export const maxDuration=60; export const runtime="nodejs"; export const dynamic="force-dynamic";
const BLOB_URL="https://blob.vercel-storage.com"; const auth=()=>({ Authorization:`Bearer ${process.env.BLOB_READ_WRITE_TOKEN!}` });
export async function POST(req:Request){
  const {id} = (await req.json()) as {id?:string};
  if(!id) return NextResponse.json({error:"id manquant"},{status:400});
  await ensureManifest(id,`jobs/${id}/input.pdf`);
  const m=(await readManifest(id))!; const key=`jobs/${id}/images.json`;
  await fetch(`${BLOB_URL}/${key}`,{method:"PUT",headers:{...auth(),"Content-Type":"application/json"},body:JSON.stringify({images:["img1","img2"]})});
  const next:JobManifest={...m,status:"images",files:{...m.files,images:key}}; await writeManifest(id,next);
  return NextResponse.json({ok:true,id,file:key});
}
