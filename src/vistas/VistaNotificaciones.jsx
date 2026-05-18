import React, { useState } from 'react';
import { Bell, CheckCircle, Clock, Megaphone, Send, X } from 'lucide-react';
import { doc, updateDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

const VistaNotificaciones = ({
  currentUser,
  reclamos,
  formatearFecha,
  contactos = [],
  setToastMsg
}) => {
  // Estados para el megáfono del Owner
  const [modoRedaccion, setModoRedaccion] = useState(false);
  const [avisoTitulo, setAvisoTitulo] = useState("");
  const [avisoCuerpo, setAvisoCuerpo] = useState("");
  const [avisoDestinatario, setAvisoDestinatario] = useState("TODOS");
  const [enviando, setEnviando] = useState(false);

  const equipo = contactos.filter(c => c.tipo === 'equipo');

  // Filtramos los BROADCAST. El Owner ve todos, el operario solo los suyos.
  const misNotificaciones = reclamos.filter(r => 
    r.insumoId === "BROADCAST" && 
    (currentUser.rol === 'owner' || r.destinatarioId?.includes(String(currentUser.id)))
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

  const enviarAviso = async () => {
    if (!avisoTitulo.trim() || !avisoCuerpo.trim()) {
      if(setToastMsg) setToastMsg("⚠️ Completá título y mensaje.");
      return;
    }
    
    setEnviando(true);
    try {
      let destinatariosIds = [];
      if (avisoDestinatario === 'TODOS') {
        destinatariosIds = equipo.map(c => c.id);
      } else {
        destinatariosIds = [avisoDestinatario];
      }

      const nuevoAviso = {
        insumoId: "BROADCAST",
        fecha: serverTimestamp(),
        operario: currentUser.nombre, // Quien lo envía (El Owner)
        estado: "CERRADO", 
        tipo: "AVISO GERENCIA",
        mensaje: avisoTitulo,
        cuerpoOriginal: avisoCuerpo,
        destinatarioId: destinatariosIds,
        leidoPor: []
      };

      await addDoc(collection(db, "reclamos"), nuevoAviso);

      setModoRedaccion(false);
      setAvisoTitulo("");
      setAvisoCuerpo("");
      setAvisoDestinatario('TODOS');
      if(setToastMsg) setToastMsg("✅ Aviso emitido a la planta.");
    } catch (error) {
      console.error("Error al enviar aviso:", error);
      if(setToastMsg) setToastMsg("⚠️ Error al emitir el aviso.");
    }
    setEnviando(false);
  };

  return (
    // Quitamos el max-w-4xl para que ocupe el ancho sin margen excesivo
    <div className="p-4 md:p-6 h-full w-full mx-auto">
      
      {/* BOTÓN MEGÁFONO SÓLO PARA OWNER (CABECERA) */}
      <div className="flex justify-end mb-6 min-h-[40px]">
        {currentUser.rol === 'owner' && !modoRedaccion && (
          <button 
            onClick={() => setModoRedaccion(true)}
            className="bg-yellow-500 hover:bg-yellow-600 text-slate-900 px-4 py-2 rounded-lg font-bold text-xs uppercase tracking-widest flex items-center gap-2 shadow-sm transition-all"
          >
            <Megaphone size={16} /> Emitir Aviso
          </button>
        )}
      </div>

      {/* FORMULARIO DE REDACCIÓN (OWNER) */}
      {modoRedaccion && (
        <div className="bg-white rounded-2xl shadow-sm border border-yellow-400 overflow-hidden mb-6">
          <div className="bg-yellow-50 px-6 py-4 border-b border-yellow-100 flex justify-between items-center">
            <h2 className="text-sm font-bold text-yellow-800 flex items-center gap-2 uppercase tracking-widest">
              <Megaphone size={16} /> Redactar Nuevo Aviso
            </h2>
            <button onClick={() => setModoRedaccion(false)} className="text-yellow-600 hover:text-yellow-800">
              <X size={20} />
            </button>
          </div>
          <div className="p-6 flex flex-col gap-4">
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Título del Aviso</label>
                <input 
                  type="text" 
                  value={avisoTitulo}
                  onChange={(e) => setAvisoTitulo(e.target.value)}
                  placeholder="Ej: ALERTA DE STOCK, REUNIÓN GENERAL..."
                  className="w-full border border-slate-200 rounded-lg p-2.5 text-sm font-bold text-slate-800 focus:outline-none focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400 uppercase"
                />
              </div>
              <div className="w-1/3">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Destinatarios</label>
                <select 
                  value={avisoDestinatario}
                  onChange={(e) => setAvisoDestinatario(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg p-2.5 text-sm font-bold text-slate-700 bg-slate-50 focus:outline-none focus:border-yellow-400"
                >
                  <option value="TODOS">🚨 TODA LA PLANTA</option>
                  {equipo.map(c => (
                    <option key={c.id} value={c.id}>👤 {c.label || c.email}</option>
                  ))}
                </select>
              </div>
            </div>
            
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Cuerpo del Mensaje</label>
              <textarea 
                value={avisoCuerpo}
                onChange={(e) => setAvisoCuerpo(e.target.value)}
                placeholder="Escribí las instrucciones o novedades para el equipo..."
                className="w-full border border-slate-200 rounded-lg p-3 text-sm text-slate-700 h-24 resize-none focus:outline-none focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400"
              />
            </div>

            <div className="flex justify-end pt-2">
              <button 
                onClick={enviarAviso}
                disabled={enviando}
                className="bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white px-6 py-2.5 rounded-lg font-bold text-xs uppercase tracking-widest flex items-center gap-2 shadow-sm transition-all"
              >
                <Send size={14} /> {enviando ? 'Emitiendo...' : 'Disparar Aviso'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BANDEJA MINIMALISTA Y MÁS ANCHA */}
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
                    <div className="flex items-center justify-between mt-3">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                        Emitido por: <span className="text-slate-500">{noti.operario}</span>
                      </p>
                      {currentUser.rol === 'owner' && noti.leidoPor?.length > 0 && (
                        <p className="text-[9px] font-bold text-emerald-500 uppercase tracking-widest bg-emerald-50 px-2 py-1 rounded">
                          Leído por: {noti.leidoPor.join(', ')}
                        </p>
                      )}
                    </div>
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
