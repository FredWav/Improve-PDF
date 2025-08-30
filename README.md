Improve-PDF



Une application complète d’amélioration de PDF construite avec Next.js, qui transforme des PDF en ebooks illustrés professionnels grâce à l’IA, tout en préservant le sens du contenu original.

🎯 Fonctionnalités

Extraction de texte PDF : extraction avancée avec OCR de secours pour les documents scannés

Amélioration IA du contenu : amélioration intelligente du texte en préservant ≥98 % de la longueur et du sens originaux

Illustration intelligente : génération automatique d’images (1 toutes les 800–1200 mots) avec licences correctes

Sortie multi-format : génération en HTML, PDF et EPUB

Traitement en temps réel : suivi de progression en 5 étapes avec journalisation détaillée

Préservation du contenu : validation basée sur les embeddings pour garantir le respect du sens

Conformité des licences : suivi complet des attributions pour toutes les images générées

🚀 Démarrage rapide
Prérequis

Node.js 18.18.0 ou supérieur

Compte Vercel (pour le déploiement et le stockage Blob)

Clé API OpenAI (pour l’amélioration du texte et la génération d’images)

Installation

Cloner le dépôt

git clone https://github.com/FredWav/Improve-PDF.git
cd Improve-PDF


Installer les dépendances

npm install


Configurer les variables d’environnement

cp .env.example .env


📋 IMPORTANT : renseigner vos clés API dans le fichier .env.

Variables requises :

NEXT_PUBLIC_APP_NAME=Ebook Improver
OPENAI_API_KEY=your_openai_api_key
BLOB_READ_WRITE_TOKEN=your_vercel_blob_token
PEXELS_API_KEY=your_pexels_key (optionnel)
UNSPLASH_ACCESS_KEY=your_unsplash_key (optionnel)


Lancer le serveur de développement

npm run dev


Ouvrir le navigateur
Aller sur http://localhost:3000

🏗️ Architecture
Pipeline de traitement

L’application suit un pipeline de 5 étapes :

Extract (/api/jobs/extract)

Extraction du texte PDF avec pdfjs-dist

OCR de secours avec tesseract.js pour les documents scannés

Traitement par lots (20–40 pages max par exécution)

Normalize (/api/jobs/normalize)

Règles typographiques françaises (« », —, espaces insécables)

Normalisation de la mise en forme

Nettoyage du texte et préservation de la structure

Rewrite (/api/jobs/rewrite)

Amélioration IA via OpenAI

Préservation stricte de la longueur (≥98 % de l’original)

Validation par embeddings pour garantir le sens

Rapport d’audit complet

Images (/api/jobs/images)

Extraction de concepts et génération d’images

Chaîne de secours : OpenAI Images → Pexels → Unsplash

Suivi des licences et attributions

Placement stratégique (1 image toutes les 800–1200 mots)

Render (/api/jobs/render)

Génération HTML via unified/remark/rehype

Export PDF avec Chromium headless (puppeteer-core)

Création EPUB avec epub-gen

Rapport d’audit complet

Stack technologique

Framework : Next.js 14 (App Router)

Runtime : Node.js (compatible serverless)

Stockage : Vercel Blob

Services IA : OpenAI (GPT + DALL-E + Embeddings)

APIs Images : Pexels, Unsplash (fallbacks)

Traitement PDF : pdfjs-dist, pdf-lib, tesseract.js

Pipeline contenu : unified, remark, rehype

Exports : puppeteer-core, @sparticuz/chromium, epub-gen

Utilitaires : zod, diff, typopo

📁 Structure du projet
├── app/                          # Next.js App Router
│   ├── page.tsx                  # Page d’accueil
│   ├── layout.tsx                 # Layout racine
│   ├── upload/page.tsx            # Interface d’upload PDF
│   ├── ebook/[id]/page.tsx        # Page de suivi de statut
│   └── api/                       # Routes API
│       ├── upload/route.ts        # Gestion d’upload fichier
│       ├── enqueue/route.ts       # Gestion de file de jobs
│       ├── status/[id]/route.ts   # Récupération du statut
│       ├── download/[jobId]/[type]/route.ts # Téléchargements
│       └── jobs/                  # Pipeline de traitement
│           ├── extract/route.ts
│           ├── normalize/route.ts
│           ├── rewrite/route.ts
│           ├── images/route.ts
│           └── render/route.ts
├── components/                   # Composants réutilisables
│   ├── UploadArea.tsx
│   ├── ProgressSteps.tsx
│   └── DownloadCard.tsx
├── lib/                          # Utilitaires
│   ├── blob.ts                   # Opérations Vercel Blob
│   ├── status.ts                 # Gestion des statuts de job
│   ├── pdf.ts                    # Traitement PDF (TODO)
│   ├── ocr.ts                    # OCR (TODO)
│   ├── llm.ts                    # Intégration OpenAI (TODO)
│   ├── images.ts                 # Génération d’images (TODO)
│   └── html.ts                   # Outils HTML/Export (TODO)
└── styles/
    └── globals.css               # Styles globaux

🔧 Configuration
Variables d’environnement
Variable	Requise	Description
NEXT_PUBLIC_APP_NAME	Non	Nom affiché de l’application
OPENAI_API_KEY	Oui	Clé API OpenAI
BLOB_READ_WRITE_TOKEN	Oui	Jeton Vercel Blob
PEXELS_API_KEY	Non	API Pexels pour fallback images
UNSPLASH_ACCESS_KEY	Non	API Unsplash pour fallback images
MAX_PDF_PAGES	Non	Nombre max de pages par lot (défaut : 500)
EMBEDDING_SIMILARITY_THRESHOLD	Non	Seuil de similarité embeddings (défaut : 0.93)
Déploiement Vercel

Connexion à Vercel

npx vercel


Configurer les variables d’environnement dans le dashboard Vercel

Configurer Vercel Blob dans les paramètres du projet

Déployer

npm run build
npx vercel --prod

📊 Limites & coûts
Limites

Taille fichier : 50 Mo max

Nombre de pages : 500 max (configurable)

Lot : 20–40 pages par exécution

Timeout : 60 s par route API (limite Vercel)

Coûts

OpenAI : ~0,002–0,02 $/page (selon contenu)

Vercel Blob : 0,15 $/Go stockage, 1 $/Go bande passante

Images OpenAI DALL·E : ~0,02 $/image

🔍 Assurance qualité

Longueur préservée : ≥98 % du texte original

Validation du sens : similarité embeddings ≥0,93

Structure conservée : titres, listes, mise en forme

Audit complet : rapport diff des changements

🛠️ Développement
Scripts
npm run dev          # Démarrage dev
npm run build        # Build production
npm run start        # Démarrage production
npm run lint         # ESLint
npm run type-check   # Vérification TS
npm run format       # Formatage Prettier

Tests
npm run test         # Lancer les tests
npm run test:watch   # Mode watch
npm run test:ci      # Mode CI

Qualité

ESLint (règles Next.js)

Prettier (formatage auto)

TypeScript strict

Husky (hooks pre-commit)

📋 État d’avancement
✅ Terminé

Structure Next.js

Routes API complètes

Upload + Blob storage

Suivi de statut/logs

Pipeline mock

Suivi progression en temps réel

Téléchargement fichiers

🚧 En cours

Extraction PDF

OCR Tesseract.js

Amélioration IA OpenAI

Génération images

Rendu HTML/PDF/EPUB

📝 À faire

Intégration IA en production

Parsing PDF avancé

Optimisation Chromium serverless

Monitoring performance

Mécanismes de reprise erreurs

🤝 Contribution

Forker le repo

Créer une branche feature/...

Commit (git commit -m 'feat: ...')

Push

Ouvrir une Pull Request

Convention de commit

feat: nouvelles fonctionnalités

fix: corrections de bugs

docs: doc uniquement

style: style/code

refactor: refactoring

test: ajout/màj tests

chore: maintenance

📄 Licence

MIT — voir le fichier LICENSE

🙏 Remerciements

Next.js, Vercel, OpenAI

Pexels & Unsplash

Mozilla PDF.js, Tesseract.js

📞 Support

Issues GitHub

Documentation

Vérification des variables d’environnement
