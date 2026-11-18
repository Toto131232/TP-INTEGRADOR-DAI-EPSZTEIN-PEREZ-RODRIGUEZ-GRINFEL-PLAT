import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getMe } from '../api/auth';
import { setAuthToken, setOnUnauthorized } from '../api/client';

const TOKEN_KEY = 'skmusic.token';

const AuthContext = createContext(null);

// Guarda la sesión (token JWT + usuario) y la restaura al abrir la app.
// status: 'loading' (restaurando) | 'guest' (sin sesión) | 'authenticated'
export function AuthProvider({ children }) {
  const [status, setStatus] = useState('loading');
  const [usuario, setUsuario] = useState(null);

  const signOut = useCallback(async () => {
    setAuthToken(null);
    setUsuario(null);
    setStatus('guest');
    try {
      await AsyncStorage.removeItem(TOKEN_KEY);
    } catch {
      // Si no se pudo borrar, igual la sesión en memoria ya está cerrada
    }
  }, []);

  const signIn = useCallback(async ({ token, usuario: u }) => {
    setAuthToken(token);
    setUsuario(u);
    setStatus('authenticated');
    try {
      await AsyncStorage.setItem(TOKEN_KEY, token);
    } catch {
      // Sin storage la sesión dura hasta cerrar la app
    }
  }, []);

  // Si el backend rechaza el token (vencido o usuario borrado) se vuelve al login
  useEffect(() => {
    setOnUnauthorized(signOut);
    return () => setOnUnauthorized(null);
  }, [signOut]);

  // Al abrir la app: si hay un token guardado, se valida con /auth/me
  useEffect(() => {
    let cancelado = false;
    (async () => {
      let token = null;
      try {
        token = await AsyncStorage.getItem(TOKEN_KEY);
      } catch {
        token = null;
      }
      if (!token) {
        if (!cancelado) setStatus('guest');
        return;
      }

      setAuthToken(token);
      try {
        const { usuario: u } = await getMe();
        if (cancelado) return;
        setUsuario(u);
        setStatus('authenticated');
      } catch (err) {
        if (cancelado) return;
        if (err.status === 401) {
          signOut();
        } else {
          // Backend caído: se mantiene la sesión y cada pantalla muestra su error
          setStatus('authenticated');
        }
      }
    })();
    return () => {
      cancelado = true;
    };
  }, [signOut]);

  const value = useMemo(
    () => ({ status, usuario, signIn, signOut }),
    [status, usuario, signIn, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth tiene que usarse dentro de <AuthProvider>');
  return ctx;
};
