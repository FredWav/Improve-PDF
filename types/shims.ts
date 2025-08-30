// types/shims.ts
// Déclarations minimales pour des libs sans types officiels
// ⚠️ Ne pas redéclarer ici 'epub-gen' (déjà géré dans types/epub-gen.d.ts)

declare module 'ejs' {
  const ejs: any
  export default ejs
}
