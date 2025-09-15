export interface FooterProps {
  email: string
  location?: string
  socials?: { name: string; href: string }[]
  navLeft?: { name: string; href: string }[]
  navRight?: { name: string; href: string }[]
  language?: string
  credits?: string
  legal?: { name: string; href: string }[]
  model?: React.ReactNode // custom 3D model
}