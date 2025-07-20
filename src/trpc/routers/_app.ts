import { createTRPCRouter } from '../init';
import { messageRouter } from '@/modules/messages/server/procedures';
export const appRouter = createTRPCRouter({
      messages: messageRouter
});
// export type definition of API
export type AppRouter = typeof appRouter;