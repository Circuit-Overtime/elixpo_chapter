/* import { createSlice } from "@reduxjs/toolkit";
import { action } from "../../../../convex/_generated/server";
import { number } from "zod";

interface ProjectProps {
     _id: string;
     name: string
     projectNumber: number;
     thumbnail: string;
     lastModified: number;
     createdAt: number;
     isPublic: boolean;
}
interface ProjectState {
     project: ProjectProps[];
     totalNumber: number;
     isLoading: boolean;
     error: string | null;
     lastFetched: number | null;
     isCreating: boolean;
     createError: string | null
}

const initialState: ProjectState = {
     project: [],
     totalNumber: 0,
     isLoading: false,
     error: '',
     lastFetched: 0,
     isCreating: false,
     createError: ""
}

const slice = createSlice({
     name: 'project',
     initialState,
     reducers: {
          fetchProjectStart: (state) => {
             state.isLoading = true
             state.error = null
          },
          fetchProjectSuccess: (
            state
            action: PayloadAction<(projcets: ProjectProps[];total: number)>
        ) => {
              state.isLoading = false;
              state.project
          }
     }
})

export const {} = slice.actions
export default slice.reducer */