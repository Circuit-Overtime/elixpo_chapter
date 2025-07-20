import { inngest } from '@/inngest/client'
import prisma from '@/lib/db'
import {baseProcedure, createTRPCRouter} from '@/trpc/init'
import z from 'zod'

export const messageRouter = createTRPCRouter({
    getMany: baseProcedure
    .input(
         z.object({
             projectId: z.string()
             .min(1, {message: "ProjectID is required"})
             
         })
      )
     .query(
        async({input}) => {
             const message = await prisma.message.findMany({
                where: {
                    projectId: input.projectId
                },
                include:{
                    fragment: true
                },
                 orderBy: {
                     updatedAt: 'asc'
                 }
             })
             return message
        }),
     create: baseProcedure
      .input(
         z.object({
             prompt: z.string()
             .min(1, {message: "Message is Required"})
             .max(10000, {message: "Value is too long"}),
             projectId: z.string()
             .min(1, {message: "ProjectID is required"})
             
         })
      )
      .mutation(async ({input}) => {
       const createdMsg = await prisma.message.create({
             data: {
                 projectId: input.projectId,
                  content: input.prompt,
                  role: "USER",
                  type: "RESULT"
                  
             }
          })
          await inngest.send({
             name: "app/message.created",
             data:{
                 prompt: input.prompt,
                 projectId: input.projectId
             }
          })

          return createdMsg
      })
})