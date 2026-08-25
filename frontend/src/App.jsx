import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import Analytics from './components/Analytics';

function App() {
  const [token, setToken] = useState(null);

  return (
    <>
      <div className="bg-orbs">
        <div className="orb orb-1"></div>
        <div className="orb orb-2"></div>
        <div className="orb orb-3"></div>
      </div>
      <BrowserRouter>
        <Routes>
          <Route 
            path="/login" 
            element={!token ? <Login setAuth={setToken} /> : <Navigate to="/dashboard" replace />} 
          />
          <Route 
            path="/dashboard" 
            element={token ? <Dashboard token={token} setAuth={setToken} /> : <Navigate to="/login" replace />} 
          />
          <Route 
            path="/analytics" 
            element={token ? <Analytics token={token} setAuth={setToken} /> : <Navigate to="/login" replace />} 
          />
          <Route 
            path="/" 
            element={<Navigate to={token ? "/dashboard" : "/login"} replace />} 
          />
        </Routes>
      </BrowserRouter>
    </>
  );
}

export default App;
