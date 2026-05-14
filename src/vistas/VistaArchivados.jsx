import React from 'react';
import { ArchiveRestore, AlertCircle } from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase'; 

const VistaArchivados = ({ insumos, currentUser, setToastMsg }) => {
  // Filtramos la base de datos para mostrar SOLO los que están discontinuados
  const archivados = insumos.filter(i => i.discontinuado === true);

  const restaurar = async (id, nombre) => {
    if (!window.confirm(`¿Seguro que querés restaurar ${nombre} al tablero principal?`)) return;
    try {
      await updateDoc(doc(db, "insumos", id), { discontinuado: false });
      if(setToastMsg) setToastMsg(`✅ ${nombre} rescatado del sótano.`);
    } catch (error) {
      console.error("Error al restaurar:", error);
    }
  };

  // Escudo de seguridad: Si no es Owner, lo bloqueamos.
  if (currentUser?.rol !== 'owner') {
     return <div className="p-10 text-center font-bold text-slate-400 mt-20">No tenés credenciales para acceder al archivo histórico.</div>;
  }

  return (
    <div className="p-8 h-full flex flex-col bg-[#F8FAFC]">
      <div className="mb-6 flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-3">
            <ArchiveRestore className="text-purple-500" size={28} /> SÓTANO DE INSUMOS
          </h1>
          <p className="text-sm font-medium text-slate-500 mt-1">Materiales ocultados del tablero principal (Solo lectura y restauración).</p>
        </div>
        <div className="bg-purple-50 text-purple-600 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest border border-purple-100">
          {archivados.length} Registros Ocultos
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex-1">
        {archivados.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 py-20">
            <AlertCircle size={40} className="mb-3 opacity-20" />
            <p className="text-sm font-bold uppercase tracking-widest">El sótano está limpio y vacío</p>
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Código</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Material</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest text-center">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {archivados.map(i => (
                <tr key={i.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 text-sm font-mono text-slate-400 w-32">{i.codigo}</td>
                  <td className="px-6 py-4 text-sm font-bold text-slate-700">{i.nombre}</td>
                  <td className="px-6 py-4 text-center w-40">
                    <button 
                      onClick={() => restaurar(i.id, i.nombre)}
                      className="px-4 py-2 bg-emerald-50 text-emerald-600 hover:bg-emerald-500 hover:text-white rounded-lg text-[10px] font-black uppercase tracking-widest transition-all shadow-sm"
                    >
                      Restaurar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default VistaArchivados;
