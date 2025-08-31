// Alias de statut pour compat avec l’ancien front qui appelle /api/jobs/:id
// On ne touche pas au endpoint existant /api/status/[id].
// On ré-exporte simplement son handler GET.

export { GET } from '../../status/[id]/route'
