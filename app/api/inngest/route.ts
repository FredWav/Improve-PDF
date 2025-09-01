import { Inngest } from 'inngest';
import { serve } from 'inngest/next';
import { processEbook } from '../../../inngest/functions'; // On va créer ce fichier juste après

// Crée un client Inngest
export const inngest = new Inngest({ id: 'Improve-PDF' });

// 'serve' expose les fonctions d'Inngest à travers cette API
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    processEbook, // La fonction qui va faire le travail
  ],
});
