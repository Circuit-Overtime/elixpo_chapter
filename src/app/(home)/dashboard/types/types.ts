import { UserResource } from "@clerk/types";

export interface PlayGroundProjects {
  id: string;
  title: string;
  describtion: string | null;
  template: string;
  createdAt: Date;
  updatedAt: Date;
  userId: string;
  startMark: { isMarked: boolean }[];
}


export type PlayGroundTableTypesProps = {
  projects?: PlayGroundProjects[];
  onUpdate?: (project: PlayGroundProjects) => void;
  onDelete?: (projectId: string) => void;
  onDuplicate?: (project: PlayGroundProjects) => void;
};

export interface EditProjectProps {
  title: string;
  describtion: string;
}
