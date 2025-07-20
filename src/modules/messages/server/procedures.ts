import { inngest } from '@/inngest/client'
import prisma from '@/lib/db'
import {baseProcedure, createTRPCRouter} from '@/trpc/init'
import z from 'zod'

export const messageRouter = createTRPCRouter({
    getMany: baseProcedure
     .query(
        async() => {
             const message = await prisma.message.findMany({
                 orderBy: {
                     updatedAt: 'desc'
                 }
             })
             return message
        }),
     create: baseProcedure
      .input(
         z.object({
             prompt: z.string().min(1, {message: "Message is Required"})
         })
      )
      .mutation(async ({input}) => {
       const createdMsg = await prisma.message.create({
             data: {
                  content: input.prompt,
                  role: "USER",
                  type: "RESULT"
             }
          })
          await inngest.send({
             name: "app/message.created",
             data:{
                 prompt: input.prompt
             }
          })

          return createdMsg
      })
})