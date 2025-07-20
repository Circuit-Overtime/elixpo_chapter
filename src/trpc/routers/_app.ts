import { projectRouter } from '@/modules/projects/server/procedures';
import { createTRPCRouter } from '../init';
import { messageRouter } from '@/modules/messages/server/procedures';
export const appRouter = createTRPCRouter({
      messages: messageRouter,
      projects: projectRouter,
});
// export type definition of API
export type AppRouter = typeof appRouter;