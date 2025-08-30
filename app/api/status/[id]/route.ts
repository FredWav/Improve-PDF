import { NextResponse } from "next/server";
import { readManifest } from "@/lib/manifest";
export const maxDuration=30; export const runtime="nodejs"; export const dynamic="force-dynamic";
export async function GET(_:Request,{params}:{params:{id:string}}){
  const m=await readManifest(params.id); if(!m) return NextResponse.json({error:"not found"},{status:404});
  return NextResponse.json(m);
}
