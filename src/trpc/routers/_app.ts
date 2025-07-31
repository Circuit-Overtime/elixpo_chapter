import { projectRouter } from '@/modules/projects/server/procedures';
import { createTRPCRouter } from '../init';
import { messageRouter } from '@/modules/messages/server/procedures';
import { usageRoute } from '@/modules/usage/server/procedures';
export const appRouter = createTRPCRouter({
      usage: usageRoute,
      messages: messageRouter,
      projects: projectRouter,
});
// export type definition of API
export type AppRouter = typeof appRouter;