import React, { useState } from 'react';
import { X, Star, Copy, Send, Package, FileText, History, BarChart2, MessageSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const formatoNum = (num) => Number(num).toLocaleString('es-AR');

const PanelDetalle = ({
  activeInsumo,
  setActiveInsumo,
  currentUser,
  config,
  toggleFavorito,
  formatearFecha,
  reclamosActivos,
  abrirRedactorReclamo,
  obtenerColorOwner,
  guardarNotaInterna,
  setDialogoConfirmacion,  // <--- NUEVO
  cerrarReclamoManual      // <--- NUEVO
}) => {
  const [copiado, setCopiado] = useState(false);
  const [tabActiva, setTabActiva] = useState('datos');

  if (!activeInsumo) return null;

  const handleCopy = (texto) => {
    navigator.clipboard.writeText(texto);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  const isOwner = currentUser?.rol === 'owner';
  const uUrgencia = config?.umbralUrgencia || 15;
  const enRiesgo = activeInsumo.supervivencia <= uUrgencia;
  const consumoMensual = Number(activeInsumo.consumo || activeInsumo.consumoPromedio || 0);
  const consumoDiario = consumoMensual > 0 ? Math.round(consumoMensual / 26) : 0;

  const solpedsOrdenadas = [...(activeInsumo.detalleSolpeds || [])].sort((a, b) => {
    const fA = a.fecha?.seconds ? a.fecha.seconds * 1000 : new Date(a.fecha).getTime();
    const fB = b.fecha?.seconds ? b.fecha.seconds * 1000 : new Date(b.fecha).getTime();
    if (isNaN(fA)) return 1; if (isNaN(fB)) return -1;
    return fA - fB;
  });

  const ocsOrdenadas = [...(activeInsumo.detalleOCs || [])].sort((a, b) => {
    const fA = a.fecha?.seconds ? a.fecha.seconds * 1000 : new Date(a.fecha).getTime();
    const fB = b.fecha?.seconds ? b.fecha.seconds * 1000 : new Date(b.fecha).getTime();
    if (isNaN(fA)) return 1; if (isNaN(fB)) return -1;
    return fA - fB;
  });

  return (
    <>
      {/* Fondo borroso */}
      <motion.div 
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} 
        onClick={() => setActiveInsumo(null)} 
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[70]" 
      />

      {/* PANEL EXTENDIDO Y COMPACTO (max-w-3xl) */}
      <motion.div 
        initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="fixed right-0 top-0 h-full w-full max-w-3xl bg-slate-50 z-[80] shadow-2xl flex flex-col outline-none"
      >
        {/* CABECERA DE ALTA DENSIDAD */}
        <div className="pt-5 px-6 border-b border-slate-200 shrink-0 bg-white z-10">
          <div className="flex justify-between items-start mb-3">
            
            {/* Izquierda: Título e Info */}
            <div className="flex-1 min-w-0 pr-4">
              <div className="flex items-center gap-2 mb-1.5">
                <button onClick={() => setActiveInsumo(null)} className="p-1 -ml-1 text-slate-400 hover:text-slate-800 rounded transition-colors">
                  <X size={18} />
                </button>
                <h2 className="text-lg font-black text-slate-800 leading-none truncate">
                  {activeInsumo.nombre}
                </h2>
              </div>
              
              <div className="flex items-center gap-3 ml-7">
                <div className="flex items-center gap-1.5 cursor-pointer group" onClick={() => handleCopy(activeInsumo.codigo)}>
                  <span className="text-[11px] font-bold tabular-nums text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 group-hover:border-slate-300 transition-colors">
                    {activeInsumo.codigo}
                  </span>
                  {copiado ? <span className="text-[9px] text-emerald-600 font-bold">Copiado</span> : <Copy size={12} className="text-slate-400 group-hover:text-slate-600" />}
                </div>

                {isOwner && activeInsumo.owner && (
                  <div className={`flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest border ${obtenerColorOwner(activeInsumo.owner).bg} ${obtenerColorOwner(activeInsumo.owner).text} ${obtenerColorOwner(activeInsumo.owner).border}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${obtenerColorOwner(activeInsumo.owner).dot}`} />
                    {activeInsumo.owner}
                  </div>
                )}
              </div>
            </div>

            {/* Derecha: Acciones Compactas */}
            <div className="flex items-center gap-3 shrink-0 mt-0.5">
              <button onClick={() => toggleFavorito(activeInsumo)} className="text-slate-300 hover:scale-110 transition-transform">
                <Star size={20} className={activeInsumo.favorito ? "text-yellow-400" : ""} fill={activeInsumo.favorito ? "currentColor" : "none"} />
              </button>
              <button 
                onClick={() => abrirRedactorReclamo(activeInsumo)} 
                className="flex items-center gap-1.5 px-3 py-1.5 text-white rounded-lg transition-all shadow-sm active:scale-95 font-black text-[10px] uppercase tracking-widest bg-orange-500 hover:bg-orange-600"
              >
                <Send size={12} /> Reclamar
              </button>
            </div>
          </div>

          {/* PESTAÑAS (Integradas al borde) */}
          <div className="flex gap-6 ml-7">
            <button 
              onClick={() => setTabActiva('datos')} 
              className={`pb-2 text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 transition-all border-b-2 ${tabActiva === 'datos' ? 'border-orange-500 text-slate-800' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
            >
              <BarChart2 size={12} /> Suministros
            </button>
            <button 
              onClick={() => setTabActiva('historial')} 
              className={`pb-2 text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 transition-all border-b-2 ${tabActiva === 'historial' ? 'border-orange-500 text-slate-800' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
            >
              <History size={12} /> Historial 
              <span className={`px-1 py-0.5 rounded text-[8px] leading-none ${reclamosActivos.length > 0 ? 'bg-orange-100 text-orange-600' : 'bg-slate-100 text-slate-400'}`}>
                {reclamosActivos.length}
              </span>
            </button>
          </div>
        </div>

        {/* CUERPO DEL PANEL (Sin Footer) */}
        <div className="flex-1 overflow-y-auto p-5">
          <AnimatePresence mode="wait">
            
            {/* VISTA 1: DATOS Y TABLAS COMPACTAS */}
            {tabActiva === 'datos' && (
              <motion.div key="datos" initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} className="space-y-4">
                
                {/* 1 SOLA FILA DE KPIs COMPACTOS */}
                <div className="flex items-stretch bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden divide-x divide-slate-100">
                  <div className={`flex-1 p-3 flex flex-col items-center justify-center ${enRiesgo ? 'bg-red-50' : ''}`}>
                    <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Cobertura</span>
                    <div className="flex items-baseline gap-0.5 mt-0.5">
                      <span className={`text-xl font-black tabular-nums leading-none ${enRiesgo ? 'text-red-600' : 'text-slate-800'}`}>
                        {activeInsumo.supervivencia >= 999 ? '∞' : Math.round(activeInsumo.supervivencia)}
                      </span>
                      <span className={`text-[9px] font-bold ${enRiesgo ? 'text-red-400' : 'text-slate-400'}`}>días</span>
                    </div>
                  </div>
                  <div className="flex-1 p-3 flex flex-col items-center justify-center">
                    <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Stock Actual</span>
                    <span className="text-lg font-black tabular-nums text-slate-800 mt-0.5 leading-none">{formatoNum(activeInsumo.stock)}</span>
                  </div>
                  <div className="flex-1 p-3 flex flex-col items-center justify-center bg-slate-50/50">
                    <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Consumo Mes</span>
                    <span className="text-sm font-black tabular-nums text-slate-600 mt-1 leading-none">{formatoNum(consumoMensual)}</span>
                  </div>
                  <div className="flex-1 p-3 flex flex-col items-center justify-center bg-slate-50/50">
                    <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Diario (Lab)</span>
                    <span className="text-sm font-black tabular-nums text-slate-600 mt-1 leading-none">{formatoNum(consumoDiario)}</span>
                  </div>
                </div>
                
                {/* NOTAS INTERNAS */}
                <div className="bg-amber-50/50 border border-amber-100 rounded-xl p-3 shadow-sm mt-4 mb-4">
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-[9px] font-black text-amber-600 uppercase tracking-widest flex items-center gap-1.5">
                      <MessageSquare size={12}/> Notas Internas
                    </label>
                  </div>
                  <textarea
                    defaultValue={activeInsumo.notasInternas || ''}
                    onBlur={(e) => {
                      if (e.target.value !== activeInsumo.notasInternas) {
                        guardarNotaInterna(activeInsumo.id, e.target.value);
                      }
                    }}
                    placeholder="Anotaciones cualitativas (ej. Proveedor con demoras...)"
                    className="w-full bg-white border border-amber-200 text-slate-700 text-xs font-medium rounded-lg px-3 py-2 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition-all resize-none min-h-[60px] placeholder:text-slate-300"
                  />
                </div>

                {/* TABLAS 50/50 ALTA DENSIDAD */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
                  
                  {/* S/P */}
                  <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="bg-slate-50 px-3 py-2 border-b border-slate-200 flex justify-between items-center">
                      <h4 className="text-[9px] font-black text-slate-700 uppercase tracking-widest flex items-center gap-1.5"><FileText size={12} className="text-violet-500" /> S/P En Curso</h4>
                    </div>
                    {solpedsOrdenadas.length > 0 ? (
                      <table className="w-full text-left border-collapse">
                        <thead className="bg-white border-b border-slate-100">
                          <tr>
                            <th className="px-3 py-1.5 text-[8px] font-bold text-slate-400 uppercase tracking-widest">Nº S/P</th>
                            <th className="px-3 py-1.5 text-[8px] font-bold text-slate-400 uppercase tracking-widest text-center">Cant.</th>
                            <th className="px-3 py-1.5 text-[8px] font-bold text-slate-400 uppercase tracking-widest text-right">Liberación</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {solpedsOrdenadas.map((sp, idx) => (
                            <tr key={idx} className="hover:bg-slate-50 transition-colors">
                              <td className="px-3 py-2 text-[10px] tabular-nums font-bold text-slate-700">{sp.numero}</td>
                              <td className="px-3 py-2 text-[11px] tabular-nums font-black text-violet-600 text-center">{formatoNum(sp.cantidad)}</td>
                              <td className="px-3 py-2 text-[9px] tabular-nums font-medium text-slate-500 text-right">{formatearFecha(sp.fecha).split(' ')[0]}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <div className="p-3 text-center text-[10px] text-slate-400 font-medium italic">Sin solicitudes activas.</div>
                    )}
                  </div>

                  {/* O/C */}
                  <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="bg-slate-50 px-3 py-2 border-b border-slate-200 flex justify-between items-center">
                      <h4 className="text-[9px] font-black text-slate-700 uppercase tracking-widest flex items-center gap-1.5"><Package size={12} className="text-sky-500" /> Órdenes de Compra</h4>
                    </div>
                    {ocsOrdenadas.length > 0 ? (
                      <table className="w-full text-left border-collapse">
                        <thead className="bg-white border-b border-slate-100">
                          <tr>
                            <th className="px-2 py-1.5 text-[8px] font-bold text-slate-400 uppercase tracking-widest">Nº OC</th>
                            <th className="px-2 py-1.5 text-[8px] font-bold text-slate-400 uppercase tracking-widest text-center">Status</th>
                            <th className="px-2 py-1.5 text-[8px] font-bold text-slate-400 uppercase tracking-widest text-center">Cant.</th>
                            <th className="px-2 py-1.5 text-[8px] font-bold text-slate-400 uppercase tracking-widest text-right">Entrega</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {ocsOrdenadas.map((oc, idx) => {
                            const f = oc.fecha?.seconds ? new Date(oc.fecha.seconds * 1000) : new Date(oc.fecha);
                            const hoyCheck = new Date(); hoyCheck.setHours(0,0,0,0);
                            const isDemorada = f < hoyCheck;
                            
                            const statusStr = (oc.status || oc.estado || "").toLowerCase();
                            let statusTag = <span className="text-[8px] font-black text-slate-400 uppercase">S/E</span>;
                            if (statusStr.includes("docum") || statusStr.includes("enviad") || statusStr.includes("aprob")) {
                              statusTag = <span className="text-[8px] font-black text-emerald-600 uppercase">APROBADO</span>;
                            } else if (statusStr.includes("proces") || statusStr.includes("autorizaci") || statusStr.includes("pendient")) {
                              statusTag = <span className="text-[8px] font-black text-amber-500 uppercase">PENDIENTE</span>;
                            }

                            return (
                              <tr key={idx} className={`transition-colors ${isDemorada ? 'bg-red-50/60 hover:bg-red-50' : 'hover:bg-slate-50'}`}>
                                <td className="px-2 py-2 text-[10px] tabular-nums font-bold text-slate-700">{oc.numero}</td>
                                <td className="px-2 py-2 text-center">{statusTag}</td>
                                <td className={`px-2 py-2 text-[11px] tabular-nums font-black text-center ${isDemorada ? 'text-red-600' : 'text-slate-800'}`}>{formatoNum(oc.cantidad)}</td>
                                <td className={`px-2 py-2 text-[9px] tabular-nums font-bold text-right ${isDemorada ? 'text-red-500' : 'text-slate-500'}`}>
                                  {formatearFecha(f).split(' ')[0]}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    ) : (
                      <div className="p-3 text-center text-[10px] text-slate-400 font-medium italic">Sin OCs pendientes.</div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {tabActiva === 'historial' && (
              <motion.div key="historial" initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }}>
                {(() => {
                  // Ordenamos de más nuevo a más viejo y cortamos en 5
                  const ultimosReclamos = [...reclamosActivos].sort((a, b) => {
                    const fA = a.fecha?.seconds ? a.fecha.seconds * 1000 : new Date(a.fecha).getTime();
                    const fB = b.fecha?.seconds ? b.fecha.seconds * 1000 : new Date(b.fecha).getTime();
                    return fB - fA; 
                  }).slice(0, 5);
                  
                  const ocultos = reclamosActivos.length - 5;

                  return reclamosActivos.length > 0 ? (
                    <div className="space-y-2">
                      {ultimosReclamos.map((r, idx) => (
                        <div key={idx} className={`p-3 rounded-lg border transition-all bg-white ${r.estado === 'CERRADO' ? 'border-slate-200 opacity-60' : 'border-orange-200 shadow-sm'}`}>
                          <div className="flex justify-between items-center mb-1.5">
                            <span className={`text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded ${r.estado === 'CERRADO' ? 'bg-slate-100 text-slate-500' : 'bg-orange-100 text-orange-600'}`}>
                              {r.estado}
                            </span>
                            <span className="text-[9px] tabular-nums font-bold text-slate-400">{formatearFecha(r.fecha)}</span>
                          </div>
                          <p className="text-[11px] font-bold text-slate-700 leading-tight mb-1">{r.mensaje}</p>
                          <p className="text-[10px] text-slate-500 leading-relaxed italic border-l-2 border-slate-100 pl-2">{r.cuerpoOriginal}</p>
                                         
                        </div>
                      ))}
                      
                      {ocultos > 0 && (
                        <div className="text-center pt-3 pb-1">
                          <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 bg-slate-100 px-3 py-1.5 rounded-md border border-slate-200 shadow-inner">
                            + {ocultos} registros antiguos en auditoría
                          </span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="py-10 text-center border border-dashed border-slate-200 rounded-xl bg-white">
                      <History size={20} className="mx-auto text-slate-300 mb-2" />
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Sin registro de auditoría</p>
                    </div>
                  );
                })()}
              </motion.div>
            )}
            
          </AnimatePresence>
        </div>
      </motion.div>
    </>
  );
};

export default PanelDetalle;
