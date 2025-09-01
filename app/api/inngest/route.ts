import { serve } from 'inngest/next';
import { inngest } from '@/inngest/client';
import { processEbook } from '@/inngest/functions';

// On n'exporte que les méthodes GET, POST, PUT, ce qui est autorisé par Next.js
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    processEbook,
  ],
});
