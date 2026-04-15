import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

document.title = __PAGE_TITLE__

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App
      readmeContent={__README_CONTENT__}
      pageTitle={__PAGE_TITLE__}
      repoFullName={__REPO_FULL_NAME__}
    />
  </StrictMode>,
)
