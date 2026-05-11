import React, { useState } from 'react';
import { X, Star, Copy, Send, ChevronRight, Package, FileText, History, BarChart2 } from 'lucide-react';
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
  obtenerColorOwner
}) => {
  const [copiado, setCopiado] = useState(false);
  const [tabActiva, setTabActiva] = useState('datos'); // 'datos' o 'historial'

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

  return (
    <>
      <motion.div 
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} 
        onClick={() => setActiveInsumo(null)} 
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[70]" 
      />

      <motion.div 
        initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="fixed right-0 top-0 h-full w-full max-w-3xl bg-white z-[80] shadow-2xl flex flex-col"
      >
        {/* CABECERA */}
        <div className="pt-6 px-6 md:pt-8 md:px-8 border-b border-slate-100 shrink-0 bg-white z-10">
          <div className="flex justify-between items-start mb-4">
            <button onClick={() => setActiveInsumo(null)} className="p-2 -ml-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-all">
              <X size={20} />
            </button>
            <button onClick={() => toggleFavorito(activeInsumo)} className="p-2 text-slate-300 hover:scale-110 transition-all">
              <Star size={24} className={activeInsumo.favorito ? "text-yellow-400" : "text-slate-200"} fill={activeInsumo.favorito ? "currentColor" : "none"} />
            </button>
          </div>

          <h2 className="text-2xl font-bold text-slate-800 leading-tight mb-3">
            {activeInsumo.nombre}
          </h2>
          
          <div className="flex flex-wrap items-center gap-3 mb-6">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium tabular-nums text-slate-500 bg-slate-50 px-2 py-1 rounded-md border border-slate-100 shadow-sm">
                {activeInsumo.codigo}
              </span>
              <button onClick={() => handleCopy(activeInsumo.codigo)} className="text-slate-300 hover:text-slate-500">
                <Copy size={14} />
              </button>
              {copiado && <span className="text-[10px] text-emerald-500 font-bold animate-pulse">Copiado</span>}
            </div>

            {isOwner && activeInsumo.owner && (
              <div className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-widest border shadow-sm ${obtenerColorOwner(activeInsumo.owner).bg} ${obtenerColorOwner(activeInsumo.owner).text} ${obtenerColorOwner(activeInsumo.owner).border}`}>
                <span className={`w-2 h-2 rounded-full ${obtenerColorOwner(activeInsumo.owner).dot}`} />
                {activeInsumo.owner}
              </div>
            )}
          </div>

          {/* PESTAÑAS DE NAVEGACIÓN */}
          <div className="flex gap-6 border-b border-slate-100">
            <button 
              onClick={() => setTabActiva('datos')} 
              className={`pb-3 text-xs font-black uppercase tracking-widest flex items-center gap-2 transition-all border-b-2 ${tabActiva === 'datos' ? 'border-orange-500 text-slate-800' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
            >
              <BarChart2 size={14} /> Suministros
            </button>
            <button 
              onClick={() => setTabActiva('historial')} 
              className={`pb-3 text-xs font-black uppercase tracking-widest flex items-center gap-2 transition-all border-b-2 ${tabActiva === 'historial' ? 'border-orange-500 text-slate-800' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
            >
              <History size={14} /> Historial 
              <span className={`px-1.5 py-0.5 rounded-full text-[9px] ${reclamosActivos.length > 0 ? 'bg-orange-100 text-orange-600' : 'bg-slate-100 text-slate-400'}`}>
                {reclamosActivos.length}
              </span>
            </button>
          </div>
        </div>

        {/* CUERPO DEL PANEL */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 bg-slate-50/30">
          <AnimatePresence mode="wait">
            
            {/* VISTA 1: DATOS Y TABLAS */}
            {tabActiva === 'datos' && (
              <motion.div key="datos" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
                
                {/* MÉTRICAS COMPACTAS */}
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className={`p-4 rounded-xl border transition-all shadow-sm ${enRiesgo ? 'bg-red-50 border-red-200' : 'bg-white border-slate-200'}`}>
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Cobertura</p>
                      <div className="flex items-baseline gap-1">
                        <p className={`text-2xl font-black tabular-nums ${enRiesgo ? 'text-red-600' : 'text-slate-800'}`}>
                          {activeInsumo.supervivencia >= 999 ? '∞' : Math.round(activeInsumo.supervivencia)}
                        </p>
                        <span className={`text-xs font-bold ${enRiesgo ? 'text-red-400' : 'text-slate-400'}`}>días</span>
                      </div>
                    </div>
                    
                    <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm">
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Stock Actual</p>
                      <p className="text-2xl font-black text-slate-800 tabular-nums">
                        {formatoNum(activeInsumo.stock)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between px-4 py-2.5 bg-white rounded-lg border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Consumo Promedio:</span>
                      <span className="text-xs font-black tabular-nums text-slate-700">{formatoNum(consumoMensual)}<span className="text-[9px] font-medium text-slate-400 ml-0.5">/mes</span></span>
                    </div>
                    <div className="flex items-center gap-2 border-l border-slate-100 pl-3">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Diario (Lab):</span>
                      <span className="text-xs font-black tabular-nums text-slate-700">{formatoNum(consumoDiario)}</span>
                    </div>
                  </div>
                </div>

                {/* TABLAS */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
                  
                  <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="bg-slate-50 px-3 py-2.5 border-b border-slate-100 flex justify-between items-center">
                      <h4 className="text-[9px] font-black text-slate-600 uppercase tracking-widest flex items-center gap-1.5"><FileText size={12} className="text-violet-500" /> S/P En Curso</h4>
                    </div>
                    {solpedsOrdenadas.length > 0 ? (
                      <table className="w-full text-left border-collapse">
                        <thead className="bg-white border-b border-slate-50">
                          <tr>
                            <th className="px-3 py-2 text-[8px] font-bold text-slate-400 uppercase tracking-widest">Nº S/P</th>
                            <th className="px-3 py-2 text-[8px] font-bold text-slate-400 uppercase tracking-widest text-center">Cant.</th>
                            <th className="px-3 py-2 text-[8px] font-bold text-slate-400 uppercase tracking-widest text-right">Liberación</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {solpedsOrdenadas.map((sp, idx) => (
                            <tr key={idx} className="hover:bg-slate-50 transition-colors">
                              <td className="px-3 py-2 text-[11px] tabular-nums font-bold text-slate-700">{sp.numero}</td>
                              <td className="px-3 py-2 text-[11px] tabular-nums font-black text-violet-600 text-center">{formatoNum(sp.cantidad)}</td>
                              <td className="px-3 py-2 text-[10px] tabular-nums font-medium text-slate-500 text-right">{formatearFecha(sp.fecha).split(' ')[0]}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <div className="p-4 text-center text-[10px] text-slate-400 font-medium italic">Sin solicitudes activas.</div>
                    )}
                  </div>

                  <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="bg-slate-50 px-3 py-2.5 border-b border-slate-100 flex justify-between items-center">
                      <h4 className="text-[9px] font-black text-slate-600 uppercase tracking-widest flex items-center gap-1.5"><Package size={12} className="text-sky-500" /> Órdenes de Compra</h4>
                    </div>
                    {activeInsumo.detalleOCs && activeInsumo.detalleOCs.length > 0 ? (
                      <table className="w-full text-left border-collapse">
                        <thead className="bg-white border-b border-slate-50">
                          <tr>
                            <th className="px-2 py-2 text-[8px] font-bold text-slate-400 uppercase tracking-widest">Nº OC</th>
                            <th className="px-2 py-2 text-[8px] font-bold text-slate-400 uppercase tracking-widest text-center">Status</th>
                            <th className="px-2 py-2 text-[8px] font-bold text-slate-400 uppercase tracking-widest text-center">Cant.</th>
                            <th className="px-2 py-2 text-[8px] font-bold text-slate-400 uppercase tracking-widest text-right">Entrega</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {activeInsumo.detalleOCs.map((oc, idx) => {
                            const f = oc.fecha?.seconds ? new Date(oc.fecha.seconds * 1000) : new Date(oc.fecha);
                            const hoyCheck = new Date(); hoyCheck.setHours(0,0,0,0);
                            const isDemorada = f < hoyCheck;
                            
                            const statusStr = (oc.status || oc.estado || "").toLowerCase();
                            let statusTag = <span className="bg-slate-100 text-slate-500 border-slate-200 border px-1.5 py-0.5 rounded text-[7px] font-black uppercase">S/E</span>;
                            
                            if (statusStr.includes("docum") || statusStr.includes("enviad") || statusStr.includes("aprob")) {
                              statusTag = <span className="bg-emerald-50 text-emerald-600 border-emerald-200 border px-1.5 py-0.5 rounded text-[7px] font-black uppercase">APROBADO</span>;
                            } else if (statusStr.includes("proces") || statusStr.includes("autorizaci") || statusStr.includes("pendient")) {
                              statusTag = <span className="bg-amber-50 text-amber-600 border-amber-200 border px-1.5 py-0.5 rounded text-[7px] font-black uppercase">PENDIENTE</span>;
                            }

                            return (
                              <tr key={idx} className={`transition-colors ${isDemorada ? 'bg-red-50/50 hover:bg-red-50' : 'hover:bg-slate-50'}`}>
                                <td className="px-2 py-2 text-[11px] tabular-nums font-bold text-slate-700">{oc.numero}</td>
                                <td className="px-2 py-2 text-center">{statusTag}</td>
                                <td className={`px-2 py-2 text-[11px] tabular-nums font-black text-center ${isDemorada ? 'text-red-600' : 'text-slate-800'}`}>{formatoNum(oc.cantidad)}</td>
                                <td className={`px-2 py-2 text-[10px] tabular-nums font-bold text-right ${isDemorada ? 'text-red-500' : 'text-slate-500'}`}>
                                  {formatearFecha(f).split(' ')[0]}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    ) : (
                      <div className="p-4 text-center text-[10px] text-slate-400 font-medium italic">Sin OCs a futuro o demoradas.</div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {/* VISTA 2: HISTORIAL */}
            {tabActiva === 'historial' && (
              <motion.div key="historial" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                {reclamosActivos.length > 0 ? (
                  <div className="space-y-3">
                    {reclamosActivos.map((r, idx) => (
                      <div key={idx} className={`p-4 rounded-xl border transition-all bg-white ${r.estado === 'CERRADO' ? 'border-slate-200 opacity-70' : 'border-orange-200 shadow-sm'}`}>
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${r.estado === 'CERRADO' ? 'bg-slate-100 text-slate-500' : 'bg-orange-100 text-orange-600'}`}>
                              {r.estado}
                            </span>
                            <span className="text-[10px] tabular-nums font-bold text-slate-400 ml-2">{formatearFecha(r.fecha)}</span>
                          </div>
                        </div>
                        <p className="text-xs font-bold text-slate-700 mb-1">{r.mensaje}</p>
                        <p className="text-[11px] text-slate-500 leading-relaxed italic border-l-2 border-slate-100 pl-2">{r.cuerpoOriginal}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-12 text-center border-2 border-dashed border-slate-200 rounded-xl">
                    <History size={24} className="mx-auto text-slate-300 mb-2" />
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Sin registro de auditoría</p>
                  </div>
                )}
              </motion.div>
            )}
            
          </AnimatePresence>
        </div>

        {/* PIE DEL PANEL: BOTÓN COMPACTO */}
        <div className="p-4 md:px-8 bg-white border-t border-slate-100 shrink-0 z-10 shadow-[0_-10px_20px_rgba(0,0,0,0.02)]">
          <button 
            onClick={() => abrirRedactorReclamo(activeInsumo)} 
            className="w-full flex items-center justify-between px-5 py-3.5 text-white rounded-xl transition-all shadow-md active:scale-[0.98] font-black text-[11px] uppercase tracking-widest bg-orange-500 hover:bg-orange-600"
          >
            <div className="flex items-center gap-2">
              <Send size={16} /> Reclamar a Compras
            </div>
            <ChevronRight size={16} />
          </button>
        </div>
      </motion.div>
    </>
  );
};

export default PanelDetalle;
