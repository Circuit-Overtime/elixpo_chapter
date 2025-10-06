import React from 'react'
import Layout from './dashboard-layout'
import { ProfileQuery, ProjectQuery } from '@/convex/query.config'
type Props = {
     params: Promise<{
         session: string
     }>
}
const Page = async ({params}: Props) => {
  const {profile,projects} = await ProjectQuery()
  return (
    <Layout>
  <>  </>
    </Layout>
  )
}

export default Page