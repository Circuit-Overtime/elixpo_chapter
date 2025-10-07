import React from 'react'
import Layout from './dashboard-layout'
import { ProfileQuery, ProjectQuery } from '@/convex/query.config'
import ProjectProvider from '@/components/projects/list/project-provider'
import ProjectList from '@/components/projects/list/project-list'
type Props = {
     params: Promise<{
         session: string
     }>
}
const Page = async ({params}: Props) => {
  const {profile,projects} = await ProjectQuery()
  return (
    <Layout>
    <ProjectProvider initialProject={projects}>
      <div className='container py-5  mx-auto'>
        <ProjectList/>
      </div>
    </ProjectProvider>
    </Layout>
  )
}

export default Page