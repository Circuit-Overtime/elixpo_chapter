import React from 'react'
import Layout from './dashboard-layout'
type Props = {
     params: Promise<{
         session: string
     }>
}
const Page = async ({params}: Props) => {
  return (
    <Layout>
    <></>
    </Layout>
  )
}

export default Page