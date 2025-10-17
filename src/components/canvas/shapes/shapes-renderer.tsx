import { Shape } from '@/redux/slices/shapes';
import React from 'react'
import { Arrow } from "./arrow";
import { Rectangle } from './rectangle';
interface Props {
     shape: Shape;
     toggleInspiraton?: () => void;
     toggleChat?: (generateUIId: string) => void;
     generateWorkFlow?: (generateUIId:string) => void;
     exportDesign?: (generateUIId: string, element: HTMLElement | null) => void

}
const ShapesRenderer = ({
   shape
}:Props) => {
    switch(shape.type) {
        case 'arrow':
          return <Arrow shape={shape} />
        case 'rect':
          return <Rectangle shape={shape} />
    }
}

export default ShapesRenderer