import { fr } from '@/locales/fr/common'

type Dict = typeof fr
let current: Dict = fr

export function t(path: string): string {
  const parts = path.split('.')
  let node: any = current
  for (const p of parts) {
    if (node == null) return path
    node = node[p]
  }
  return typeof node === 'string' ? node : path
}