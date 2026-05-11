import React, { useState, useMemo } from 'react';
import { ArrowUpDown, Star, StarOff, Eye, EyeOff, Clock, Send, Activity, CheckSquare, Bell, Check, X, BellOff } from 'lucide-react';

const formatoNum = (num) => Number(num).toLocaleString('es-AR');

const TablaInsumos = ({ datos, onGestionar, mostrarGrupo, toggleFavorito, toggleVisibilidadPlanta, isOwner, canEditFav, obtenerColorOwner, config }) => {
  const [sortConf, setSortConf] = useState({ key: 'supervivencia', dir: 'asc' });
  const handleSort = (key) => setSortConf({ key, dir: sortConf.key === key && sortConf.dir === 'asc' ? 'desc' : 'asc' });
  const renderIcon = (key) => sortConf.key === key ? <ArrowUpDown size={10} className={`inline ml-1 ${sortConf.dir === 'asc'?'text-slate-800':'text-orange-500'}`}/> : <ArrowUpDown size={10} className="inline ml-1 opacity-0 group-hover:opacity-50"/>;
  
  // Extraemos el umbral de tu perilla (Si no lo encuentra, usa 15 por defecto)
  const uUrgencia = config?.umbralUrgencia !== undefined ? Number(config.umbralUrgencia) : 15;

  const datosFiltrados = useMemo(() => {
    return [...datos].sort((a,b) => {
      let vA = a[sortConf.key]; let vB = b[sortConf.key];
      if(sortConf.key === 'nombre') { vA = vA?.toLowerCase()||''; vB = vB?.toLowerCase()||''; }
      if(vA < vB) return sortConf.dir === 'asc' ? -1 : 1; if(vA > vB) return sortConf.dir === 'asc' ? 1 : -1; return 0;
    });
  }, [datos, sortConf]);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 relative"><table className="w-full text-left border-collapse">
      <thead className="sticky top-0 z-40 bg-slate-50 shadow-[0_4px_10px_-2px_rgba(0,0,0,0.15)]"><tr className="border-b border-slate-200">
        <th className="w-10 px-4 py-3"></th>
        <th className="w-10 px-4 py-3 text-center text-[9px] font-black text-slate-400 uppercase tracking-widest" title="Visibilidad en Planta">TV</th>
        <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest cursor-pointer group hover:bg-slate-100 transition-colors" onClick={()=>handleSort('codigo')}>Código {renderIcon('codigo')}</th>
        <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest cursor-pointer group hover:bg-slate-100 transition-colors" onClick={()=>handleSort('nombre')}>Material {renderIcon('nombre')}</th>
        {mostrarGrupo && <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest cursor-pointer group hover:bg-slate-100 transition-colors" onClick={()=>handleSort('grupo')}>Grupo {renderIcon('grupo')}</th>}
        <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center cursor-pointer group hover:bg-slate-100 transition-colors" onClick={()=>handleSort('stock')}>Stock {renderIcon('stock')}</th>
        <th className="px-4 py-3 text-[9px] font-black text-blue-500 uppercase tracking-widest text-center cursor-pointer group hover:bg-blue-50 transition-colors" onClick={()=>handleSort('ocFutura')}>O/C Futuras {renderIcon('ocFutura')}</th>
        <th className="px-4 py-3 text-[9px] font-black text-red-500 uppercase tracking-widest text-center cursor-pointer group hover:bg-red-50 transition-colors" onClick={()=>handleSort('ocDemorada')}>Demoras {renderIcon('ocDemorada')}</th>
        <th className="px-4 py-3 text-[9px] font-black text-purple-500 uppercase tracking-widest text-center cursor-pointer group hover:bg-purple-50 transition-colors" onClick={()=>handleSort('sp')}>S/P {renderIcon('sp')}</th>
        <th className="px-4 py-3 text-[9px] font-black text-slate-800 uppercase tracking-widest text-right cursor-pointer group hover:bg-slate-100 transition-colors" onClick={()=>handleSort('supervivencia')}>Cobertura (Límite: {uUrgencia}) {renderIcon('supervivencia')}</th>
        <th className="px-4 py-3 text-[9px] font-black text-orange-600 uppercase tracking-widest text-center cursor-pointer group hover:bg-orange-50 transition-colors" onClick={()=>handleSort('escalados')} title="Nivel de Escalamiento">Escalado {renderIcon('escalados')}</th>
        <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Gestión</th>
      </tr></thead>
      <tbody className="divide-y divide-slate-100">{datosFiltrados.map(i => (
        <tr key={i.id} onClick={() => onGestionar(i)} className={`cursor-pointer transition-colors ${i.supervivencia <= uUrgencia ? 'bg-red-50/40 hover:bg-red-100/50' : 'hover:bg-orange-50/50'}`}>
          
          <td className="px-4 py-2.5 text-center" onClick={(e) => e.stopPropagation()}>
            {canEditFav ? (
              <button onClick={(e) => { e.stopPropagation(); toggleFavorito(i); }} className="transition-all hover:scale-110">
                {i.favorito ? <Star size={18} className="text-emerald-500" fill="currentColor"/> : <StarOff size={18} className="text-red-500"/>}
              </button>
            ) : (
              <div className="opacity-40 cursor-not-allowed" title="Solo visualización">
                {i.favorito ? <Star size={18} className="text-emerald-500" fill="currentColor"/> : <StarOff size={18} className="text-slate-400"/>}
              </div>
            )}
          </td>
          <td className="px-4 py-2.5 text-center" onClick={(e) => e.stopPropagation()}>
            {isOwner ? (
              <button onClick={(e) => { e.stopPropagation(); toggleVisibilidadPlanta(i); }} className="transition-all hover:scale-110">
                {i.visibleEnPlanta ? <Eye size={18} className="text-emerald-500"/> : <EyeOff size={18} className="text-red-500"/>}
              </button>
            ) : (
              <div className="opacity-40 cursor-not-allowed" title="Solo visualización">
                {i.visibleEnPlanta ? <Eye size={18} className="text-emerald-500"/> : <EyeOff size={18} className="text-red-500"/>}
              </div>
            )}
          </td>

          <td className="px-4 py-2.5 text-[10px] font-mono text-slate-500">{i.codigo}</td>
          <td className="px-4 py-2.5">
            <div className="flex flex-col">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-tight">{i.nombre}</span>
              {isOwner && (
                (() => {
                  const ownerStr = i.owner?.toUpperCase().trim() || 'SIN ASIGNAR';
                  if (ownerStr === 'SIN ASIGNAR') {
                     return <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5 opacity-80">SIN ASIGNAR</span>;
                  }
                  const cStyle = obtenerColorOwner ? obtenerColorOwner(ownerStr) : { text: 'text-slate-500', dot: 'bg-slate-400' };
                  return (
                    <span className={`text-[9px] font-black uppercase tracking-widest mt-0.5 flex items-center gap-1 opacity-90 ${cStyle.text}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${cStyle.dot}`}></span>
                      {ownerStr}
                    </span>
                  );
                })()
              )}
            </div>
          </td>
          {mostrarGrupo && (<td className="px-4 py-2.5"><span className="text-[9px] font-bold bg-slate-100 text-slate-500 px-2 py-0.5 rounded uppercase border border-slate-200">{i.grupo}</span></td>)}
          <td className="px-4 py-2.5 text-center text-sm font-bold text-slate-800">{formatoNum(i.stock)}</td>
          <td className="px-4 py-2.5 text-center text-xs font-bold text-blue-600">{i.ocFutura > 0 ? `+${formatoNum(i.ocFutura)}` : '-'}</td>
          <td className="px-4 py-2.5 text-center text-xs font-black text-red-600">{i.ocDemorada > 0 ? `+${formatoNum(i.ocDemorada)}` : '-'}</td>
          <td className="px-4 py-2.5 text-center text-xs font-bold text-purple-600">{i.sp > 0 ? `+${formatoNum(i.sp)}` : '-'}</td>
          <td className="px-4 py-2.5 text-right"><span className={`text-sm font-black ${i.supervivencia <= uUrgencia ? 'text-red-600' : 'text-slate-800'}`}>{i.supervivencia >= 999 ? '∞' : Math.round(i.supervivencia)} <span className="text-[9px] font-bold text-slate-400 uppercase ml-0.5">Días</span></span></td>
          
          <td className="px-4 py-2.5 text-center">
            {i.escalados > 0 ? <span className="bg-orange-500 text-white font-black text-[10px] px-2.5 py-1 rounded shadow-sm border border-orange-600">{i.escalados}</span> : <span className="text-slate-300">-</span>}
          </td>
          
           <td className="px-4 py-2.5 text-center">
            <div className="flex items-center justify-center gap-2">

              {/* ALERTA DE COBERTURA (SIMPLE Y DIRECTA) */}
              {i.alertaActivaEnPlanta || i.alertaPendiente ? (
                // ESTADO: ALERTA ENCENDIDA
                <button 
                  onClick={(e) => { e.stopPropagation(); forzarCancelacionAlerta(i); }} 
                  className="bg-red-50 text-red-700 hover:bg-red-100 text-[10px] font-black px-2.5 py-1.5 rounded-lg border border-red-200 shadow-sm flex items-center gap-1.5 transition-all" 
                  title="Alerta activa - Clic para apagar"
                >
                  <AlertTriangle size={14} className="text-red-500 animate-pulse" /> 
                  RIESGO QUIEBRE
                </button>
              ) : (
                // ESTADO: NORMAL
                <button 
                  onClick={(e) => { e.stopPropagation(); solicitarAlertaPlanta(i); }} 
                  className="text-slate-300 hover:text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition-all" 
                  title="Encender Alerta de Cobertura"
                >
                  <AlertTriangle size={16} />
                </button>
              )}

              {/* BOTÓN DE GESTIÓN (Acceso al historial de reclamos) */}
              <button
                onClick={(e) => { e.stopPropagation(); onGestionar(i); }}
                className="bg-slate-800 text-white text-[10px] font-black px-3 py-1.5 rounded-lg hover:bg-orange-500 transition-all border border-slate-700 shadow-sm flex items-center gap-1 shrink-0 ml-1"
              >
                Gestionar
              </button>

            </div>
          </td>
        </tr>
      ))}</tbody>
    </table></div>
  );
};

export default TablaInsumos;
