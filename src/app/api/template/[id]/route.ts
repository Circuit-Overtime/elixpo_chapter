import { readTemplateStructureFromJson,saveTemplateStructureToJson } from "@/features/playground/lib/path-to-json";
import prisma from "@/lib/db";
import path from "path";
import fs from 'fs/promises'
import { NextRequest } from "next/server";
import { error } from "console";
import { templatePaths } from "@/lib/template";
import { _success } from "zod/v4/core";

function validateJson(data: unknown): boolean {
      try {
         JSON.parse(JSON.stringify(data))
         return true
      }catch(error) {
         console.log("Invalide Json Structure", error);
         return false
         
      }
}

export async function GET(
    request: NextRequest,
    {params}: {params: Promise<{id: string}>}
) {
     const {id} = await params;
     if(!id) {
         return Response.json({error: "Missing PlayGround Id"}, {status: 404})
     }
     const playground = await prisma.playground.findUnique({
         where: {
             id
         }
     })

     if(!playground) {
         return Response.json({error: "PlayGround is not Found"},{status: 404})
     }

    const templateKey = playground.template as keyof typeof templatePaths;
    const templatePath = templatePaths[templateKey]
     try {
       const inputPath = path.join(process.cwd(), templatePath);
       const outpuFile = path.join(process.cwd(), `output/${templateKey}.json`)
       await saveTemplateStructureToJson(inputPath, outpuFile);
       const res = readTemplateStructureFromJson(outpuFile);
       if(!validateJson(!(await res).items)) {
         return Response.json({error: "Invalide Json Structure"},{status: 500})
       }
       await fs.unlink(outpuFile)
       return Response.json({ success: true, templateJson: res }, { status: 200 });
     } catch (error) {
        return Response.json({ error: "Failed to generate template" }, { status: 500 });
     }
}