import React from 'react';
import { AlertCircle, Calendar } from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase'; 

const VistaArchivados = ({ insumos, currentUser, setToastMsg, setDialogoConfirmacion }) => {
  // Filtramos y ordenamos para que el último archivado aparezca primero
  const archivados = insumos.filter(i => i.discontinuado === true).sort((a, b) => {
    const fA = a.fechaArchivado?.seconds || 0;
    const fB = b.fechaArchivado?.seconds || 0;
    return fB - fA; 
  });

  const restaurar = (id, nombre) => {
    // Usamos el nuevo modal SaaS en lugar del navegador
    setDialogoConfirmacion({
      titulo: "Restaurar Insumo",
      mensaje: `¿Seguro que querés restaurar "${nombre}" al tablero principal?`,
      textoConfirmar: "Restaurar",
      colorBoton: "bg-emerald-500 hover:bg-emerald-600",
      onConfirm: async () => {
        try {
          await updateDoc(doc(db, "insumos", id), { 
            discontinuado: false,
            fechaArchivado: null 
          });
          if(setToastMsg) setToastMsg(`✅ ${nombre} rescatado del sótano.`);
        } catch (error) {
          console.error("Error al restaurar:", error);
        }
      }
    });
  };

  const formatFecha = (fechaObj) => {
    if (!fechaObj) return "Fecha desconocida";
    try {
      const f = fechaObj.seconds ? new Date(fechaObj.seconds * 1000) : new Date(fechaObj);
      const dia = String(f.getDate()).padStart(2, '0');
      const mes = String(f.getMonth() + 1).padStart(2, '0');
      const anio = String(f.getFullYear()).slice(-2);
      return `${dia}/${mes}/${anio}`;
    } catch(e) { return "-"; }
  };

  if (currentUser?.rol !== 'owner') {
     return <div className="p-10 text-center font-bold text-slate-400 mt-20">No tenés credenciales para acceder al archivo histórico.</div>;
  }

  return (
    <div className="p-8 h-full flex flex-col bg-[#F8FAFC]">
      <div className="mb-6 flex justify-end items-center">
        <div className="bg-purple-50 text-purple-600 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-purple-100 flex items-center gap-2 shadow-sm">
          <span className="w-2 h-2 rounded-full bg-purple-500"></span>
          {archivados.length} Registros Ocultos
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 w-full overflow-y-auto max-h-[calc(100vh-180px)] scrollbar-thin">
        {archivados.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 py-20">
            <AlertCircle size={40} className="mb-3 opacity-20" />
            <p className="text-[10px] font-black uppercase tracking-widest">El sótano está limpio y vacío</p>
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Código</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Material</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest"><div className="flex items-center gap-1.5"><Calendar size={12}/> Fecha de Archivo</div></th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {archivados.map(i => (
                <tr key={i.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-6 py-4 text-xs font-bold text-slate-600 w-32">{i.codigo}</td>
                  <td className="px-6 py-4 text-xs font-bold text-slate-800">{i.nombre}</td>
                  <td className="px-6 py-4 text-[11px] font-semibold text-slate-500 w-48">{formatFecha(i.fechaArchivado)}</td>
                  <td className="px-6 py-4 text-center w-40">
                    <button 
                      onClick={() => restaurar(i.id, i.nombre)}
                      className="px-4 py-2 bg-white border border-slate-200 text-slate-600 hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-200 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all shadow-sm group-hover:shadow-md"
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
