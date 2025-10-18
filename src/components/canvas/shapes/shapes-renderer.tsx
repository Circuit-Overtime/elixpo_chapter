import { Shape } from '@/redux/slices/shapes';
import React from 'react'
import { Arrow } from "./arrow";
import { Rectangle } from './rectangle';
import { Elipse } from './elipse';
import { Line } from './line';
import { Text } from './text';
import { Stroke } from './stroke';
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
        case 'ellipse':
         return <Elipse shape={shape} />
        case 'line':
          return <Line shape={shape} />
        case 'text':
          return <Text shape={shape} />
        case "freedraw":
           return <Stroke shape={shape} />
    }
}

export default ShapesRenderer