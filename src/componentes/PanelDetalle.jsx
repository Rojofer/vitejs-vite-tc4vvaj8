import React, { useState } from 'react';
import { X, Star, StarOff, CheckCircle, Copy, Clock, Send, ChevronRight, Package, AlertCircle, FileText } from 'lucide-react';
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
  const enRiesgo = activeInsumo.supervivencia <= (config?.umbralUrgencia || 15);

  return (
    <>
      {/* Backdrop */}
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        exit={{ opacity: 0 }} 
        onClick={() => setActiveInsumo(null)} 
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[70]" 
      />

      {/* Panel Lateral */}
      <motion.div 
        initial={{ x: '100%' }} 
        animate={{ x: 0 }} 
        exit={{ x: '100%' }} 
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="fixed right-0 top-0 h-full w-full max-w-md bg-white z-[80] shadow-2xl flex flex-col"
      >
        {/* CABECERA MINIMALISTA */}
        <div className="p-6 border-b border-slate-100 shrink-0">
          <div className="flex justify-between items-start mb-4">
            <button 
              onClick={() => setActiveInsumo(null)} 
              className="p-2 -ml-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-all"
            >
              <X size={20} />
            </button>
            
            <button 
              onClick={() => toggleFavorito(activeInsumo)} 
              className="p-2 text-slate-300 hover:scale-110 transition-all"
            >
              <Star 
                size={22} 
                className={activeInsumo.favorito ? "text-yellow-400" : "text-slate-200"} 
                fill={activeInsumo.favorito ? "currentColor" : "none"} 
              />
            </button>
          </div>

          <h2 className="text-xl font-semibold text-slate-800 leading-tight mb-1">
            {activeInsumo.nombre}
          </h2>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-slate-400 bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
              {activeInsumo.codigo}
            </span>
            <button onClick={() => handleCopy(activeInsumo.codigo)} className="text-slate-300 hover:text-slate-500">
              <Copy size={12} />
            </button>
            {copiado && <span className="text-[10px] text-emerald-500 font-bold animate-pulse">Copiado</span>}
          </div>
        </div>

        {/* CUERPO DEL PANEL */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          
          {/* MÉTRICAS DE SUPERVIVENCIA */}
          <div className="grid grid-cols-2 gap-4">
            <div className={`p-4 rounded-2xl border transition-all ${enRiesgo ? 'bg-red-50 border-red-100' : 'bg-slate-50 border-slate-100'}`}>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Cobertura</p>
              <p className={`text-2xl font-black ${enRiesgo ? 'text-red-600' : 'text-slate-800'}`}>
                {Math.round(activeInsumo.supervivencia)} <span className="text-xs font-medium opacity-60">días</span>
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Stock Actual</p>
              <p className="text-2xl font-black text-slate-800">
                {formatoNum(activeInsumo.stock)}
              </p>
            </div>
          </div>

          {/* ESTADO DE COMPRAS (S/P y OCs) */}
          <div className="space-y-3">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">Estado de Suministros</p>
            
            <div className="grid grid-cols-1 gap-3">
              {/* SOLPEDS */}
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                <div className="flex items-center gap-2 mb-3">
                  <FileText size={14} className="text-violet-500" />
                  <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">S/P en Curso</span>
                </div>
                {activeInsumo.detalleSolpeds && activeInsumo.detalleSolpeds.length > 0 ? (
                  <div className="space-y-2">
                    {activeInsumo.detalleSolpeds.map((sp, idx) => (
                      <div key={idx} className="flex justify-between items-center bg-white px-3 py-2 rounded-xl border border-slate-100 shadow-sm">
                        <span className="text-xs font-mono font-bold text-slate-600">S/P {sp.numero}</span>
                        <span className="text-xs font-black text-violet-600">{formatoNum(sp.cantidad)} un.</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 font-medium italic">Sin solicitudes (S/P) activas.</p>
                )}
              </div>

              {/* ORDENES DE COMPRA */}
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                <div className="flex items-center gap-2 mb-3">
                  <Package size={14} className="text-sky-500" />
                  <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Órdenes de Compra</span>
                </div>
                {activeInsumo.detalleOCs && activeInsumo.detalleOCs.length > 0 ? (
                  <div className="space-y-2">
                    {activeInsumo.detalleOCs.map((oc, idx) => {
                      const f = oc.fecha?.seconds ? new Date(oc.fecha.seconds * 1000) : new Date(oc.fecha);
                      const hoyCheck = new Date(); hoyCheck.setHours(0,0,0,0);
                      const isDemorada = f < hoyCheck;
                      
                      return (
                        <div key={idx} className={`flex justify-between items-center bg-white px-3 py-2 rounded-xl border shadow-sm ${isDemorada ? 'border-red-200' : 'border-slate-100'}`}>
                          <div className="flex flex-col">
                            <span className="text-xs font-mono font-bold text-slate-600">OC {oc.numero}</span>
                            <span className={`text-[9px] font-black tracking-widest uppercase mt-0.5 ${isDemorada ? 'text-red-500' : 'text-slate-400'}`}>
                              {isDemorada ? 'Venció: ' : 'Entrega: '}{formatearFecha(f).split(' ')[0]}
                            </span>
                          </div>
                          <span className={`text-xs font-black ${isDemorada ? 'text-red-600' : 'text-sky-600'}`}>
                            {formatoNum(oc.cantidad)} un.
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 font-medium italic">Sin OCs a futuro o demoradas.</p>
                )}
              </div>
            </div>
          </div>
          
          {/* ASIGNACIÓN (SÓLO OWNER) */}
          {isOwner && (
            <div className="space-y-2">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Responsable de Gestión</p>
              <div className="flex items-center gap-2 p-3 bg-white border border-slate-100 rounded-xl shadow-sm">
                <div className={`w-2 h-2 rounded-full ${obtenerColorOwner(activeInsumo.owner).dot}`} />
                <span className="text-sm font-medium text-slate-700 uppercase">{activeInsumo.owner || 'Sin Asignar'}</span>
              </div>
            </div>
          )}

          {/* HISTORIAL DE RECLAMOS A COMPRAS */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Historial de Auditoría</p>
              <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-bold">
                {reclamosActivos.length} eventos
              </span>
            </div>

            <div className="space-y-3">
              {reclamosActivos.length > 0 ? (
                reclamosActivos.map((r, idx) => {
                  const isCerrado = r.estado === 'CERRADO';
                  return (
                    <div key={idx} className={`p-3 rounded-xl border transition-all ${isCerrado ? 'bg-slate-50/50 border-slate-100 opacity-60' : 'bg-orange-50/50 border-orange-100'}`}>
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                          {isCerrado ? <CheckCircle size={14} className="text-emerald-500" /> : <Clock size={14} className="text-orange-500" />}
                          <span className={`text-[10px] font-black uppercase tracking-tight ${isCerrado ? 'text-slate-400' : 'text-orange-700'}`}>
                            {isCerrado ? 'Gestión Finalizada' : 'Reclamo a Compras'}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-medium">{formatearFecha(r.fecha)}</span>
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed font-medium">
                        {r.comentario || "Sin descripción del reclamo."}
                      </p>
                    </div>
                  );
                })
              ) : (
                <div className="py-10 text-center space-y-2">
                  <Package size={32} className="mx-auto text-slate-100" />
                  <p className="text-xs text-slate-400 font-medium">Sin reclamos registrados para este insumo.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* PIE DEL PANEL: ACCIÓN DIRECTA */}
        <div className="p-6 bg-white border-t border-slate-100 shrink-0">
          <button 
            onClick={() => abrirRedactorReclamo(activeInsumo)} 
            className="w-full flex items-center justify-between p-4 text-white rounded-2xl transition-all shadow-lg active:scale-[0.98] font-black text-xs uppercase tracking-widest bg-orange-500 hover:bg-orange-600"
          >
            <div className="flex items-center gap-3">
              <Send size={18} /> 
              Reclamar a Compras
            </div>
            <ChevronRight size={18} />
          </button>
          <p className="text-[9px] text-center text-slate-400 mt-3 font-medium uppercase tracking-tighter">
            Esta acción iniciará la auditoría de stock y notificará al sector correspondiente.
          </p>
        </div>
      </motion.div>
    </>
  );
};

export default PanelDetalle;
