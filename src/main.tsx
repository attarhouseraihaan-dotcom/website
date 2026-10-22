import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { AuthProvider } from './admin/AuthProvider'
import { BusinessProvider } from './lib/BusinessContext'
import { SEOProvider } from './lib/SEOContext'
import './styles.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <BusinessProvider><SEOProvider><AuthProvider><App /></AuthProvider></SEOProvider></BusinessProvider>
    </BrowserRouter>
  </React.StrictMode>,
)
