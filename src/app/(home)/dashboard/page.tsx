import { LayoutDashboard } from 'lucide-react'
import React from 'react'
import DashboardLayout from './DashboardLayout'
import AddProjectButton from './components/AddProjectButton'
import AddRepoButton from './components/AddRepoButton'
import { spawn } from 'child_process'
import Image from 'next/image'
import { IMAES } from '../../../../public/assets/images/images'

const Dashboard = () => {
  const playground: any[] = []

  return (
    <DashboardLayout>
      <section className="">
        <div className="container max-w-7xl px-4 md:px-8">
          <div className="flex flex-col items-center justify-center py-10 w-full">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
              <AddProjectButton />
              <AddRepoButton />
            </div>

            <div className='mt-10 md:mt-20 flex flex-col justify-center items-center w-full'>
              {
                playground && playground.length === 0 ? 
                (
                  <EmptyState/>
                ) : (
                  <span>play</span>
                )
              }
            </div>
          </div>
        </div>
      </section>
    </DashboardLayout>
  )
}

export default Dashboard


const EmptyState = () => (
    <div className="flex flex-col items-center justify-center py-16">
    <Image src={IMAES.Star} alt="No projects" className="w-56  h-56 mb-4" />
    <h2 style={{fontFamily: "poppins"}} className="text-xl md:text-4xl  font-bold ">No projects found</h2>
    <p className="text-gray-400 text-xs md:text-xl font-mono">Create a new project to get started!</p>
  </div>
)