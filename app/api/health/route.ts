import { NextResponse } from "next/server";
export const maxDuration = 60; export const runtime="nodejs"; export const dynamic="force-dynamic";
export async function GET(){
  const hasToken=!!process.env.BLOB_READ_WRITE_TOKEN; let blobOk=false;
  try{ const url="https://blob.vercel-storage.com/healthcheck.txt";
    const put=await fetch(url,{method:"PUT",headers:{Authorization:`Bearer ${process.env.BLOB_READ_WRITE_TOKEN}`},body:"ok"});
    if(put.ok){ await fetch(url,{method:"DELETE",headers:{Authorization:`Bearer ${process.env.BLOB_READ_WRITE_TOKEN}`}}); blobOk=true; }
  }catch{}
  return NextResponse.json({ ok: hasToken && blobOk, hasToken, blobOk });
}
