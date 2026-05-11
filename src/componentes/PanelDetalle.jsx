import React, { useState } from 'react';
import { X, Star, Copy, Clock, Send, ChevronRight, Package, FileText, CheckCircle, AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';

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

  // Lógica de Ordenamiento S/P (Por Fecha)
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

      {/* PANEL EXTENDIDO (max-w-3xl) PARA QUE ENTREN LAS TABLAS 50/50 */}
      <motion.div 
        initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="fixed right-0 top-0 h-full w-full max-w-3xl bg-white z-[80] shadow-2xl flex flex-col"
      >
        {/* CABECERA (Con el Responsable Inyectado) */}
        <div className="p-6 md:p-8 border-b border-slate-100 shrink-0 bg-white z-10">
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
          
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-mono text-slate-500 bg-slate-50 px-2 py-1 rounded-md border border-slate-100 shadow-sm">
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
        </div>

        {/* CUERPO DEL PANEL */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8 bg-slate-50/30">
          
          {/* MÉTRICAS DE SUPERVIVENCIA Y MOTOR DE CONSUMO */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className={`p-5 rounded-2xl border transition-all shadow-sm ${enRiesgo ? 'bg-red-50 border-red-200' : 'bg-white border-slate-200'}`}>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Cobertura</p>
                <div className="flex items-baseline gap-1">
                  <p className={`text-4xl font-black ${enRiesgo ? 'text-red-600' : 'text-slate-800'}`}>
                    {activeInsumo.supervivencia >= 999 ? '∞' : Math.round(activeInsumo.supervivencia)}
                  </p>
                  <span className={`text-sm font-bold ${enRiesgo ? 'text-red-400' : 'text-slate-400'}`}>días</span>
                </div>
              </div>
              
              <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Stock Actual</p>
                <p className="text-4xl font-black text-slate-800">
                  {formatoNum(activeInsumo.stock)}
                </p>
              </div>
            </div>

            {/* BARRA DE CONSUMO */}
            <div className="flex items-center justify-between px-5 py-3 bg-white rounded-xl border border-slate-200 shadow-sm">
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Consumo Promedio:</span>
                <span className="text-sm font-black text-slate-700">{formatoNum(consumoMensual)}<span className="text-[10px] font-medium text-slate-400 ml-0.5">/mes</span></span>
              </div>
              <div className="flex items-center gap-3 border-l border-slate-100 pl-4">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Diario (Lab):</span>
                <span className="text-sm font-black text-slate-700">{formatoNum(consumoDiario)}</span>
              </div>
            </div>
          </div>

          {/* TABLAS DE S/P y O/C (50/50 Estilo SaaS) */}
          <div className="space-y-4">
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-200 pb-2">Estado de Suministros</h3>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
              
              {/* TABLA: SOLPEDS */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="bg-slate-50 px-4 py-3 border-b border-slate-100 flex justify-between items-center">
                  <h4 className="text-[10px] font-black text-slate-600 uppercase tracking-widest flex items-center gap-2"><FileText size={14} className="text-violet-500" /> S/P En Curso</h4>
                </div>
                
                {solpedsOrdenadas.length > 0 ? (
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-white border-b border-slate-100">
                      <tr>
                        <th className="px-4 py-2 text-[9px] font-bold text-slate-400 uppercase tracking-widest">Nº S/P</th>
                        <th className="px-4 py-2 text-[9px] font-bold text-slate-400 uppercase tracking-widest text-center">Cant.</th>
                        <th className="px-4 py-2 text-[9px] font-bold text-slate-400 uppercase tracking-widest text-right">Liberación</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {solpedsOrdenadas.map((sp, idx) => (
                        <tr key={idx} className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-3 text-xs font-mono font-bold text-slate-700">{sp.numero}</td>
                          <td className="px-4 py-3 text-xs font-black text-violet-600 text-center">{formatoNum(sp.cantidad)}</td>
                          <td className="px-4 py-3 text-[10px] font-medium text-slate-500 text-right">{formatearFecha(sp.fecha).split(' ')[0]}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="p-6 text-center text-xs text-slate-400 font-medium italic">Sin solicitudes (S/P) activas.</div>
                )}
              </div>

              {/* TABLA: ORDENES DE COMPRA */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="bg-slate-50 px-4 py-3 border-b border-slate-100 flex justify-between items-center">
                  <h4 className="text-[10px] font-black text-slate-600 uppercase tracking-widest flex items-center gap-2"><Package size={14} className="text-sky-500" /> Órdenes de Compra</h4>
                </div>
                
                {activeInsumo.detalleOCs && activeInsumo.detalleOCs.length > 0 ? (
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-white border-b border-slate-100">
                      <tr>
                        <th className="px-3 py-2 text-[9px] font-bold text-slate-400 uppercase tracking-widest">Nº OC</th>
                        <th className="px-3 py-2 text-[9px] font-bold text-slate-400 uppercase tracking-widest text-center">Status</th>
                        <th className="px-3 py-2 text-[9px] font-bold text-slate-400 uppercase tracking-widest text-center">Cant.</th>
                        <th className="px-3 py-2 text-[9px] font-bold text-slate-400 uppercase tracking-widest text-right">Entrega</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {activeInsumo.detalleOCs.map((oc, idx) => {
                        const f = oc.fecha?.seconds ? new Date(oc.fecha.seconds * 1000) : new Date(oc.fecha);
                        const hoyCheck = new Date(); hoyCheck.setHours(0,0,0,0);
                        const isDemorada = f < hoyCheck;
                        
                        // LÓGICA DE STATUS
                        const statusStr = (oc.status || oc.estado || "").toLowerCase();
                        let statusTag = <span className="bg-slate-100 text-slate-500 border-slate-200 border px-2 py-0.5 rounded text-[8px] font-black uppercase">SIN ESTADO</span>;
                        
                        if (statusStr.includes("docum") || statusStr.includes("enviad") || statusStr.includes("aprob")) {
                          statusTag = <span className="bg-emerald-50 text-emerald-600 border-emerald-200 border px-2 py-0.5 rounded text-[8px] font-black uppercase">APROBADO</span>;
                        } else if (statusStr.includes("proces") || statusStr.includes("autorizaci") || statusStr.includes("pendient")) {
                          statusTag = <span className="bg-amber-50 text-amber-600 border-amber-200 border px-2 py-0.5 rounded text-[8px] font-black uppercase">PENDIENTE</span>;
                        }

                        return (
                          <tr key={idx} className={`transition-colors ${isDemorada ? 'bg-red-50/50 hover:bg-red-50' : 'hover:bg-slate-50'}`}>
                            <td className="px-3 py-3 text-xs font-mono font-bold text-slate-700">{oc.numero}</td>
                            <td className="px-3 py-3 text-center">{statusTag}</td>
                            <td className={`px-3 py-3 text-xs font-black text-center ${isDemorada ? 'text-red-600' : 'text-slate-800'}`}>{formatoNum(oc.cantidad)}</td>
                            <td className={`px-3 py-3 text-[10px] font-bold text-right ${isDemorada ? 'text-red-500' : 'text-slate-500'}`}>
                              {isDemorada && <AlertTriangle size={10} className="inline mr-1 -mt-0.5" />}
                              {formatearFecha(f).split(' ')[0]}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                ) : (
                  <div className="p-6 text-center text-xs text-slate-400 font-medium italic">Sin OCs a futuro o demoradas.</div>
                )}
              </div>
            </div>
          </div>

        </div>

        {/* PIE DEL PANEL: ACCIÓN DIRECTA */}
        <div className="p-6 md:p-8 bg-white border-t border-slate-100 shrink-0 z-10 shadow-[0_-10px_20px_rgba(0,0,0,0.02)]">
          <button 
            onClick={() => abrirRedactorReclamo(activeInsumo)} 
            className="w-full flex items-center justify-between p-4 md:p-5 text-white rounded-2xl transition-all shadow-lg active:scale-[0.98] font-black text-sm md:text-xs uppercase tracking-widest bg-orange-500 hover:bg-orange-600"
          >
            <div className="flex items-center gap-3">
              <Send size={20} /> 
              Reclamar a Compras
            </div>
            <ChevronRight size={20} />
          </button>
          <p className="text-[10px] text-center text-slate-400 mt-4 font-bold uppercase tracking-widest">
            Al reclamar se registrará automáticamente en la auditoría.
          </p>
        </div>
      </motion.div>
    </>
  );
};

export default PanelDetalle;
