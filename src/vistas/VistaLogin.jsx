import React, { useState } from 'react';
import { auth } from '../firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
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
      setError('Credenciales incorrectas o usuario no registrado.');
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
        </div>
      </div>
    </div>
  );
};

export default VistaLogin;
