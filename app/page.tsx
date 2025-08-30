"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const r = useRouter();
  return (
    <main style={{maxWidth:760,margin:"40px auto",padding:16}}>
      <h1 style={{fontSize:28,fontWeight:800}}>Improve-PDF</h1>
      <form onSubmit={async e=>{e.preventDefault(); if(!file) return; setLoading(true);
        const fd=new FormData(); fd.append("file",file);
        const up=await fetch("/api/upload",{method:"POST",body:fd}); const j=await up.json();
        if(!j.id){ alert(j.error||"Upload échoué"); setLoading(false); return; }
        await fetch("/api/enqueue",{method:"POST",body:JSON.stringify({id:j.id})});
        r.push(`/ebook/${j.id}`);
      }}>
        <input type="file" accept="application/pdf" onChange={e=>setFile(e.target.files?.[0]||null)} />
        <button disabled={!file||loading} style={{marginLeft:12}}>{loading?"Upload...":"Lancer"}</button>
      </form>
    </main>
  );
}
