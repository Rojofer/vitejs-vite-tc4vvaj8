import React from 'react';
import { Bell, CheckCircle, Clock } from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';

const VistaNotificaciones = ({
  currentUser,
  reclamos,
  formatearFecha
}) => {
  
  // Filtramos SOLO los comunicados generales (BROADCAST) donde el usuario esté copiado
  const misNotificaciones = reclamos.filter(r => 
    r.insumoId === "BROADCAST" && 
    r.destinatarioId?.includes(String(currentUser.id))
  );

  const marcarComoLeido = async (noti) => {
    if (!noti.leidoPor?.includes(currentUser.nombre)) {
      try {
        const nuevosLeidos = [...(noti.leidoPor || []), currentUser.nombre];
        await updateDoc(doc(db, "reclamos", noti.id), {
          leidoPor: nuevosLeidos
        });
      } catch (error) {
        console.error("Error marcando como leido", error);
      }
    }
  };

  return (
    <div className="p-4 md:p-6 h-full max-w-4xl mx-auto">
      
      {/* CABECERA */}
      <div className="flex items-center gap-4 mb-8">
        <div className="w-12 h-12 bg-slate-800 rounded-2xl flex items-center justify-center shadow-lg shrink-0">
          <Bell size={24} className="text-yellow-400" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-slate-800 tracking-tight">Notificaciones</h1>
          <p className="text-xs font-medium text-slate-400 mt-1">Bandeja de entrada general</p>
        </div>
      </div>

      {/* BANDEJA MINIMALISTA */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {misNotificaciones.length > 0 ? (
          <div className="divide-y divide-slate-100">
            {misNotificaciones.map((noti) => {
              const estaLeido = (noti.leidoPor || []).includes(currentUser.nombre);
              
              return (
                <div 
                  key={noti.id} 
                  onClick={() => marcarComoLeido(noti)}
                  className={`p-5 flex gap-4 transition-colors cursor-pointer hover:bg-slate-50 ${estaLeido ? 'opacity-60' : 'bg-yellow-50/30'}`}
                >
                  <div className="mt-1 shrink-0">
                    {estaLeido ? (
                      <CheckCircle size={20} className="text-slate-300" />
                    ) : (
                      <span className="flex h-3 w-3 mt-1.5 relative">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-yellow-500"></span>
                      </span>
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-1 gap-2">
                      <h3 className={`text-sm pr-4 ${estaLeido ? 'font-medium text-slate-600' : 'font-black text-slate-800'}`}>
                        {noti.mensaje}
                      </h3>
                      <span className="text-[10px] font-bold text-slate-400 whitespace-nowrap flex items-center gap-1 shrink-0">
                        <Clock size={10} /> {formatearFecha(noti.fecha)}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                      {noti.cuerpoOriginal}
                    </p>
                    <p className="text-[9px] font-black text-slate-400 mt-3 uppercase tracking-widest">
                      Enviado por: <span className="text-slate-500">{noti.operario}</span>
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-20 text-center flex flex-col items-center justify-center">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
              <Bell size={24} className="text-slate-300" />
            </div>
            <h3 className="text-lg font-bold text-slate-700 mb-1">Bandeja vacía</h3>
            <p className="text-sm text-slate-400 font-medium">No tenés notificaciones pendientes.</p>
          </div>
        )}
      </div>
      
    </div>
  );
};

export default VistaNotificaciones;
