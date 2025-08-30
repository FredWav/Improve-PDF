import { NextResponse } from "next/server";
import { readManifest } from "@/lib/manifest";
export const maxDuration=60; export const runtime="nodejs"; export const dynamic="force-dynamic";
export async function GET(_:Request,{params}:{params:{jobId:string;type:string}}){
  const m=await readManifest(params.jobId); if(!m) return NextResponse.json({error:"not found"},{status:404});
  const map:Record<string,string|undefined>={ pdf:m.files.output, extract:m.files.extract, normalize:m.files.normalize, rewrite:m.files.rewrite, images:m.files.images, render:m.files.output };
  const key=map[params.type]; if(!key) return NextResponse.json({error:"file not ready"},{status:404});
  const r=await fetch(`https://blob.vercel-storage.com/${key}`,{headers:{Authorization:`Bearer ${process.env.BLOB_READ_WRITE_TOKEN!}`}});
  if(!r.ok) return NextResponse.json({error:"blob fetch failed"},{status:500});
  const buf=Buffer.from(await r.arrayBuffer());
  return new NextResponse(buf,{status:200,headers:{"Content-Type":params.type==="pdf"?"application/octet-stream":"application/json","Content-Disposition":`attachment; filename="${params.type}-${params.jobId}"`}});
}
