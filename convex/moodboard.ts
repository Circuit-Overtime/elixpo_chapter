import { v } from "convex/values";
import { query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

export const getMoodBoardImages =  query({
     args: {projectId: v.id('projects')},
     handler: async(ctx,{projectId}) => {
         const userId = await getAuthUserId(ctx);
         if(!userId) {
            return [];
         }
         const project = await ctx.db.get(projectId);
         if(!project || project.userId !== userId) {
             return []
         }
         const storageIds = project.moodBoardImages || [];
         const images = await Promise.all(
             storageIds.map(async (storageId,index) => {
                 try {
                   const url = await ctx.storage.getUrl(storageId)
                   return {
                     id: `convex-${storageId}`,
                     storageId,
                     url,
                     uploaded: true,
                     uploading: false,
                     index
                   }
                 } catch (error) {
                   return null
                 }
             })
         )
         return images
         .filter((image) =>  image !== null)
         .sort((a,b)=> a!.index -  b!.index)
     }
})