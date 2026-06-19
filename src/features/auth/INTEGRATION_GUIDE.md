# Componente Login - Guía de Integración

## 📁 Estructura Creada

```
src/features/auth/
├── Login.tsx          # Componente principal del Login
├── types.ts           # Tipos compartidos de TypeScript
└── index.ts           # Archivo de exportación
```

## 🚀 Cómo Integrar en tu Aplicación

### 1. **Configurar React Router** (en `main.tsx` o donde inicialices tu app)

```typescript
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Login } from './features/auth';
import Dashboard from './features/dashboard'; // Tu componente dashboard

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
```

### 2. **Proteger Rutas (Crear un PrivateRoute)**

Crea un archivo `src/components/PrivateRoute.tsx`:

```typescript
import { Navigate } from 'react-router-dom';

interface PrivateRouteProps {
  children: React.ReactNode;
}

export default function PrivateRoute({ children }: PrivateRouteProps) {
  const token = localStorage.getItem('access_token');
  
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
}
```

Luego úsalo en App:

```typescript
<Route 
  path="/dashboard" 
  element={
    <PrivateRoute>
      <Dashboard />
    </PrivateRoute>
  } 
/>
```

### 3. **Hook para Obtener el Rol del Usuario**

Crea `src/hooks/useAuth.ts`:

```typescript
import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

export function useAuth() {
  const navigate = useNavigate();
  const token = localStorage.getItem('access_token');
  const role = localStorage.getItem('user_role') as 'medico' | 'secretaria' | 'administrador' | null;

  const logout = useCallback(() => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user_role');
    navigate('/login');
  }, [navigate]);

  return {
    token,
    role,
    isAuthenticated: !!token,
    logout,
  };
}
```

## 🎨 Características Implementadas

✅ **Validación de Formularios**
- Email válido
- Contraseña requerida
- Mensajes de error claros

✅ **Estados Visuales**
- Spinner de carga
- Botón deshabilitado durante petición
- Errores con icono

✅ **Diseño Responsivo**
- Dos columnas en desktop
- Una columna en móviles
- Optimizado para tablet

✅ **Seguridad**
- TypeScript estricto
- Validación de email
- Token seguro en localStorage
- Interceptores de API configurados

✅ **Colores Personalizados**
- Principal: `#7C3F6B` (botones)
- Secundario: `#CE7E9D` (acentos)
- Error: `#BA1A1A`
- Éxito: `#16A34A`

## 🔄 Flujo de Autenticación

1. Usuario ingresa email, contraseña y selecciona rol
2. Se valida el formulario
3. Se envía POST a `/api/auth/login`
4. Si es exitoso:
   - Se guarda `access_token` en localStorage
   - Se guarda `user_role` en localStorage
   - Se redirecciona a `/dashboard`
5. Si hay error:
   - Se muestra mensaje de error amigable
   - El usuario puede intentar de nuevo

## 🖼️ Personalización Futura

### Agregar Imagen de Fondo

En `Login.tsx`, reemplaza el placeholder de imagen con:

```tsx
<div 
  className="absolute inset-0 bg-cover bg-center"
  style={{
    backgroundImage: 'url(/images/mother-healthcare.jpg)',
    backgroundSize: 'cover',
  }}
/>

{/* Overlay de desvanecimiento */}
<div className="absolute inset-0 bg-gradient-to-r from-black/20 to-transparent" />
```

## 📝 Variables de Entorno

Asegúrate de tener en tu `.env`:

```
VITE_API_URL=http://localhost:8000
```

El componente usa `import.meta.env.VITE_API_URL` para construir la URL base de la API.

## ✨ Mejoras Futuras Opcionales

- [ ] "Recordarme" checkbox
- [ ] "Olvidé mi contraseña" link
- [ ] OAuth/SSO integration
- [ ] 2FA (Two-Factor Authentication)
- [ ] Rate limiting en frontend
- [ ] Captcha para prevenir bots

## 🐛 Troubleshooting

**Error: "useNavigate is not defined"**
→ Asegúrate de que el componente está dentro de `<BrowserRouter>`

**Error: "API devuelve 400/401"**
→ Verifica que el endpoint `/api/auth/login` está correcto
→ Valida que el backend espera `{ email, password, role }`

**Token no se guarda**
→ Verifica que localStorage está disponible (no bloqueado)
→ Comprueba en DevTools → Application → Local Storage

---

**Creado con ❤️ para ObstetriCare**
