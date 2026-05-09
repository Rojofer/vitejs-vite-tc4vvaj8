import React, { useState } from 'react';
import { Activity, Mail, X, CheckCircle, Clock } from 'lucide-react';
import { motion } from 'framer-motion';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase'; // Importamos tu base de datos

const VistaNotificaciones = ({ 
  currentUser, 
  insumos, 
  reclamos, 
  notiTabActiva, 
  setNotiTabActiva, 
  formatearFecha, 
  setActiveInsumo, 
  rechazarAlertaPlanta, 
  aprobarAlertaPlanta, 
  marcarAlertaComoVista,
  marcarMensajeComoLeido,
}) => {
  const [filtroNoti, setFiltroNoti] = useState("");
  const isOwner = currentUser.rol === 'owner';
  
  const misDifusiones = reclamos.filter(r => r.insumoId === "BROADCAST" && (r.destinatarioId === "todos" || r.destinatarioId?.includes(String(currentUser.id))) && r.mensaje.toLowerCase().includes(filtroNoti.toLowerCase())).sort((a,b) => (b.fecha?.seconds||0) - (a.fecha?.seconds||0));
  const pendientesAutorizacion = insumos.filter(i => i.alertaPendiente);
  const misRespuestas = insumos.filter(i => (i.alertaAprobada || i.alertaRechazadaMotivo) && i.alertaSolicitante === currentUser.nombre);

  return (
    <div className="p-4 md:p-6 h-full w-full flex flex-col relative"> 
      
      {/* SELECTOR DE PESTAÑAS */}
      <div className="flex gap-8 border-b border-slate-200 mb-6">
        <button onClick={() => setNotiTabActiva("avisos")} className={`pb-4 text-xs font-black uppercase tracking-widest transition-all relative ${notiTabActiva === 'avisos' ? 'text-orange-500' : 'text-slate-400 hover:text-slate-600'}`}>
          Notificaciones Generales
          {notiTabActiva === 'avisos' && <motion.div layoutId="tabNoti" className="absolute bottom-0 left-0 right-0 h-1 bg-orange-500 rounded-t-full" />}
        </button>
        
        {currentUser.rol !== 'produccion' && (
          <button onClick={() => setNotiTabActiva("autorizaciones")} className={`pb-4 text-xs font-black uppercase tracking-widest transition-all relative flex items-center gap-2 ${notiTabActiva === 'autorizaciones' ? 'text-purple-600' : 'text-slate-400 hover:text-slate-600'}`}>
            Gestión de Alertas
            {(isOwner ? pendientesAutorizacion.length > 0 : misRespuestas.length > 0) && (
              <span className="bg-red-500 text-white text-[11px] px-2 py-0.5 rounded-full font-black animate-bounce shadow-sm">
                {isOwner ? pendientesAutorizacion.length : misRespuestas.length}
              </span>
            )}
            {notiTabActiva === 'autorizaciones' && <motion.div layoutId="tabNoti" className="absolute bottom-0 left-0 right-0 h-1 bg-purple-600 rounded-t-full" />}
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
        {notiTabActiva === 'avisos' ? (
          <div className="space-y-4">
            {misDifusiones.length === 0 ? (
              <div className="text-center py-20 text-slate-300 font-black uppercase tracking-widest">Sin avisos nuevos</div>
            ) : (
              misDifusiones.map(noti => (
                <div key={noti.id} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col gap-2 hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">{noti.fecha?.seconds ? new Date(noti.fecha.seconds * 1000).toLocaleString() : 'Recién'}</span>
                    {!(noti.leidoPor || []).includes(currentUser.nombre) && (
                      <div className="flex items-center gap-3">
                        <span className="bg-orange-500 text-white text-[8px] font-black px-2 py-0.5 rounded-full uppercase animate-pulse">Nuevo</span>
                        <button 
                          onClick={() => marcarMensajeComoLeido(noti.id)} 
                          className="text-[10px] font-black uppercase text-sky-500 hover:text-sky-700 bg-sky-50 px-3 py-1.5 rounded-xl border border-sky-100 transition-all active:scale-95"
                        >
                          ✔ Marcar como leído
                        </button>
                      </div>
                    )}
                  </div>
                  <h3 className="text-sm font-black text-slate-800 uppercase leading-tight">{noti.mensaje}</h3>
                  <p className="text-xs text-slate-500 leading-relaxed mt-2">{noti.cuerpoOriginal}</p>
                </div>
              ))
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {isOwner ? (
              pendientesAutorizacion.length === 0 ? (
                <div className="text-center py-20 text-slate-300 font-black uppercase tracking-widest italic">No hay solicitudes pendientes</div>
              ) : (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest w-32">Fecha</th>
                        <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Cód / Insumo (Clic para ver)</th>
                        <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Operario</th>
                        <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Gestión</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {pendientesAutorizacion.map(ins => (
                        <tr key={ins.id} onClick={() => setActiveInsumo(ins)} className="hover:bg-slate-50 transition-colors cursor-pointer group">
                          <td className="p-4 text-[10px] font-bold text-slate-500">
                            {ins.alertaSolicitadaHora ? formatearFecha(ins.alertaSolicitadaHora) : 'Reciente'}
                          </td>
                          <td className="p-4">
                            <div className="flex flex-col">
                              <span className="text-[10px] font-mono text-slate-400 group-hover:text-purple-500 transition-colors">CÓD: {ins.codigo}</span>
                              <span className="text-xs font-black text-slate-800 uppercase">{ins.nombre}</span>
                            </div>
                          </td>
                          <td className="p-4 text-[10px] font-black text-purple-600 uppercase">{ins.alertaSolicitante}</td>
                          <td className="p-4 text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="flex gap-2 items-center justify-end">
                              <input id={`motivo-${ins.id}`} type="text" placeholder="Motivo de rechazo..." className="w-80 bg-white border border-slate-200 rounded-md text-[10px] font-bold text-slate-600 px-3 py-2 uppercase outline-none focus:border-red-400 shadow-sm" />
                              <button onClick={() => { const m = document.getElementById(`motivo-${ins.id}`).value; if(!m) return alert("Debe escribir el motivo."); rechazarAlertaPlanta(ins, m); }} className="px-4 py-2 bg-white text-slate-500 border border-slate-200 rounded-md text-[10px] font-black uppercase hover:text-red-500 hover:border-red-200 transition-colors shadow-sm shrink-0">Rechazar</button>
                              <button onClick={() => aprobarAlertaPlanta(ins)} className="px-4 py-2 bg-purple-600 text-white rounded-md text-[10px] font-black uppercase hover:bg-purple-700 shadow-sm transition-colors shrink-0">Aprobar</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            ) : (
                <div className="space-y-6">
                  {insumos.filter(i => i.alertaPendiente && i.alertaSolicitante === currentUser.nombre).length > 0 && (
                    <div>
                      <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-3 flex items-center gap-2"><Activity size={14}/> Tus solicitudes en revisión</h4>
                      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                        <table className="w-full text-left border-collapse">
                          <tbody className="divide-y divide-slate-100">
                            {insumos.filter(i => i.alertaPendiente && i.alertaSolicitante === currentUser.nombre).map(ins => (
                              <tr key={ins.id} onClick={() => setActiveInsumo(ins)} className="bg-amber-50/30 hover:bg-amber-50/80 transition-colors cursor-pointer group">
                                <td className="p-4 text-[10px] font-bold text-slate-500 w-32">{ins.alertaSolicitadaHora ? formatearFecha(ins.alertaSolicitadaHora) : 'Reciente'}</td>
                                <td className="p-4">
                                  <div className="flex flex-col">
                                    <span className="text-[10px] font-mono text-slate-400 group-hover:text-amber-600 transition-colors">CÓD: {ins.codigo}</span>
                                    <span className="text-xs font-black text-slate-800 uppercase">{ins.nombre}</span>
                                  </div>
                                </td>
                                <td className="p-4 text-right">
                                  <span className="text-[10px] font-black bg-white text-amber-600 px-3 py-1.5 rounded-lg border border-amber-200 shadow-sm inline-flex items-center gap-1.5">
                                    <Clock size={12}/> Esperando OK
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  <div>
                    <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-3 flex items-center gap-2"><Mail size={14}/> Respuestas de Gerencia</h4>
                    {misRespuestas.length === 0 ? (
                      <div className="text-center py-10 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-slate-400 font-black uppercase tracking-widest italic text-[10px]">No tenés respuestas recientes</div>
                    ) : (
                      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                        <table className="w-full text-left border-collapse">
                          <tbody className="divide-y divide-slate-100">
                            {misRespuestas.map(ins => (
                              <tr key={ins.id} onClick={() => setActiveInsumo(ins)} className={`transition-colors cursor-pointer group ${ins.alertaRechazadaMotivo ? 'bg-red-50/20 hover:bg-red-50/60' : 'bg-emerald-50/20 hover:bg-emerald-50/60'}`}>
                                <td className="p-4 text-[10px] font-bold text-slate-500 w-32">{ins.alertaAprobadaHora ? formatearFecha(ins.alertaAprobadaHora) : 'Reciente'}</td>
                                <td className="p-4">
                                  <div className="flex items-center gap-3">
                                    {ins.alertaRechazadaMotivo ? <X size={18} className="text-red-500"/> : <CheckCircle size={18} className="text-emerald-500"/>}
                                    <div className="flex flex-col">
                                      <span className={`text-[10px] font-mono text-slate-400 transition-colors ${ins.alertaRechazadaMotivo ? 'group-hover:text-red-500' : 'group-hover:text-emerald-600'}`}>CÓD: {ins.codigo}</span>
                                      <span className="text-xs font-black text-slate-800 uppercase">{ins.nombre}</span>
                                      {ins.alertaRechazadaMotivo && (
                                        <span className="text-[10px] font-bold text-red-600 mt-1">💬 Motivo: {ins.alertaRechazadaMotivo}</span>
                                      )}
                                    </div>
                                  </div>
                                </td>
                                
                              <td className="p-4 text-right" onClick={(e) => e.stopPropagation()}>
                                <button 
                                  onClick={async () => {
                                    if (ins.alertaRechazadaMotivo) {
                                      try { await updateDoc(doc(db, "insumos", ins.id), { alertaRechazadaMotivo: null, alertaVistaPorOperario: true }); } catch (e) { console.error(e); }
                                    } else {
                                      marcarAlertaComoVista(ins);
                                    }
                                    setActiveInsumo(ins); 
                                  }} 
                                  className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase shadow-md transition-all active:scale-95 inline-flex items-center gap-2 ${ins.alertaRechazadaMotivo ? 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50' : 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-emerald-500/30'}`}
                                >
                                  {ins.alertaRechazadaMotivo ? 'Cerrar y Ver Insumo' : <><Activity size={14}/> Ver y Enviar Alerta</>}
                                </button>
                              </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
  );
};

export default VistaNotificaciones;
