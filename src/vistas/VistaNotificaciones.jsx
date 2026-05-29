import React, { useState, useMemo } from 'react';
import { Bell, CheckCircle, Clock, Megaphone, Send, X, Search, FileText, Trash2 } from 'lucide-react';
import { doc, updateDoc, collection, addDoc, serverTimestamp, arrayUnion, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { motion, AnimatePresence } from 'framer-motion';

const VistaNotificaciones = ({
  currentUser,
  reclamos,
  formatearFecha,
  contactos = [],
  setToastMsg,
  setDialogoConfirmacion // <-- NUEVO: Recibimos el control del modal corporativo
}) => {
  // Estados para el megáfono y UI
  const [modoRedaccion, setModoRedaccion] = useState(false);
  const [avisoTitulo, setAvisoTitulo] = useState("");
  const [avisoCuerpo, setAvisoCuerpo] = useState("");
  const [avisoDestinatario, setAvisoDestinatario] = useState("TODOS");
  const [enviando, setEnviando] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [tabActiva, setTabActiva] = useState(currentUser.rol === 'owner' ? 'tickets' : 'avisos');

  const equipo = contactos.filter(c => c.tipo === 'equipo');

  // Filtro Inteligente: Separa operarios de gerencia y aplica el buscador
  const notificacionesFiltradas = useMemo(() => {
    let lista = reclamos;

    if (currentUser.rol === 'owner') {
       if (tabActiva === 'tickets') {
           // Pestaña Tickets: Solo reclamos de planta abiertos (excluye broadcasts)
           lista = lista.filter(r => r.insumoId !== "BROADCAST" && r.estado === 'ABIERTO');
       } else {
           // Pestaña Avisos: Historial completo de comunicados de gerencia
           lista = lista.filter(r => r.insumoId === "BROADCAST");
       }
    } else {
       // Si es OPERARIO: Bloqueo estricto. Solo ven BROADCASTS (Avisos) dirigidos a ellos o a la planta. Cero tickets.
       lista = lista.filter(r => {
           if (r.insumoId !== "BROADCAST") return false;
           const esParaTodos = r.destinatarioId === 'TODOS';
           const esParaOperario = Array.isArray(r.destinatarioId) ? r.destinatarioId.includes(String(currentUser.id)) : false;
           return esParaTodos || esParaOperario;
       });
    }

    // Motor de búsqueda
    if (busqueda.trim()) {
       const lowerBusqueda = busqueda.toLowerCase();
       lista = lista.filter(r =>
          (r.mensaje || "").toLowerCase().includes(lowerBusqueda) ||
          (r.cuerpoOriginal || "").toLowerCase().includes(lowerBusqueda) ||
          (r.operario || "").toLowerCase().includes(lowerBusqueda)
       );
    }

    // Ordenar de más reciente a más antiguo
    return lista.sort((a, b) => {
        const timeA = a.fecha?.seconds || 0;
        const timeB = b.fecha?.seconds || 0;
        return timeB - timeA;
    });
  }, [reclamos, currentUser, tabActiva, busqueda]);

  // Marcar como leído protegido contra bloqueos de base de datos
  const marcarComoLeido = async (noti) => {
    if (!noti.leidoPor?.includes(currentUser.nombre)) {
      try {
        await updateDoc(doc(db, "reclamos", noti.id), {
          leidoPor: arrayUnion(currentUser.nombre)
        });
      } catch (error) {
        console.error("Error marcando como leido", error);
        if (setToastMsg) setToastMsg("⚠️ Firebase bloqueó la acción: Ajustar permisos (Rules) a true.");
      }
    }
  };

  // NUEVO: Función de Borrado Físico usando el Modal SaaS
  const eliminarNotificacion = (id, e) => {
    e.stopPropagation(); // Evita que el clic marque como leída la notificación
    
    setDialogoConfirmacion({
      titulo: "Eliminar Registro",
      mensaje: "¿Estás seguro de ELIMINAR FÍSICAMENTE este registro de la base de datos? Esta acción es irreversible y desaparecerá de la bandeja de toda la planta.",
      textoConfirmar: "Sí, Eliminar Físicamente",
      colorBoton: "bg-red-600 hover:bg-red-700",
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, "reclamos", id));
          if (setToastMsg) setToastMsg("🗑️ Registro eliminado de raíz exitosamente.");
        } catch (error) {
          console.error("Error al eliminar", error);
          if (setToastMsg) setToastMsg("⚠️ Ocurrió un error al intentar eliminar el registro.");
        }
      }
    });
  };

  const enviarAviso = async () => {
    if (!avisoTitulo.trim() || !avisoCuerpo.trim()) {
      if(setToastMsg) setToastMsg("⚠️ Completá título y mensaje.");
      return;
    }
    
    setEnviando(true);
    try {
      const destinatariosIds = avisoDestinatario === 'TODOS' ? 'TODOS' : [avisoDestinatario];

      const nuevoAviso = {
        insumoId: "BROADCAST",
        fecha: serverTimestamp(),
        operario: currentUser.nombre, 
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
    <div className="p-4 md:p-6 h-full w-full relative flex justify-center">
      <div className="w-full max-w-full">
        
        {/* CABECERA: PESTAÑAS (SOLO OWNER), BUSCADOR Y BOTÓN EMITIR */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 border-b border-slate-200 pb-2">
          
          <div className="flex gap-6 w-full md:w-auto">
            {currentUser.rol === 'owner' ? (
              <>
                <button 
                  onClick={() => setTabActiva('tickets')} 
                  className={`pb-3 font-black text-xs uppercase tracking-widest transition-all border-b-2 -mb-[2px] ${tabActiva === 'tickets' ? 'border-sky-500 text-sky-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                >
                  Tickets en Curso
                </button>
                <button 
                  onClick={() => setTabActiva('avisos')} 
                  className={`pb-3 font-black text-xs uppercase tracking-widest transition-all border-b-2 -mb-[2px] ${tabActiva === 'avisos' ? 'border-yellow-500 text-yellow-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                >
                  Historial Avisos
                </button>
              </>
            ) : (
              <span className="pb-3 font-black text-xs uppercase tracking-widest transition-all border-b-2 -mb-[2px] border-yellow-500 text-yellow-600">
                Bandeja de Avisos
              </span>
            )}
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto mb-2 sm:mb-0">
            <div className="relative flex-1 min-w-[250px] md:w-80">
              <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text" 
                placeholder="Buscar asuntos o palabras..." 
                value={busqueda} 
                onChange={e => setBusqueda(e.target.value)} 
                className="w-full pl-12 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-sky-500 transition-all shadow-sm" 
              />
            </div>

            {currentUser.rol === 'owner' && !modoRedaccion && tabActiva === 'avisos' && (
              <button 
                onClick={() => setModoRedaccion(true)}
                className="bg-yellow-500 hover:bg-yellow-600 text-slate-900 px-5 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 shadow-sm transition-all whitespace-nowrap"
              >
                <Megaphone size={14} /> Emitir Aviso
              </button>
            )}
          </div>
        </div>

        {/* FORMULARIO DE REDACCIÓN (OWNER) */}
        <AnimatePresence>
          {modoRedaccion && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="bg-white rounded-2xl shadow-sm border border-yellow-400 overflow-hidden mb-6">
              <div className="bg-yellow-50 px-6 py-4 border-b border-yellow-100 flex justify-between items-center">
                <h2 className="text-sm font-bold text-yellow-800 flex items-center gap-2 uppercase tracking-widest">
                  <Megaphone size={16} /> Redactar Nuevo Aviso
                </h2>
                <button onClick={() => setModoRedaccion(false)} className="text-yellow-600 hover:text-yellow-800">
                  <X size={20} />
                </button>
              </div>
              <div className="p-6 flex flex-col gap-4">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Título del Aviso</label>
                    <input 
                      type="text" 
                      value={avisoTitulo}
                      onChange={(e) => setAvisoTitulo(e.target.value)}
                      placeholder="Ej: ALERTA DE STOCK, REUNIÓN GENERAL..."
                      className="w-full border border-slate-200 rounded-xl p-3 text-sm font-bold text-slate-800 focus:outline-none focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400 uppercase shadow-sm"
                    />
                  </div>
                  <div className="md:w-1/3">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Destinatarios</label>
                    <select 
                      value={avisoDestinatario}
                      onChange={(e) => setAvisoDestinatario(e.target.value)}
                      className="w-full border border-slate-200 rounded-xl p-3 text-sm font-bold text-slate-700 bg-slate-50 focus:outline-none focus:border-yellow-400 shadow-sm"
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
                    className="w-full border border-slate-200 rounded-xl p-4 text-sm text-slate-700 h-28 resize-none focus:outline-none focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400 shadow-sm"
                  />
                </div>

                <div className="flex justify-end pt-2">
                  <button 
                    onClick={enviarAviso}
                    disabled={enviando}
                    className="bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 shadow-sm transition-all"
                  >
                    <Send size={14} /> {enviando ? 'Emitiendo...' : 'Disparar Aviso'}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* BANDEJA FULL WIDTH */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden w-full">
          {notificacionesFiltradas.length > 0 ? (
            <div className="divide-y divide-slate-100">
              {notificacionesFiltradas.map((noti) => {
                const estaLeido = (noti.leidoPor || []).includes(currentUser.nombre);
                const esTicket = noti.insumoId !== "BROADCAST";
                
                return (
                  <div 
                    key={noti.id} 
                    onClick={() => marcarComoLeido(noti)}
                    className={`p-5 md:p-6 flex gap-4 transition-colors cursor-pointer hover:bg-slate-50 ${estaLeido ? 'opacity-60 bg-white' : esTicket ? 'bg-sky-50/30' : 'bg-yellow-50/30'}`}
                  >
                    <div className="mt-1.5 shrink-0">
                      {estaLeido ? (
                        <CheckCircle size={20} className="text-slate-300" />
                      ) : (
                        <span className="flex h-3 w-3 mt-1 relative">
                          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${esTicket ? 'bg-sky-400' : 'bg-yellow-400'}`}></span>
                          <span className={`relative inline-flex rounded-full h-3 w-3 ${esTicket ? 'bg-sky-500' : 'bg-yellow-500'}`}></span>
                        </span>
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-1 gap-2">
                        <h3 className={`text-sm pr-4 flex items-center gap-2 ${estaLeido ? 'font-medium text-slate-600' : 'font-black text-slate-800'}`}>
                          {esTicket && <FileText size={14} className="text-sky-500 shrink-0"/>}
                          {noti.mensaje}
                        </h3>
                        <span className="text-[10px] font-bold text-slate-400 whitespace-nowrap flex items-center gap-1 shrink-0">
                          <Clock size={10} /> {formatearFecha(noti.fecha)}
                        </span>
                      </div>
                      
                      {noti.cuerpoOriginal && (
                        <p className="text-xs text-slate-500 mt-2 leading-relaxed whitespace-pre-wrap max-w-5xl">
                          {noti.cuerpoOriginal}
                        </p>
                      )}
                      
                      <div className="flex flex-wrap items-center justify-between mt-4 gap-2">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                          Emitido por: <span className="text-slate-600">{noti.operario}</span>
                        </p>
                        
                        {/* CONTROLES EXCLUSIVOS OWNER: LECTURAS Y BORRADO */}
                        {currentUser.rol === 'owner' && (
                          <div className="flex items-center gap-3">
                            {noti.leidoPor?.length > 0 && (
                              <p className="text-[9px] font-bold text-emerald-600 uppercase tracking-widest bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-100">
                                Visto por: {noti.leidoPor.join(', ')}
                              </p>
                            )}
                            
                            {/* LA PAPELERA AHORA SOLO APARECE SI ES UN AVISO DE GERENCIA, NUNCA EN UN TICKET */}
                            {!esTicket && (
                              <button 
                                onClick={(e) => eliminarNotificacion(noti.id, e)}
                                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all border border-transparent hover:border-red-100"
                                title="Eliminar Aviso de la base de datos"
                              >
                                <Trash2 size={16} />
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-24 text-center flex flex-col items-center justify-center">
              <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-5 border border-slate-100">
                {busqueda ? <Search size={28} className="text-slate-300" /> : <Bell size={28} className="text-slate-300" />}
              </div>
              <h3 className="text-lg font-black text-slate-700 mb-1">{busqueda ? 'Sin resultados' : 'Bandeja al día'}</h3>
              <p className="text-sm text-slate-400 font-bold">{busqueda ? 'No se encontraron registros con esa palabra.' : 'No tenés notificaciones ni tickets pendientes.'}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VistaNotificaciones;
