import { inngest } from '@/inngest/client'
import prisma from '@/lib/db'
import {baseProcedure, createTRPCRouter} from '@/trpc/init'
import z from 'zod'
import { generateSlug } from 'random-word-slugs'
import { TRPCError } from '@trpc/server'
export const projectRouter = createTRPCRouter({
    getOne: baseProcedure
    .input(z.object({
         id: z.string()
         .min(1,{message: "ID is required"})
    }))
    .query(
        async({input}) => {
            const existingProject = await prisma.project.findUnique({
                 where: {
                     id: input.id
                 }
            })
            if(!existingProject) {
                 throw new TRPCError({code: "NOT_FOUND",message: "project not found"})
            }
            return existingProject
        }
    ),
    getMany: baseProcedure
     .query(
        async() => {
             const projects = await prisma.project.findMany({
                 orderBy: {
                     updatedAt: 'desc'
                 }
             })
             return projects
        }),
     create: baseProcedure
      .input(
         z.object({
             prompt: z.string()
             .min(1, {message: "Message is Required"})
             .max(10000,{message: "Value is too long"})
         })
      )
      .mutation(async ({input}) => {

       const createProject = await prisma.project.create({
          data: {
             name: generateSlug(2,{
                format: "kebab"
             }),
             messages: {
                 create:{ 
                    content: input.prompt,
                    role: "USER",
                    type: "RESULT"
                 }
             }
          }
       })

          await inngest.send({
             name: "app/message.created",
             data:{
                 prompt: input.prompt,
                 projectId: createProject.id
             }
          })

          return createProject
      })
})