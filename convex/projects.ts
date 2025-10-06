import { v } from "convex/values"
import { mutation, query } from "./_generated/server"
import { getAuthUserId } from "@convex-dev/auth/server"

export const getProjects = query({
     args: {projectId: v.id('projects')},
     handler: async(ctx,{projectId}) => {
         const userId = await getAuthUserId(ctx)
         if(!userId) throw new Error('Not authenticated')

        const project = await ctx.db.get(projectId)
        if(!project) throw new Error("Project not found")

        if(project.userId !== userId && !project.isPublic) {
           throw new Error('Access Denial')
        }
      return project
     },

})

const getNextProjectNumber = async (ctx: any, userId: string): Promise<number> => {
  const counter = await ctx.db
    .query("project_counter")
    .withIndex("by_userId", (q: any) => q.eq("userId", userId))
    .first()

  if (!counter) {
    await ctx.db.insert("project_counter", {
      userId,
      nextProject_numner: 2, // ✅ fixed field name
    })
    return 1
  }

  const projectNumber = counter.nextProject_numner // ✅ fixed

  await ctx.db.patch(counter._id, {
    nextProject_numner: projectNumber + 1, // ✅ fixed
  })

  return projectNumber
}


export const createProject = mutation({
     args: {
         userId: v.id('users'),
         name: v.optional(v.string()),
         sketchesData: v.any(),
         thumbnail: v.optional(v.string())
     },
     handler: async (ctx, {userId,sketchesData,name,thumbnail}) => {
        console.log("[convex] Creating Projects for users", userId);
        const projectNumber = await getNextProjectNumber(ctx, userId);
        const projectName = name || `Project ${projectNumber}`
        const projectId = await ctx.db.insert('projects',{
             userId,
             name: projectName,
             sketchesData,
             projectNumber,
             lastModified: Date.now(),
             createdAt: Date.now(),
             isPublic: false

        })
        console.log("Project Created",{
             projectId,
             name: projectName,
             projectNumber
        })

        return {
             projectId,
             name:projectName,
             projectNumber
        }

     }
})