"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
type M = { id:string; status:string; files:Record<string,string> };
const order = ["queued","extract","normalize","rewrite","images","render"] as const;
export default function Job(){
  const { id } = useParams<{id:string}>(); const [m,setM]=useState<M|null>(null);
  const [fired,setFired]=useState<Record<string,boolean>>({});
  useEffect(()=>{ const t=setInterval(async()=>{ const r=await fetch(`/api/status/${id}`);
    if(r.ok) setM(await r.json()); },1000); return()=>clearInterval(t); },[id]);
  useEffect(()=>{ (async()=>{
    if(!m) return; const i=order.indexOf(m.status as any); if(i>=0&&i<order.length){
      const step=order[i]; if(!fired[step]){ setFired(p=>({...p,[step]:true}));
        await fetch(`/api/jobs/${step}`,{method:"POST",body:JSON.stringify({id:m.id})});
      }
    }
  })(); },[m,fired]);
  return(<main style={{maxWidth:720,margin:"40px auto",padding:16}}>
    <h1 style={{fontSize:22,fontWeight:700}}>Job {id}</h1>
    <ul style={{marginTop:12}}>{order.map(s=>(
      <li key={s} style={{opacity: m?.status===s||order.indexOf(s)<=order.indexOf(m?.status as any)?1:.4}}>
        {s}{m?.status===s?" (en cours)":""}
      </li>))}{m?.status==="render"&&<li>done</li>}</ul>
    {m?.status==="done"&&<a href={`/api/download/${m.id}/pdf`} style={{display:"inline-block",marginTop:16}}>Télécharger</a>}
  </main>);
}
