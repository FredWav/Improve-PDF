import { NextResponse } from "next/server";
import { ensureManifest } from "@/lib/manifest";
export const maxDuration=60; export const runtime="nodejs"; export const dynamic="force-dynamic";
export async function POST(req:Request){
  const {id} = (await req.json()) as {id?:string};
  if(!id) return NextResponse.json({error:"id manquant"},{status:400});
  await ensureManifest(id,`jobs/${id}/input.pdf`);
  return NextResponse.json({ok:true,id});
}
