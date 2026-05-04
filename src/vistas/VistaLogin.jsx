import React, { useState } from 'react';
import { auth } from '../firebase';
import { signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { Lock, Mail, AlertCircle } from 'lucide-react';

const VistaLogin = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  const manejarLogin = async (e) => {
    e.preventDefault();
    setError('');
    setCargando(true);

    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      console.error(err);
      setError('Credenciales incorrectas o usuario no encontrado.');
      setCargando(false);
    }
  };

  // --- NUEVO MOTOR DE GOOGLE ---
  const manejarLoginGoogle = async () => {
    setError('');
    setCargando(true);
    const provider = new GoogleAuthProvider();
    
    // Forzamos a que siempre pregunte qué cuenta usar (ideal para no marearnos)
    provider.setCustomParameters({
      prompt: 'select_account'
    });

    try {
      await signInWithPopup(auth, provider);
    } catch (err) {
      console.error(err);
      setError('Error al conectar con Google. Intentá de nuevo.');
      setCargando(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="w-20 h-20 bg-slate-900 rounded-2xl flex items-center justify-center text-orange-500 shadow-xl mx-auto mb-6 font-black italic text-4xl border-2 border-slate-700">
          K
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-slate-900 tracking-tight uppercase">
          Acceso Restringido
        </h2>
        <p className="mt-2 text-center text-sm text-slate-600 font-bold uppercase tracking-widest">
          ERP Táctico Colaborativo
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-2xl shadow-slate-200/50 sm:rounded-2xl sm:px-10 border border-slate-100">
          <form className="space-y-6" onSubmit={manejarLogin}>
            
            {/* Campo Correo */}
            <div>
              <label className="block text-xs font-black text-slate-700 uppercase tracking-widest mb-2">
                Correo Electrónico
              </label>
              <div className="relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type="email"
                  required
                  className="focus:ring-orange-500 focus:border-orange-500 block w-full pl-10 sm:text-sm border-slate-300 rounded-xl py-3 border bg-slate-50 font-medium"
                  placeholder="usuario@devesa.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            {/* Campo Contraseña */}
            <div>
              <label className="block text-xs font-black text-slate-700 uppercase tracking-widest mb-2">
                Contraseña
              </label>
              <div className="relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type="password"
                  required
                  className="focus:ring-orange-500 focus:border-orange-500 block w-full pl-10 sm:text-sm border-slate-300 rounded-xl py-3 border bg-slate-50 font-medium"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            {/* Mensaje de Error */}
            {error && (
              <div className="rounded-xl bg-red-50 p-4 flex items-start border border-red-100">
                <AlertCircle className="h-5 w-5 text-red-500 mr-2 flex-shrink-0 mt-0.5" />
                <p className="text-sm font-bold text-red-700">{error}</p>
              </div>
            )}

            {/* Botón de Ingreso */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={cargando}
                className={`w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-md text-sm font-black text-white uppercase tracking-widest transition-all ${cargando ? 'bg-slate-400 cursor-not-allowed' : 'bg-slate-900 hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-900 active:scale-95'}`}
              >
                {cargando ? 'Verificando...' : 'Ingresar al Sistema'}
              </button>
            </div>
          </form>

          {/* --- BOTÓN DE GOOGLE AGREGADO --- */}
          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-slate-500 font-bold uppercase tracking-widest text-[10px]">
                  O ingresá con
                </span>
              </div>
            </div>

            <div className="mt-6">
              <button
                onClick={manejarLoginGoogle}
                disabled={cargando}
                type="button"
                className={`w-full flex justify-center items-center py-3 px-4 border-2 border-slate-200 rounded-xl shadow-sm text-sm font-black text-slate-700 bg-white hover:bg-slate-50 uppercase tracking-widest transition-all ${cargando ? 'opacity-50 cursor-not-allowed' : 'active:scale-95'}`}
              >
                {/* Ícono oficial de Google en formato SVG para que quede impecable */}
                <svg className="h-5 w-5 mr-3" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                  <path d="M1 1h22v22H1z" fill="none" />
                </svg>
                Continuar con Google
              </button>
            </div>
          </div>
          {/* -------------------------------------- */}
        </div>
      </div>
    </div>
  );
};

export default VistaLogin;
