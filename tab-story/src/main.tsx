import React from 'react'
import ReactDOM from 'react-dom/client'
import { SidePanel } from './sidepanel/SidePanel'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <SidePanel isOpen={false} onClose={() => {}} />
  </React.StrictMode>
)
