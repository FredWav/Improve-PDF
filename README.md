
# Improve PDF — Build minimal stable pipeline

Ce repo est une version **propre et stable** pour déployer sur Vercel **sans rien faire en local**.

## Variables d'environnement (Vercel)
- `BLOB_READ_WRITE_TOKEN` — jeton Read/Write du Blob Store Vercel

## Test express
1. Déploie sur Vercel (Node 20).
2. Ouvre `/api/health` → `ok:true`.
3. Page d'accueil → upload un PDF → redirection vers `/ebook/<jobId>`.
4. La timeline avance jusqu'à **render** puis **Download** renvoie un PDF démo.

L'ensemble des artefacts est écrit sous `jobs/<id>/...` dans Vercel Blob.
