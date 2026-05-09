import React, { useState } from 'react';
import { X, Star, StarOff, Eye, EyeOff, CheckCircle, Copy, Clock, Send, ChevronRight, Activity, CheckSquare } from 'lucide-react';
import { motion } from 'framer-motion';

const formatoNum = (num) => Number(num).toLocaleString('es-AR');

const PanelDetalle = ({
  activeInsumo,
  setActiveInsumo,
  currentUser,
  config,
  toggleFavorito,
  toggleVisibilidadPlanta,
  formatearFecha,
  reclamosActivos,
  cerrarReclamoManual,
  setAuditoriaFiltroInsumo,
  setVistaActiva,
  rechazarAlertaPlanta,
  aprobarAlertaPlanta,
  abrirRedactorReclamo,
  solicitarAlertaPlanta,
  forzarCancelacionAlerta
}) => {
  const [copiado, setCopiado] = useState(false);
  const [confirmarForzar, setConfirmarForzar] = useState(false);

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setActiveInsumo(null)} className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[70]" />
      <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} className="fixed inset-y-0 right-0 w-[750px] bg-white shadow-2xl z-[80] flex flex-col border-l border-slate-200">
        
        {/* ENCABEZADO DEL PANEL */}
        <div className="p-6 border-b border-slate-100 bg-slate-50/50 relative shrink-0">
          <button onClick={() => setActiveInsumo(null)} className="absolute top-6 right-6 text-slate-400 hover:text-slate-800 bg-white p-1 rounded-full shadow-sm border border-slate-200 transition-colors"><X size={20}/></button>
          <div className="flex items-center justify-between mb-1.5 pr-10">
            <div className="flex items-center gap-2"><span className="text-[9px] font-black text-slate-500 bg-slate-200 px-2 py-0.5 rounded uppercase tracking-widest inline-block">{activeInsumo.grupo}</span><span className="text-[10px] font-mono text-slate-500 font-bold uppercase border border-slate-200 px-2 py-0.5 rounded shadow-sm bg-white">{activeInsumo.codigo}</span></div>
            <div className="flex gap-2 bg-white rounded-xl border border-slate-200 p-1.5 shadow-sm">
              {(currentUser.rol === 'owner' || currentUser.editorFavoritos) ? (
                <button onClick={() => { setActiveInsumo({...activeInsumo, favorito: !activeInsumo.favorito}); toggleFavorito(activeInsumo); }} className="p-2 rounded-lg transition-all hover:bg-slate-50 active:scale-95" title="Marcar/Desmarcar Favorito">
                  {activeInsumo.favorito ? <Star size={22} className="text-emerald-500" fill="currentColor"/> : <StarOff size={22} className="text-red-500" />}
                </button>
              ) : (
                <div className="p-2 opacity-40 cursor-not-allowed" title="No tenés permisos para editar favoritos">
                  {activeInsumo.favorito ? <Star size={22} className="text-emerald-500" fill="currentColor"/> : <StarOff size={22} className="text-slate-400" />}
                </div>
              )}
              
              {currentUser.rol === 'owner' && (
                <button onClick={() => { setActiveInsumo({...activeInsumo, visibleEnPlanta: !activeInsumo.visibleEnPlanta}); toggleVisibilidadPlanta(activeInsumo); }} className="p-2 rounded-lg transition-all hover:bg-slate-50 active:scale-95" title="Alternar Visibilidad en Planta">
                  {activeInsumo.visibleEnPlanta ? <Eye size={22} className="text-emerald-500"/> : <EyeOff size={22} className="text-red-500"/>}
                </button>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3 mt-2 pr-8">
            <h2 className="text-xl font-black uppercase leading-tight tracking-tight text-slate-800">{activeInsumo.nombre}</h2>
            <button onClick={() => { navigator.clipboard.writeText(`${activeInsumo.codigo} - ${activeInsumo.nombre}`); setCopiado(true); setTimeout(() => setCopiado(false), 2000); }} className="flex items-center gap-1.5 px-2 py-1 bg-white border border-slate-200 rounded-lg shadow-sm hover:bg-slate-50 transition-all text-slate-500 hover:text-slate-800 focus:outline-none flex-shrink-0 active:scale-95" title="Copiar Insumo">
              {copiado ? <><CheckCircle size={14} className="text-emerald-500"/><span className="text-[10px] font-bold text-emerald-600">Copiado!</span></> : <Copy size={14}/>}
            </button>
          </div>
        </div>  
        
        {/* CUERPO CENTRAL (MÉTRICAS Y GRÁFICOS) */}
        <div className="p-6 flex-1 overflow-y-auto">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm mb-4 relative overflow-hidden"><div className={`absolute left-0 top-0 bottom-0 w-1 ${activeInsumo.supervivencia < 15 ? 'bg-red-500' : 'bg-orange-500'}`}></div><div className="flex justify-between items-start ml-2 mb-3"><div className="flex flex-col gap-1.5 w-[55%]"><div className="flex justify-between items-center bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100"><span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Stock Físico</span> <span className="text-sm text-slate-900 font-black">{formatoNum(activeInsumo.stock)}</span></div><div className="flex justify-between items-center bg-blue-50/50 px-3 py-1.5 rounded-lg border border-blue-100/50"><span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">OC a Futuro</span> <span className="text-sm text-blue-600 font-black">+{formatoNum(activeInsumo.ocFutura)}</span></div><div className="flex justify-between items-center bg-purple-50/50 px-3 py-1.5 rounded-lg border border-purple-100/50"><span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">S/P en Curso</span> <span className="text-sm text-purple-600 font-black">+{formatoNum(activeInsumo.sp)}</span></div>{activeInsumo.ocDemorada > 0 && (<div className="flex justify-between items-center bg-red-50 px-3 py-1.5 rounded-lg border border-red-100"><span className="text-[10px] font-bold text-red-500 uppercase tracking-widest">OC Demoradas</span> <span className="text-sm text-red-600 font-black animate-pulse">+{formatoNum(activeInsumo.ocDemorada)}</span></div>)}</div><div className="text-right flex flex-col items-end justify-center pt-1"><p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Se agota en</p><p className={`text-6xl font-black leading-none tracking-tighter ${activeInsumo.supervivencia < 15 ? 'text-red-600' : 'text-slate-800'}`}>{activeInsumo.supervivencia >= 999 ? '∞' : Math.round(activeInsumo.supervivencia)}<span className="text-lg ml-1 text-slate-500 font-bold">d</span></p><p className="text-[9px] font-bold text-slate-500 mt-3 bg-slate-100 px-2 py-1 rounded-md uppercase tracking-widest">Proyección c/ Compras: {activeInsumo.cobertura >= 999 ? '∞' : Math.round(activeInsumo.cobertura)} d</p></div></div><div className="ml-2 pt-3 border-t border-slate-100 flex justify-between items-center bg-slate-50 p-2.5 rounded-xl"><div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Consumo Promedio: <span className="text-slate-800 font-black ml-1 text-xs">{formatoNum(activeInsumo.consumo)}/mes</span></div><div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Diario (Lab): <span className="text-slate-800 font-black ml-1 text-xs">{activeInsumo.consumo > 0 ? formatoNum(Math.round(activeInsumo.consumo/26)) : 0}</span></div></div></div>
          
          <div className="bg-slate-900 p-4 rounded-2xl mb-5 shadow-xl border border-slate-800"><div className="flex justify-between items-center mb-3"><p className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Ruta de Suministros (90d)</p><div className="flex gap-3"><span className="flex items-center gap-1 text-[8px] font-bold text-emerald-400 uppercase"><div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div> Real</span><span className="flex items-center gap-1 text-[8px] font-bold text-emerald-700 uppercase opacity-50"><div className="w-1.5 h-1.5 bg-emerald-500/20 border border-emerald-500/50 rounded-full"></div> Teórico</span></div></div><div className="relative h-8 w-full bg-slate-800/50 rounded-lg border border-slate-700 overflow-visible mt-1"><motion.div initial={{ width: 0 }} animate={{ width: `${Math.min((activeInsumo.cobertura) / 90 * 100, 100)}%` }} className="absolute h-full bg-emerald-500/10 border-r border-emerald-500/30 z-0 rounded-l-lg" /><motion.div initial={{ width: 0 }} animate={{ width: `${Math.min((activeInsumo.supervivencia) / 90 * 100, 100)}%` }} className="absolute h-full bg-emerald-500/40 border-r-2 border-emerald-400 z-10 rounded-l-lg" />{activeInsumo.supervivencia < 999 && (<div className="absolute h-12 w-[2px] bg-red-500 z-30 -top-2 shadow-[0_0_10px_rgba(239,68,68,1)]" style={{ left: `${Math.min((activeInsumo.supervivencia) / 90 * 100, 100)}%` }}><div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-red-600 text-white text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-tighter shadow-md">Quiebre</div></div>)}{activeInsumo.detalleOCs?.map((oc, idx) => { const f = oc.fecha?.seconds ? new Date(oc.fecha.seconds * 1000) : new Date(oc.fecha); const fCheck = new Date(f); fCheck.setHours(0,0,0,0); const hoyCheck = new Date(); hoyCheck.setHours(0,0,0,0); const isPast = fCheck < hoyCheck; const dias = Math.max(0, (f - new Date()) / (1000 * 60 * 60 * 24)); const fechaLimpia = isNaN(f.getTime()) ? (oc.fecha || "-") : `${String(f.getDate()).padStart(2, '0')}/${String(f.getMonth() + 1).padStart(2, '0')}/${String(f.getFullYear()).slice(-2)}`; return (<div key={idx} className={`absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full z-40 border-2 border-slate-900 shadow-lg transition-all hover:scale-150 cursor-help ${isPast ? 'bg-red-500 animate-pulse' : dias > activeInsumo.supervivencia ? 'bg-orange-500 border-white' : 'bg-blue-400'}`} style={{ left: `${Math.min(dias / 90 * 100, 100)}%` }} title={`OC ${oc.numero} - Entrega: ${fechaLimpia}`} />); })}</div><div className="flex justify-between mt-4 px-1 text-white opacity-50"><div className="text-center"><p className="text-[8px] font-black uppercase">Hoy</p></div><div className="text-center"><p className="text-[8px] font-black uppercase">30 Días</p></div><div className="text-center"><p className="text-[8px] font-black uppercase">60 Días</p></div><div className="text-center"><p className="text-[8px] font-black uppercase">90+ Días</p></div></div></div>
          
          <div className="flex gap-4 mb-6">
            <div className="flex-1 bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm flex flex-col">
              <div className="bg-slate-50 px-4 py-2 border-b border-slate-100 shrink-0"><p className="text-[9px] font-black uppercase text-slate-500 tracking-widest">S/P en curso</p></div>
              <div className="max-h-48 overflow-y-auto">
                <table className="w-full text-left text-[10px] relative">
                  <thead className="sticky top-0 bg-slate-50/90 backdrop-blur-sm shadow-sm z-10"><tr className="text-[8px] text-slate-400 uppercase"><th className="px-4 py-2">N° S/P</th><th className="px-4 py-2 text-right">Cant.</th><th className="px-4 py-2 text-center">Req. Para</th></tr></thead>
                  <tbody className="divide-y divide-slate-50">
                    {[...(activeInsumo.detalleSolpeds || [])].sort((a, b) => {
                      const d1 = a.fecha?.seconds ? new Date(a.fecha.seconds * 1000) : new Date(a.fecha);
                      const d2 = b.fecha?.seconds ? new Date(b.fecha.seconds * 1000) : new Date(b.fecha);
                      return d1 - d2; // Ordena de más antiguo a más reciente
                    }).map((sp, idx) => { 
                      const f = sp.fecha?.seconds ? new Date(sp.fecha.seconds * 1000) : new Date(sp.fecha); 
                      const fechaCorta = isNaN(f.getTime()) ? (sp.fecha || "-") : `${String(f.getDate()).padStart(2, '0')}/${String(f.getMonth() + 1).padStart(2, '0')}/${String(f.getFullYear()).slice(-2)}`; 
                      return (
                        <tr key={idx} className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-2.5 font-bold text-purple-700">{sp.numero}</td>
                          <td className="px-4 py-2.5 text-right font-black">{formatoNum(sp.cantidad)}</td>
                          <td className="px-4 py-2.5 text-center font-bold text-slate-500">{fechaCorta}</td>
                        </tr>
                      ); 
                    })}
                    {(!activeInsumo.detalleSolpeds || activeInsumo.detalleSolpeds.length === 0) && (
                      <tr><td colSpan="3" className="px-4 py-8 text-center text-slate-400 font-bold uppercase tracking-widest">Sin solicitudes</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="flex-[1.6] bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm flex flex-col">
              <div className="bg-slate-50 px-4 py-2 border-b border-slate-100 shrink-0"><p className="text-[9px] font-black uppercase text-slate-500 tracking-widest">Órdenes de Compra</p></div>
              <div className="max-h-48 overflow-y-auto">
                <table className="w-full text-left text-[10px] relative">
                  <thead className="sticky top-0 bg-slate-50/90 backdrop-blur-sm shadow-sm z-10"><tr className="text-[8px] text-slate-400 uppercase"><th className="px-4 py-2">N° OC</th><th className="px-4 py-2">Status</th><th className="px-4 py-2 text-right">Cant.</th><th className="px-4 py-2 text-center">Entrega</th></tr></thead>
                  <tbody className="divide-y divide-slate-50">
                    {[...(activeInsumo.detalleOCs || [])].sort((a, b) => {
                      const d1 = a.fecha?.seconds ? new Date(a.fecha.seconds * 1000) : new Date(a.fecha);
                      const d2 = b.fecha?.seconds ? new Date(b.fecha.seconds * 1000) : new Date(b.fecha);
                      return d1 - d2; // Ordena de más antiguo a más reciente
                    }).map((oc, idx) => { 
                      const f = oc.fecha?.seconds ? new Date(oc.fecha.seconds * 1000) : new Date(oc.fecha); 
                      const os = oc.estado?.toUpperCase().trim() || ""; 
                      let st = "PENDIENTE";
                      let badgeClass = "bg-yellow-100 text-yellow-700 border-yellow-300"; 
                      if (os.includes('DOCUM.SUBSIGUIENTES') || os.includes('ENVIADO') || os.includes('APROBADO')) { 
                        st = 'APROBADO';
                        badgeClass = "bg-emerald-100 text-emerald-700 border-emerald-200"; 
                      } 
                      let isDemorada = false; 
                      let rowClass = "hover:bg-slate-50 transition-colors border-b border-slate-50";
                      const hoyCheck = new Date(); hoyCheck.setHours(0,0,0,0); 
                      const fCheck = new Date(f); fCheck.setHours(0,0,0,0);
                      if (fCheck < hoyCheck) { 
                        badgeClass = "bg-red-500 text-white border-red-700 animate-pulse shadow-md"; 
                        rowClass = "bg-red-50 hover:bg-red-100 border-b border-red-100";
                        isDemorada = true; 
                      } 
                      const fechaCorta = isNaN(f.getTime()) ? (oc.fecha || "-") : `${String(f.getDate()).padStart(2, '0')}/${String(f.getMonth() + 1).padStart(2, '0')}/${String(f.getFullYear()).slice(-2)}`;
                      return (
                        <tr key={idx} className={rowClass}>
                          <td className={`px-4 py-2.5 font-bold ${isDemorada ? 'text-red-700' : 'text-slate-700'}`}>{oc.numero}</td>
                          <td className="px-4 py-2.5"><span className={`px-2 py-1 rounded-md border text-[8px] font-black ${badgeClass}`}>{st}</span></td>
                          <td className={`px-4 py-2.5 text-right font-black ${isDemorada ? 'text-red-700' : ''}`}>{formatoNum(oc.cantidad)}</td>
                          <td className={`px-4 py-2.5 text-center font-bold ${isDemorada ? 'text-red-600 font-black' : 'text-slate-500'}`}>{fechaCorta}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          
          <div className="mb-2">
            <div className="flex justify-between items-center mb-3"><h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Historial Táctico</h3>{reclamosActivos.length > 0 && (<span className="text-[9px] font-black bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full uppercase tracking-tighter border border-slate-200">{reclamosActivos.length} Registros</span>)}</div>
            {reclamosActivos.length > 0 ? (
              <div className="space-y-2 max-h-56 overflow-y-auto pr-2 pb-4">
                {reclamosActivos.map(r => {
                  const isGerencia = r.tipo?.includes('GERENCIA');
                  const isAprobacion = r.tipo === 'APROBACION GERENCIA';
                  const isRechazo = r.tipo === 'RECHAZO GERENCIA';
                  const isResuelto = r.estado === 'CERRADO' && !isGerencia;
                  
                  let bgColor = 'bg-orange-50 border-orange-200';
                  let icon = <Clock size={16} className="text-orange-600 mt-0.5" />;
                  let titleColor = 'text-slate-800';
                  let titleText = 'Reclamo Proveedor';

                  if (isResuelto) {
                    bgColor = 'bg-slate-50 border-slate-200 opacity-70 hover:opacity-100';
                    icon = <CheckCircle size={16} className="text-emerald-500 mt-0.5" />;
                    titleColor = 'text-slate-500';
                    titleText = 'Reclamo Resuelto';
                  } else if (isAprobacion) {
                    bgColor = 'bg-indigo-50 border-indigo-200 opacity-90';
                    icon = <CheckSquare size={16} className="text-indigo-600 mt-0.5" />;
                    titleColor = 'text-indigo-800';
                    titleText = 'Autorización Interna';
                  } else if (isRechazo) {
                    bgColor = 'bg-slate-100 border-slate-300 opacity-80';
                    icon = <X size={16} className="text-slate-500 mt-0.5" />;
                    titleColor = 'text-slate-600';
                    titleText = 'Permiso Denegado';
                  } else if (r.tipo === 'equipo') {
                    bgColor = 'bg-purple-50 border-purple-200';
                    icon = <Activity size={16} className="text-purple-600 mt-0.5" />;
                    titleColor = 'text-purple-800';
                    titleText = 'Alerta a Planta';
                  }

                  return (
                    <div key={r.id} onClick={() => { setActiveInsumo(null); setAuditoriaFiltroInsumo(r.insumoId); setVistaActiva('auditoria'); }} className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer hover:scale-[1.01] transition-all group shadow-sm ${bgColor}`}>
                      <div className="flex items-start gap-3">
                        {icon}
                        <div>
                          <p className={`text-xs font-bold uppercase flex items-center gap-2 ${titleColor}`}>
                            {titleText} 
                            <span className="opacity-40 text-[9px] bg-white px-1.5 py-0.5 rounded border border-transparent group-hover:border-slate-300 transition-colors">#{r.iteracion}</span>
                          </p>
                          <p className="text-[9px] text-slate-400 font-bold mt-1 uppercase tracking-widest flex items-center gap-1">Fecha: {formatearFecha(r.fecha)}</p>
                        </div>
                      </div>
                      <ChevronRight size={14} className="text-slate-300 group-hover:text-slate-500 transition-colors" />
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="bg-slate-50 p-4 rounded-xl border border-dashed border-slate-200 text-slate-400 text-xs font-bold uppercase flex flex-col items-center justify-center gap-2 mb-4"><CheckCircle size={20} className="opacity-50" /> <span>Sin comunicaciones previas</span></div>
            )}
          </div>
        </div>
        
        {/* PIE DEL PANEL (BOTONERAS DE ACCIÓN) */}
        <div className="p-6 bg-white border-t border-slate-100 shrink-0">
          {(() => {
            const isOwner = currentUser.rol === 'owner';
            const { alertaPendiente, alertaAprobada, alertaSolicitante, alertaRechazadaMotivo, alertaAprobadaHora } = activeInsumo;
            
            let horasPasadas = 0; let delayVencido = false;
            if (alertaAprobada && alertaAprobadaHora) {
              const horaAprob = alertaAprobadaHora.seconds ? new Date(alertaAprobadaHora.seconds * 1000) : new Date(alertaAprobadaHora);
              horasPasadas = (new Date() - horaAprob) / (1000 * 60 * 60);
              const limite = config.tiempoDelayAlerta || 2;
              delayVencido = horasPasadas > limite;
            }

            return (
              <div className="flex flex-col gap-3">
                {/* ADMIN: Panel de Aprobación */}
                {isOwner && alertaPendiente && (
                  <div className="bg-purple-50 border border-purple-200 p-3 rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="flex h-3 w-3 relative">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-purple-500"></span>
                      </span>
                      <p className="text-[10px] font-black text-purple-800 uppercase tracking-widest">Solicitud Alerta Planta: <span className="text-purple-600">{alertaSolicitante}</span></p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => { const motivo = window.prompt("Motivo del rechazo:"); if (motivo) rechazarAlertaPlanta(activeInsumo, motivo); }} className="px-3 py-1.5 bg-white text-slate-500 border border-slate-200 rounded-lg text-[9px] font-black uppercase hover:text-red-500 hover:border-red-200 transition-colors">Rechazar</button>
                      <button onClick={() => aprobarAlertaPlanta(activeInsumo)} className="px-3 py-1.5 bg-purple-600 text-white rounded-lg text-[9px] font-black uppercase hover:bg-purple-700 shadow-md transition-colors">Aprobar</button>
                    </div>
                  </div>
                )}

                {/* ADMIN: Panel de Delay */}
                {isOwner && alertaAprobada && delayVencido && (
                  <div className="p-3 rounded-xl flex items-center justify-between border bg-red-50 border-red-200">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-red-700">⚠️ ALERTA APROBADA - ENVÍO DEMORADO</p>
                      <p className="text-[9px] font-bold mt-0.5 text-red-500">Aprobada hace {horasPasadas.toFixed(1)} hs.</p>
                    </div>
                    {confirmarForzar ? (
                      <div className="flex items-center gap-3 bg-red-50 p-2 rounded-xl border border-red-200">
                        <span className="text-[9px] font-black text-red-800 uppercase tracking-widest flex-1 pl-2">¿Seguro de forzar?</span>
                        <button 
                          onClick={() => setConfirmarForzar(false)} 
                          className="px-3 py-1.5 bg-white border border-red-200 text-slate-500 rounded-lg text-[9px] font-black uppercase hover:bg-slate-50 transition-all"
                        >
                          Cancelar
                        </button>
                        <button 
                          onClick={() => { 
                            setConfirmarForzar(false);
                            forzarCancelacionAlerta(activeInsumo); 
                          }} 
                          className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-[9px] font-black uppercase shadow-sm hover:bg-red-700 transition-all"
                        >
                          Sí, Limpiar
                        </button>
                      </div>
                    ) : (
                      <button 
                        onClick={() => setConfirmarForzar(true)} 
                        className="text-[10px] font-black uppercase text-red-500 hover:text-red-700 transition-colors underline decoration-red-500/30 underline-offset-4"
                      >
                        FORZAR CANCELACIÓN
                      </button>
                    )}
                  </div>
                )}

                {/* OPERARIO: Banners informativos de estado */}
                {!isOwner && alertaPendiente && (
                  <div className="bg-amber-50 text-amber-700 p-2 rounded-lg text-[10px] font-black uppercase text-center border border-amber-200 flex items-center justify-center gap-2">
                    <Activity size={14}/> Solicitud de Alerta Interna en Revisión por Gerencia
                  </div>
                )}
                {/* OPERARIO: Banners informativos de estado */}
                {!isOwner && alertaPendiente && (
                  <div className="bg-sky-50 text-sky-700 p-2 rounded-lg text-[10px] font-black uppercase text-center border border-sky-200 flex items-center justify-center gap-2">
                    <Clock size={14}/> Solicitud de Alerta Interna en Revisión por Gerencia
                  </div>
                )}
                {!isOwner && alertaRechazadaMotivo && (
                  <div className="bg-slate-50 text-slate-500 p-2 rounded-lg text-[10px] font-black uppercase text-center border border-slate-200 flex items-center justify-center gap-2">
                    <X size={14} className="text-red-500"/> Rechazada: {alertaRechazadaMotivo}
                  </div>
                )}

                {/* --- VÍAS PARALELAS: LOS BOTONES --- */}
                {(!isOwner && alertaAprobada) ? (
                  // Si está aprobada, le mostramos DOS botones (El de planta verde y el de proveedor naranja)
                  <div className="flex gap-3">
                    <button onClick={() => abrirRedactorReclamo(activeInsumo, "ALERTA PLANTA")} className="flex-1 flex items-center justify-center gap-2 p-4 text-white rounded-2xl transition-all shadow-[0_10px_20px_rgba(16,185,129,0.3)] active:scale-[0.98] font-black text-xs uppercase tracking-widest bg-emerald-500 hover:bg-emerald-600 animate-pulse">
                      <Activity size={18} /> Enviar a Planta
                    </button>
                    <button onClick={() => abrirRedactorReclamo(activeInsumo, "RECLAMO COMPRAS")} className="flex-1 flex items-center justify-center gap-2 p-4 text-white rounded-2xl transition-all shadow-[0_10px_20px_rgba(249,115,22,0.3)] active:scale-[0.98] font-black text-[10px] uppercase tracking-widest bg-slate-800 hover:bg-slate-900 opacity-90">
                      <Send size={14} /> Reclamar a Prov.
                    </button>
                  </div>
                ) : (
                  // Si NO está aprobada (o si es el Administrador), le mostramos el botón grande normal
                  <button onClick={() => abrirRedactorReclamo(activeInsumo)} className="w-full flex items-center justify-between p-4 text-white rounded-2xl transition-all shadow-[0_10px_20px_rgba(249,115,22,0.3)] active:scale-[0.98] font-black text-xs uppercase tracking-widest bg-orange-500 hover:bg-orange-600">
                    <div className="flex items-center gap-3"><Send size={18} /> Iniciar Comunicación</div>
                    <ChevronRight size={18} />
                  </button>
                )}
                
              </div>
            );
          })()}
        </div>

      </motion.div>
    </>
  );
};

export default PanelDetalle;
