// =============================================================================
// APPLICATION ENTRY POINT
// =============================================================================
// This is where our React application starts. It:
// 1. Imports React and ReactDOM
// 2. Imports our main App component
// 3. Mounts the app to the DOM (the HTML element with id="root")
//
// StrictMode is a development tool that:
// - Highlights potential problems (like unsafe lifecycle methods)
// - Double-renders components to detect side effects
// - Only runs in development, has no impact in production
// =============================================================================

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import './index.css';

// Find the root element in our HTML (see index.html)
const rootElement = document.getElementById('root');

// Create a React root and render our app
createRoot(rootElement).render(
  <StrictMode>
    {/* BrowserRouter enables client-side routing */}
    {/* It uses the HTML5 History API to keep UI in sync with URL */}
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>
);
