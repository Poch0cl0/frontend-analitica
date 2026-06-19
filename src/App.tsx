import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Login from './features/auth/Login'; 

function App() {
  return (
    // 1. El BrowserRouter provee el "contexto" de rutas que exige useNavigate()
    <BrowserRouter>
      <div className="App">
        <Routes>
          {/* 2. Definimos que en la ruta principal ("/") se muestre el Login */}
          <Route path="/" element={<Login />} />
          
          {/* Aquí podrás añadir más rutas en el futuro, por ejemplo:
          <Route path="/dashboard" element={<Dashboard />} /> 
          */}
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;