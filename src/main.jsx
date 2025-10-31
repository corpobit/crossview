import React from 'react'
import ReactDOM from 'react-dom/client'
import { AppProvider } from './presentation/providers/AppProvider.jsx'
import App from './presentation/App.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AppProvider>
      <App />
    </AppProvider>
  </React.StrictMode>,
)

