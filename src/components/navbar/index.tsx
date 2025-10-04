'use client'
import { useQuery } from 'convex/react';
import Link from 'next/link';
import { usePathname, useSearchParams, useRouter } from 'next/navigation';
import React from 'react';
import { api } from '../../../convex/_generated/api';
import { Id } from '../../../convex/_generated/dataModel';
import { CircleQuestionMark, Hash, LayoutTemplate, User } from 'lucide-react';
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { motion } from 'framer-motion';
import { Button } from '../ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { UseAuth } from '@/hooks/use-auth';

const Navbar = () => {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const {handleSignOut} = UseAuth()
  const projectId = params.get('project');
  const project = useQuery(
    api.projects.getProjects,
    projectId ? { projectId: projectId as Id<'projects'> } : 'skip'
  );

  const currentTab = pathname.includes('canvas')
    ? 'canvas'
    : pathname.includes('style-guide')
    ? 'style-guide'
    : '';

  const handleTabChange = (value: string) => {
    const query = projectId ? `?project=${projectId}` : '';
    if (value === 'canvas') {
      router.push(`/dashboard/canvas${query}`);
    }
    if (value === 'style-guide') {
      router.push(`/dashboard/style-guide${query}`);
    }
  };

  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 p-5 fixed top-0 right-0 left-0 z-50">
      <div className="flex items-center gap-3">
        <Link
          href={'/dashboard'}
          className="dark:border-white dark:border-2 rounded-full h-6 w-6 bg-black justify-center items-center flex"
        >
          <div className="rounded-full h-3 w-3 bg-white" />
        </Link>
        {(currentTab === 'canvas' || currentTab === 'style-guide') && (
          <span className="font-mono text-xs lg:inline-block hidden backdrop-blur-xl dark:bg-white/[0.18] saturate-150 px-4 py-2 rounded-full dark:text-primary/60 dark:border-white/20">
            Projects {/* | {project?.name} */}
          </span>
        )}
      </div>

      {/* Animated shadcn Tabs */}
      <div className="flex items-center justify-center">
        <Tabs value={currentTab} onValueChange={handleTabChange}>
          <TabsList className="relative flex rounded-full dark:bg-white/10  bg-gray-100 px-0 ">
            {['canvas', 'style-guide'].map((tab) => (
              <TabsTrigger
                key={tab}
                value={tab}
                className="relative  flex items-center gap-2 rounded-full px-4 py-4  text-sm transition-colors"
              >
                {tab === 'canvas' && <Hash className="h-4 w-4" />}
                {tab === 'style-guide' && <LayoutTemplate className="h-4 w-4" />}
                {tab === 'canvas' ? 'Canvas' : 'Style Guide'}
                {currentTab === tab && (
                  <motion.div
                    layoutId="active-pill"
                    className="absolute inset-0 rounded-full dark:hover:bg-white/10 bg-primary/20 dark:bg-white/20" 
                    transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                  />
                )}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {/* credits */}
      <div className='flex items-center justify-end gap-2'>
        <span className='font-mono text-xs'>credits </span>
        <Button 
         className='rounded-full p-5'
         variant={"secondary"}
        >
        <CircleQuestionMark className='size-5' />
        </Button>

        <Avatar className='size-10 '>
          <AvatarImage/>
          <AvatarFallback>
            <User className='size-4 ' />
          </AvatarFallback>
        </Avatar>

        <Button onClick={handleSignOut} className='font-mono text-xs bg-red-600' variant={'secondary'}>
          Logout
        </Button>
      </div>
    </div>
  );
};

export default Navbar;
