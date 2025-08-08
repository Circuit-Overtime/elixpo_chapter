'use client'
import { Sidebar, SidebarContent, SidebarGroup, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import React, { useState } from 'react'
import { logos } from '../../../../../public/assets/images/images';
import Link from 'next/link';
import {  HomeIcon } from 'lucide-react';
interface Props {
   id?: string,
   name?: string,
   icon?: string,
   starred?: boolean
}
const initialPlayground: Props[] = [];
const DashBoardSideBar = (props: Props) => {
  
  const pathName = usePathname();
  const [starredPlayGrd,setStarredPlayGrd] = useState(initialPlayground.filter((p) => p.starred));
  const [recentPlayGround,setRecentPlayGround] = useState(initialPlayground);
  return (
    <Sidebar variant='inset' collapsible='icon' className="border-r " >
       <SidebarHeader className='mx-auto'>
         <div className='flex items-center gap-0'>
          <Image alt='logo' src={logos.logo7} className='w-10 h-10 object-contain' />
          <span className='text-xl font-bold' style={{fontFamily: "poppins"}}>FingAI.</span>
         </div>
       </SidebarHeader>
       <SidebarContent className='mt-10'>
        <SidebarGroup>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={pathName === '/'} >
                <Link href={"/"} >
                  <HomeIcon className='size-4'/>
                  <span className='font-mono text-md'>Home</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>
       </SidebarContent>
    </Sidebar>
  )
}

export default DashBoardSideBar