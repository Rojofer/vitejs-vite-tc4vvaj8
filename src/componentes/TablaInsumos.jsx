import React, { useState, useMemo } from 'react';
import { ArrowUpDown, Star, MessageSquare, MoreVertical } from 'lucide-react';

const formatoNum = (num) => Number(num).toLocaleString('es-AR');

const TablaInsumos = ({ datos, onGestionar, mostrarGrupo, toggleFavorito, isOwner, canEditFav, obtenerColorOwner, config, archivarInsumo }) => {
  const [sortConf, setSortConf] = useState({ key: 'supervivencia', dir: 'asc' });
  const [menuActivo, setMenuActivo] = useState(null);

  const handleSort = (key) => setSortConf({ key, dir: sortConf.key === key && sortConf.dir === 'asc' ? 'desc' : 'asc' });
  
  const renderIcon = (key) => sortConf.key === key ? <ArrowUpDown size={10} className={`inline ml-1 ${sortConf.dir === 'asc' ? 'text-slate-800' : 'text-orange-500'}`} /> : <ArrowUpDown size={10} className="inline ml-1 opacity-0 group-hover:opacity-50" />;
  
  const uUrgencia = config?.umbralUrgencia !== undefined ? Number(config.umbralUrgencia) : 15;
  
  const datosFiltrados = useMemo(() => {
    return [...datos].sort((a, b) => {
      let vA = a[sortConf.key]; let vB = b[sortConf.key];
      if (sortConf.key === 'nombre') { vA = vA?.toLowerCase() || ''; vB = vB?.toLowerCase() || ''; }
      if (vA < vB) return sortConf.dir === 'asc' ? -1 : 1; if (vA > vB) return sortConf.dir === 'asc' ? 1 : -1; return 0;
    });
  }, [datos, sortConf]);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 relative overflow-hidden">
      <table className="w-full text-left border-collapse">
        <thead className="sticky top-0 z-40 bg-white border-b border-slate-100 shadow-sm">
          <tr>
            <th className="w-10 px-4 py-3"></th>
            <th className="px-4 py-3 text-xs font-medium text-slate-500 cursor-pointer group hover:text-slate-800 transition-colors" onClick={() => handleSort('codigo')}>Código {renderIcon('codigo')}</th>
            <th className="px-4 py-3 text-xs font-medium text-slate-500 cursor-pointer group hover:text-slate-800 transition-colors" onClick={() => handleSort('nombre')}>Material {renderIcon('nombre')}</th>
            {mostrarGrupo && <th className="px-4 py-3 text-xs font-medium text-slate-500 cursor-pointer group hover:text-slate-800 transition-colors" onClick={() => handleSort('grupo')}>Grupo {renderIcon('grupo')}</th>}
            <th className="px-4 py-3 text-xs font-medium text-slate-500 text-center cursor-pointer group hover:text-slate-800 transition-colors" onClick={() => handleSort('stock')}>Stock {renderIcon('stock')}</th>
            <th className="px-4 py-3 text-xs font-medium text-slate-500 text-center cursor-pointer group hover:text-slate-800 transition-colors" onClick={() => handleSort('ocFutura')}>O/C Futuras {renderIcon('ocFutura')}</th>
            <th className="px-4 py-3 text-xs font-medium text-slate-500 text-center cursor-pointer group hover:text-slate-800 transition-colors" onClick={() => handleSort('ocDemorada')}>Demoras {renderIcon('ocDemorada')}</th>
            <th className="px-4 py-3 text-xs font-medium text-slate-500 text-center cursor-pointer group hover:text-slate-800 transition-colors" onClick={() => handleSort('sp')}>S/P {renderIcon('sp')}</th>
            <th className="px-4 py-3 text-xs font-medium text-slate-500 text-right cursor-pointer group hover:text-slate-800 transition-colors" onClick={() => handleSort('supervivencia')}>Cobertura {renderIcon('supervivencia')}</th>
            <th className="px-4 py-3 text-xs font-medium text-slate-500 text-center cursor-pointer group hover:text-slate-800 transition-colors" onClick={() => handleSort('escalados')}>Escalado {renderIcon('escalados')}</th>
            <th className="px-4 py-3"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {datosFiltrados.map(i => {
            const enRiesgo = i.supervivencia <= uUrgencia;
            return (
              <tr key={i.id} onClick={() => onGestionar(i)} className={`cursor-pointer transition-colors ${enRiesgo ? 'bg-red-50/30 hover:bg-red-50/60' : 'hover:bg-slate-50'}`}>
                
                <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                  <button onClick={(e) => { e.stopPropagation(); if (canEditFav) toggleFavorito(i); }} className={`transition-all ${canEditFav ? 'hover:scale-110' : 'cursor-not-allowed'}`}>
                    <Star size={16} className={i.favorito ? "text-yellow-400" : "text-slate-200 hover:text-slate-300"} fill={i.favorito ? "currentColor" : "none"} />
                  </button>
                </td>

                <td className="px-4 py-3 text-xs font-mono text-slate-400">{i.codigo}</td>
                
                <td className="px-4 py-3">
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-slate-700">{i.nombre}</span>
                      {i.notasInternas && <MessageSquare size={13} className="text-amber-500 shrink-0" title="Ver notas internas" />}
                    </div>
                    {isOwner && (
                      (() => {
                        const ownerStr = i.owner?.toUpperCase().trim() || 'SIN ASIGNAR';
                        if (ownerStr === 'SIN ASIGNAR') return <span className="text-[10px] font-medium text-slate-400 mt-0.5">Sin Asignar</span>;
                        
                        const cStyle = obtenerColorOwner ? obtenerColorOwner(ownerStr) : { text: 'text-slate-500', dot: 'bg-slate-400' };
                        return (
                          <span className={`text-[10px] font-medium mt-0.5 flex items-center gap-1.5 opacity-80 ${cStyle.text}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${cStyle.dot}`}></span>
                            {ownerStr}
                          </span>
                        );
                      })()
                    )}
                  </div>
                </td>
                {mostrarGrupo && (<td className="px-4 py-3"><span className="text-xs text-slate-500 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-100">{i.grupo}</span></td>)}
                <td className="px-4 py-3 text-center text-sm font-medium text-slate-700">{formatoNum(i.stock)}</td>
                
                <td className="px-4 py-3 text-center text-xs font-medium text-sky-400/90">{i.ocFutura > 0 ? `+${formatoNum(i.ocFutura)}` : '-'}</td>
                <td className="px-4 py-3 text-center text-xs font-medium text-rose-400/90">{i.ocDemorada > 0 ? `+${formatoNum(i.ocDemorada)}` : '-'}</td>
                <td className="px-4 py-3 text-center text-xs font-medium text-violet-400/90">{i.sp > 0 ? `+${formatoNum(i.sp)}` : '-'}</td>
                
                <td className="px-4 py-3 text-right">
                  <span className={`text-sm font-semibold ${enRiesgo ? 'text-red-500' : 'text-slate-600'}`}>
                    {i.supervivencia >= 999 ? '∞' : Math.round(i.supervivencia)} <span className="text-xs font-normal text-slate-400 ml-0.5">días</span>
                  </span>
                </td>
                
                <td className="px-4 py-3 text-center">
                  {i.escalados > 0 ? <span className="bg-orange-50 text-orange-500 font-medium text-xs px-2 py-0.5 rounded-md border border-orange-100">{i.escalados}</span> : <span className="text-slate-200">-</span>}
                </td>
                
                <td className="px-4 py-3 text-right relative" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center justify-end gap-2">
                    <button 
                      onClick={(e) => { e.stopPropagation(); onGestionar(i); setMenuActivo(null); }} 
                      className={`text-xs font-medium px-3 py-1.5 rounded-md transition-all border ${
                        enRiesgo 
                          ? 'bg-red-50 text-red-600 border-red-100 hover:bg-red-100 hover:border-red-200 shadow-sm' 
                          : 'bg-transparent text-slate-400 border-transparent hover:text-slate-700 hover:bg-slate-100 hover:border-slate-200'
                      }`}
                    >
                      {enRiesgo ? 'Reclamar' : 'Gestionar'}
                    </button>
                    
                    <div className="relative">
                      <button onClick={(e) => { e.stopPropagation(); setMenuActivo(menuActivo === i.id ? null : i.id); }} className={`p-1.5 rounded-md transition-colors ${menuActivo === i.id ? 'bg-slate-200 text-slate-800' : 'text-slate-400 hover:bg-slate-100'}`}>
                        <MoreVertical size={16} />
                      </button>
                      
                      {menuActivo === i.id && (
                        <div className="absolute right-0 top-full mt-1 w-40 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden py-1">
                          <button onClick={(e) => { e.stopPropagation(); onGestionar(i); setMenuActivo(null); }} className="w-full text-left px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50 transition-colors">
                            Ver / Comentar
                          </button>
                          {isOwner && (
                            <button onClick={(e) => { e.stopPropagation(); archivarInsumo(i.id); setMenuActivo(null); }} className="w-full text-left px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-red-600 hover:bg-red-50 transition-colors">
                              Archivar
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default TablaInsumos;
