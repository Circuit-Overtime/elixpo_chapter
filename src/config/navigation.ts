export interface NavItem {
      id: string | number,
      title: string,
      herf: string,
      description: string,
      count?: number | string,
      isComingSoon?: boolean,
      isNew?: boolean,
      isLab?: boolean


}


export interface NavSection {
     title: string,
     items: NavItem[];
}

export const navigationSection: NavSection[] = [
    {
        title: "Getting started",
        items:  [
            {
                 id: "intro",
                 title: "Introduction",
                 herf: "/docs",
                 description: "",
                 count: 1,
                 
            }
        ]
    }
]