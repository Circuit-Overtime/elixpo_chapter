import { useTRPC } from '@/trpc/client'
import { useSuspenseQuery } from '@tanstack/react-query'
import React from 'react'
import MessageCard from './messageCard'
import MessageForm from './messageForm'

interface Props {
     projectId: string
}
const MesssageContainer = (props: Props) => {
  const trpc = useTRPC()
  const {data: message} = useSuspenseQuery(trpc.messages.getMany.queryOptions({
     projectId:props.projectId
  }))
  return (
    
    <div className='flex flex-col flex-1 min-h-0'>  
       <div className='flex-1 min-h-0 overflow-y-auto'>
          <div className='pt-2 pr-1'>
             {
                message.map((msg) => (
                    <MessageCard 
                     key={msg.id}
                     content={msg.content}
                     createdAt={msg.createdAt}
                     fragment={msg.fragment}
                     isActiveFragment={false}
                     onFragmentClick={() => {}}
                     role={msg.role}
                     type={msg.type}

                    />
                ))
             }
          </div>
       </div>
       <div className='relative p-3 pt-1'>
        <MessageForm projectId={props.projectId} />
       </div>
    </div>
  )
}

export default MesssageContainer 