import { SidebarProvider } from '@/components/ui/sidebar'
import DashBoardSideBar from './components/DashBoardSideBar'

interface Props {
     children: React.ReactNode
}
const DashboardLayout = ({children}: Props) => {
  return (
   <SidebarProvider>
    <div className='flex min-h-screen w-full overflow-x-hidden' >
       <DashBoardSideBar/>

        <main className='px-10'>{children}</main>
    </div>

   </SidebarProvider>
  )
}

export default DashboardLayout