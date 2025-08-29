# Improve-PDF

Projet Next.js (App Router) initialisé avec TypeScript, ESLint, Prettier, Husky et lint-staged.

## Scripts

```bash
npm run dev
npm run build
npm run start
npm run lint
npm run type-check
npm run format
npm run format:check
```

## Qualité & Hooks

Pré-commit (Husky + lint-staged) :
- ESLint (fix) sur fichiers staged
- Prettier
- Type-check bloquant (tsc --noEmit)

## Structure

```
.
├── next.config.mjs
├── package.json
├── tsconfig.json
├── .eslintrc.cjs
├── .prettierrc
├── src
│   ├── app
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components
│   │   └── ExampleCard.tsx
│   └── styles
│       └── globals.css
```

## Pistes

- pdf-lib ou pdfjs-dist
- API route (upload + analyse PDF)
- Tests (Jest + Testing Library)
- CI GitHub Actions (lint + type-check + tests)
- Docker multi-stage
- Optimisation bundle

## Licence

MIT
