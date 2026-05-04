import React, { useState } from 'react';
import { Activity, Search, Send } from 'lucide-react';

const formatoNum = (num) => Number(num).toLocaleString('es-AR');

const VistaProduccion = ({ insumos, currentUser, setActiveInsumo }) => {
  const [searchPlanta, setSearchPlanta] = useState(""); 
  const [verFavoritos, setVerFavoritos] = useState(false); 
  const isTV = currentUser.rol === 'produccion';
  
  const insumosCriticos = insumos.filter(i => { 
      const matchSearch = i.nombre?.toLowerCase().includes(searchPlanta.toLowerCase()) || i.codigo?.toLowerCase().includes(searchPlanta.toLowerCase()); 
      if (!matchSearch) return false; 
      if (isTV) { 
          return i.visibleEnPlanta !== false && i.favorito; 
      } else if (currentUser.rol === 'operario') { 
          if (i.owner?.toUpperCase().trim() !== currentUser.aliasMatch) return false; 
          return verFavoritos ? i.favorito : (i.supervivencia <= 30); 
      } else { 
          return verFavoritos ? i.favorito : (i.supervivencia <= 30); 
      } 
  }).sort((a,b) => a.supervivencia - b.supervivencia);

  return (
    <div className={`p-4 md:p-6 h-full w-full relative flex justify-center ${isTV ? 'bg-slate-950 text-white' : 'bg-transparent text-slate-800'}`}>
      <div className="w-full max-w-full">
        <div className="flex justify-between items-center mb-8"><div className="flex items-center gap-4"><div className={`w-12 h-12 ${isTV ? 'bg-yellow-500 shadow-[0_0_20px_rgba(234,179,8,0.4)]' : 'bg-purple-600 shadow-[0_0_20px_rgba(147,51,234,0.4)]'} rounded-2xl flex items-center justify-center`}><Activity size={24} className={`${isTV ? 'text-slate-900' : 'text-white'} animate-pulse`} /></div><div><h1 className={`text-2xl font-black uppercase tracking-tight leading-none ${isTV ? 'text-white' : 'text-slate-800'}`}>Monitoreo</h1><p className={`text-[10px] font-bold uppercase tracking-widest mt-1 ${isTV ? 'text-yellow-400' : 'text-slate-500'}`}>{isTV ? 'COBERTURA APROXIMADA' : 'Alertas y cobertura Real'}</p></div></div><div className="flex items-center gap-3">
          {!isTV && (<button onClick={() => setVerFavoritos(!verFavoritos)} className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${verFavoritos ? 'bg-orange-500 border-orange-500 text-white shadow-[0_0_15px_rgba(249,115,22,0.4)]' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}>★ Solo Favoritos</button>)}
          <div className="relative w-64 md:w-72">
            <Search size={16} className={`absolute left-4 top-1/2 -translate-y-1/2 ${isTV ? 'text-slate-400' : 'text-slate-400'}`} />
            <input type="text" placeholder="Buscar material..." value={searchPlanta} onChange={e => setSearchPlanta(e.target.value)} className={`w-full pl-12 pr-4 py-2.5 rounded-xl text-xs font-bold outline-none transition-all shadow-sm border ${isTV ? 'bg-slate-900 border-slate-700 text-white placeholder-slate-400 focus:border-yellow-500' : 'bg-white border-slate-200 text-slate-800 placeholder-slate-400 focus:border-purple-500'}`} />
          </div>
        </div></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-6 w-full">{insumosCriticos.map(i => { const isQ = i.supervivencia <= 0; const isC = i.supervivencia > 0 && i.supervivencia <= 15; let cardBg = isTV ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'; if (isQ) cardBg = isTV ? 'bg-red-950/40 border-red-600' : 'bg-red-50 border-red-500'; else if (isC) cardBg = isTV ? 'bg-orange-950/40 border-orange-500' : 'bg-orange-50 border-orange-500'; const titleColor = isTV ? 'text-white' : 'text-slate-800'; const badgeBg = isTV ? 'bg-slate-950 border-slate-800 text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-500'; const labelColor = isTV ? 'text-slate-300' : 'text-slate-400'; const stockColor = isTV ? 'text-white' : 'text-slate-700'; let diasColor = isTV ? 'text-white' : 'text-slate-800'; if (isQ) diasColor = isTV ? 'text-red-500' : 'text-red-600'; else if (isC) diasColor = isTV ? 'text-orange-500' : 'text-orange-600'; return (<div key={i.id} onClick={() => { if(!isTV) setActiveInsumo(i); }} className={`p-5 rounded-2xl border-l-4 shadow-sm flex flex-col justify-between transition-all relative overflow-hidden ${!isTV ? 'cursor-pointer hover:shadow-md hover:-translate-y-1' : ''} ${cardBg}`}>{i.escalados > 0 && (<div className="absolute top-0 right-0 bg-orange-500 text-slate-900 font-black px-3 py-1 rounded-bl-xl text-[10px] uppercase tracking-widest shadow-md flex items-center gap-1.5 z-10"><Send size={10} className="text-slate-900"/> Nivel {i.escalados}</div>)}<div className="mb-4"><div className="flex justify-between items-start mb-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded border ${badgeBg}`}>{i.grupo}</span>
            {i.favorito && !isTV && <span className="text-orange-500 text-[10px]">★</span>}
            {currentUser.rol === 'owner' && verFavoritos && (
              <span className="text-[8px] font-black uppercase tracking-widest bg-sky-50 text-sky-600 border border-sky-200 px-1.5 py-0.5 rounded flex items-center gap-1 shadow-sm">
                👤 {i.owner || "SIN ASIGNAR"}
              </span>
            )}
          </div>
        </div><h3 className={`text-sm font-black uppercase leading-tight line-clamp-2 mt-2 ${titleColor} ${i.escalados > 0 ? 'pr-20' : ''}`}>{i.nombre}</h3><p className={`text-[9px] font-mono mt-1 ${isTV ? 'text-slate-400' : 'text-slate-400'}`}>CÓD: {i.codigo}</p></div><div className={`flex justify-between items-end border-t pt-3 relative z-10 ${isTV ? 'border-slate-800' : 'border-slate-100'}`}><div><p className={`text-[8px] font-bold uppercase mb-0.5 ${labelColor}`}>Stock Físico</p><p className={`text-xl font-black ${stockColor}`}>{formatoNum(i.stock)}</p></div><div className="text-right"><p className={`text-[8px] font-bold uppercase mb-0.5 ${labelColor}`}>Agotado en</p><p className={`text-3xl font-black leading-none ${diasColor}`}>{i.supervivencia === 999 ? '∞' : Math.round(i.supervivencia)} <span className="text-[10px]">días</span></p></div></div></div>);})}</div>{insumosCriticos.length === 0 && (<div className={`text-center py-20 font-black uppercase tracking-widest text-lg ${isTV ? 'text-white' : 'text-slate-400'}`}>No hay insumos críticos para mostrar</div>)}
      </div>
    </div>
  );
};

export default VistaProduccion;