import './globals.css'

export const metadata = {
  title: 'LixSketch',
  description: 'Open-source alternative to app.eraser.io - Sketch canvas + Docs editor',
  icons: {
    icon: '/Images/logo.png',
  },
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="dark">
      <head>
        <link href="https://unpkg.com/boxicons@2.1.4/css/boxicons.min.css" rel="stylesheet" />
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.11.1/styles/github-dark-dimmed.min.css" />
      </head>
      <body>{children}</body>
    </html>
  )
}
