import React, { useMemo } from 'react';
import { Star, Clock, ArrowLeft, Package, Activity, MessageSquare, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import TablaInsumos from '../componentes/TablaInsumos';

const formatoNum = (num) => Number(num).toLocaleString('es-AR');

const VistaGestion = ({
  currentUser,
  insumos,
  reclamos,
  config,
  searchTerm,
  resultadosBusqueda,
  filtroAlerta,
  setFiltroAlerta,
  datosAlerta,
  tituloAlerta,
  selectedGroup,
  setSelectedGroup,
  grupos,
  filtroResponsable,
  filtroVistaLista,
  setFiltroVistaLista,
  filtroRiesgoGrupo,
  setFiltroRiesgoGrupo,
  setActiveInsumo,
  toggleFavorito,
  toggleVisibilidadPlanta,
  obtenerColorOwner,
  renderRadarDinamico,
  setSimulatedId,
  perfilesSimulables,
  setVistaActiva,
  archivarInsumo
}) => {
  
  // --- NÚCLEO DE CÁLCULO LOCAL SEGURO Y RADAR ---
  const misInsumosDashboard = useMemo(() => {
    return currentUser.rol === 'owner' ? insumos : insumos.filter(i => i.owner?.toUpperCase().trim() === currentUser.aliasMatch);
  }, [insumos, currentUser]);

  const uUrgencia = config?.umbralUrgencia !== undefined ? config.umbralUrgencia : 15;
  const hace10DiasLocal = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 10);
    return d;
  }, []);

  const parsearFechaLocal = (fRaw) => {
    if (!fRaw) return new Date(2100, 1, 1);
    if (fRaw.seconds) return new Date(fRaw.seconds * 1000);
    if (typeof fRaw === 'string' && fRaw.includes('/')) {
      const p = fRaw.split('/');
      if (p.length === 3) return new Date(p[2], p[1]-1, p[0]);
    }
    return new Date(fRaw);
  };

  // --- ARREGLO DE METRICAS (ÚNICO Y SIN DUPLICADOS) ---
  const kpis = useMemo(() => {
    const favoritos = misInsumosDashboard.filter(i => i.favorito);
    const enRiesgo = misInsumosDashboard.filter(i => i.favorito && i.supervivencia <= uUrgencia);
    const demoras = misInsumosDashboard.filter(i => i.ocDemorada > 0);
    const solpeds = misInsumosDashboard.filter(ins => 
      (ins.detalleSolpeds || []).some(sp => {
        const fechaBase = sp.fechaCreacion || sp.fechaSolicitud || sp.fecha;
        if (!fechaBase) return false;
        return parsearFechaLocal(fechaBase) < hace10DiasLocal;
      })
    );
    const misInsumosIds = misInsumosDashboard.map(i => i.id);
    const abiertos = (reclamos || []).filter(r => r.estado === 'ABIERTO' && r.tipo !== 'AVISO GERENCIA' && misInsumosIds.includes(r.insumoId));

    return {
      favoritos: favoritos.length,
      enRiesgo: enRiesgo.length,
      demoras: demoras.length,
      solpeds: solpeds.length,
      abiertos: abiertos.length
    };
  }, [misInsumosDashboard, uUrgencia, hace10DiasLocal, reclamos]);

  const total = misInsumosDashboard.length || 1;

  return (
    <div className="p-4 md:p-6 h-full max-w-full">
      
      {/* HEADER DE SALUD OPERATIVA (SÓLO SI HAY FAVORITOS) */}
      {(() => {
        if (kpis.favoritos === 0) return null;
        const totalFavs = kpis.favoritos;
        const totalProductos = total;
        const totalGrupos = grupos.length;
        
        const quiebresCount = misInsumosDashboard.filter(i => i.favorito && i.supervivencia <= 0).length;
        const riesgosCount = misInsumosDashboard.filter(i => i.favorito && i.supervivencia <= uUrgencia && i.supervivencia > 0).length;
        const sanosCount = Math.max(0, totalFavs - quiebresCount - riesgosCount);
        const score = Math.round((sanosCount / totalFavs) * 100);

        let colorClass = "bg-emerald-500"; let bgClass = "bg-emerald-50"; let borderClass = "border-emerald-200"; let textClass = "text-emerald-700";
        if (score < 100 && score >= 80) {
          colorClass = "bg-amber-500"; bgClass = "bg-amber-50"; borderClass = "border-amber-200"; textClass = "text-amber-700";
        } else if (score < 80) {
          colorClass = "bg-red-500"; bgClass = "bg-red-50"; borderClass = "border-red-200"; textClass = "text-red-700";
        }

        return (
          <div className="flex flex-col lg:flex-row items-stretch justify-end gap-4 flex-1 w-full xl:w-auto mb-8">
            <div onClick={() => setFiltroAlerta('todos')} className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col justify-center shadow-sm min-w-[320px] hover:shadow-md transition-shadow shrink-0 cursor-pointer group">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Resumen de Inventario</h3>
                <div className="px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest border bg-slate-50 text-slate-500 border-slate-100 shadow-sm">
                  Grupos: {totalGrupos}
                </div>
              </div>
              <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden flex mb-3 border border-slate-50">
                <div style={{ width: `${Math.round((totalFavs / totalProductos) * 100)}%` }} className="h-full bg-orange-400"></div>
              </div>
              <div className="flex items-center justify-between mt-auto">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-orange-400"></div>
                    <span className="text-[10px] font-black text-slate-800">{formatoNum(totalFavs)} <span className="font-bold text-slate-400 uppercase tracking-widest">Favs</span></span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-slate-200"></div>
                    <span className="text-[10px] font-black text-slate-800">{formatoNum(totalProductos - totalFavs)} <span className="font-bold text-slate-400 uppercase tracking-widest">Estándar</span></span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 pl-3 border-l border-slate-100">
                  <Package size={12} className="text-slate-400" />
                  <span className="text-[10px] font-black text-slate-800">{formatoNum(totalProductos)} <span className="font-bold text-slate-400 uppercase tracking-widest">Total</span></span>
                </div>
              </div>
            </div>

            <div className={`w-full max-w-3xl rounded-2xl border ${borderClass} ${bgClass} px-5 py-4 shadow-sm flex items-center gap-6 relative overflow-hidden`}>
              <div className="flex-1 relative z-10">
                 <div className="flex justify-between items-end mb-2">
                  <div>
                    <h3 className={`font-black uppercase tracking-tight text-[13px] leading-none ${textClass}`}>Salud Operativa de Favoritos</h3>
                  </div>
                  <div className="text-right">
                    <span className={`text-2xl font-black leading-none tracking-tighter ${textClass}`}>{score}%</span>
                  </div>
                </div>
                <div className="w-full h-2 rounded-full bg-white/60 overflow-hidden relative shadow-inner">
                  <div className={`h-full rounded-full ${colorClass} transition-all duration-1000`} style={{ width: `${score}%` }}></div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      <AnimatePresence mode="wait">
        {searchTerm !== "" ? (
          <motion.div key="search" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
              <h2 className="text-xl font-black uppercase tracking-tight">Resultados: {searchTerm}</h2>
              {renderRadarDinamico(resultadosBusqueda)}
            </div>
            <TablaInsumos datos={resultadosBusqueda.filter(i => currentUser.rol === 'owner' ? (filtroResponsable === 'TODOS' ? true : i.owner?.toUpperCase().trim() === filtroResponsable) : true)} config={config} onGestionar={setActiveInsumo} mostrarGrupo={true} toggleFavorito={toggleFavorito} toggleVisibilidadPlanta={toggleVisibilidadPlanta} isOwner={currentUser.rol === 'owner'} canEditFav={currentUser.rol === 'owner' || currentUser.editorFavoritos} obtenerColorOwner={obtenerColorOwner} archivarInsumo={archivarInsumo} />
          </motion.div>
        ) : filtroAlerta ? (
          <motion.div key="alerta" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
              <div className="flex items-center gap-4">
                <button onClick={() => { setFiltroAlerta(null); setFiltroVistaLista('todos'); }} className="flex items-center gap-2 text-slate-500 font-bold text-xs uppercase bg-white border px-3 py-1.5 rounded-lg shadow-sm hover:text-orange-500 transition-colors">
                  <ArrowLeft size={14} /> Volver
                </button>
                <h2 className="text-sm font-black text-slate-700 uppercase tracking-wider">{tituloAlerta}</h2>
              </div>
              <div className="flex items-center gap-4">
                {filtroAlerta !== 'favoritos' && (
                  <div className="flex bg-slate-100 p-1.5 rounded-xl border border-slate-200 shadow-inner">
                    <button onClick={() => setFiltroVistaLista('todos')} className={`px-4 py-1.5 text-[10px] font-black uppercase rounded-lg transition-all ${filtroVistaLista === 'todos' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>Todos</button>
                    <button onClick={() => setFiltroVistaLista('favoritos')} className={`px-4 py-1.5 text-[10px] font-black uppercase rounded-lg transition-all flex items-center gap-1 ${filtroVistaLista === 'favoritos' ? 'bg-white text-orange-500 shadow-sm' : 'text-slate-400 hover:text-orange-400'}`}>★ Favs</button>
                  </div>
                )}
                {renderRadarDinamico(datosAlerta)}
              </div>
            </div>
            <TablaInsumos datos={datosAlerta.filter(i => currentUser.rol === 'owner' ? (filtroResponsable === 'TODOS' ? true : i.owner?.toUpperCase().trim() === filtroResponsable) : true).filter(i => filtroVistaLista === 'todos' ? true : i.favorito)} config={config} onGestionar={setActiveInsumo} mostrarGrupo={true} toggleFavorito={toggleFavorito} toggleVisibilidadPlanta={toggleVisibilidadPlanta} isOwner={currentUser.rol === 'owner'} canEditFav={currentUser.rol === 'owner' || currentUser.editorFavoritos} obtenerColorOwner={obtenerColorOwner} archivarInsumo={archivarInsumo} />
          </motion.div>
        ) : !selectedGroup ? (
          <motion.div key="dashboard" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            
            {/* BOTONERA TÁCTICA SUPERIOR EXCLUSIVA EN EL ORDEN SOLICITADO */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-10">
              
              {/* 1. FAVORITOS */}
              <div onClick={() => setFiltroAlerta('favoritos')} className={`p-5 rounded-2xl border cursor-pointer hover:shadow-lg hover:-translate-y-0.5 transition-all bg-white border-slate-200 flex flex-col justify-between min-h-[115px] group`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-black text-yellow-500 uppercase tracking-widest leading-none">Favoritos</span>
                  <div className="p-2 bg-yellow-50 rounded-xl group-hover:scale-110 transition-transform"><Star size={16} className="text-yellow-500 fill-yellow-400"/></div>
                </div>
                <div className="flex items-end justify-between">
                  <p className="text-3xl font-black text-slate-800 leading-none">{kpis.favoritos}</p>
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">De {total}</span>
                </div>
              </div>

              {/* 2. EN RIESGO */}
              <div onClick={() => setFiltroAlerta('riesgo')} className={`p-5 rounded-2xl border cursor-pointer hover:shadow-lg hover:-translate-y-0.5 transition-all bg-white border-slate-200 flex flex-col justify-between min-h-[115px] group`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest leading-none">En Riesgo</span>
                  <div className="p-2 bg-amber-50 rounded-xl group-hover:scale-110 transition-transform"><Activity size={16} className="text-amber-500"/></div>
                </div>
                <div className="flex items-end justify-between">
                  <p className="text-3xl font-black text-slate-800 leading-none">{kpis.enRiesgo}</p>
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Críticos</span>
                </div>
              </div>

              {/* 3. OC DEMORADAS */}
              <div onClick={() => setFiltroAlerta('ocs')} className={`p-5 rounded-2xl border cursor-pointer hover:shadow-lg hover:-translate-y-0.5 transition-all bg-white border-slate-200 flex flex-col justify-between min-h-[115px] group`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-black text-orange-500 uppercase tracking-widest leading-none">OC Demoradas</span>
                  <div className="p-2 bg-orange-50 rounded-xl group-hover:scale-110 transition-transform"><Clock size={16} className="text-orange-500"/></div>
                </div>
                <div className="flex items-end justify-between">
                  <p className="text-3xl font-black text-slate-800 leading-none">{kpis.demoras}</p>
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Atrasadas</span>
                </div>
              </div>

              {/* 4. SOLPEDS SIN O/C */}
              <div onClick={() => setFiltroAlerta('solpeds_viejas')} className={`p-5 rounded-2xl border cursor-pointer hover:shadow-lg hover:-translate-y-0.5 transition-all bg-white border-slate-200 flex flex-col justify-between min-h-[115px] group`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest leading-none">Solpeds s/ OC</span>
                  <div className="p-2 bg-indigo-50 rounded-xl group-hover:scale-110 transition-transform"><MessageSquare size={16} className="text-indigo-500"/></div>
                </div>
                <div className="flex items-end justify-between">
                  <p className="text-3xl font-black text-slate-800 leading-none">{kpis.solpeds}</p>
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">+10 Días</span>
                </div>
              </div>

              {/* 5. TICKETS ABIERTOS */}
              <div onClick={() => setFiltroAlerta('tickets_abiertos')} className={`p-5 rounded-2xl border cursor-pointer hover:shadow-lg hover:-translate-y-0.5 transition-all bg-white border-slate-200 flex flex-col justify-between min-h-[115px] group`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest leading-none">Tickets Abiertos</span>
                  <div className="p-2 bg-blue-50 rounded-xl group-hover:scale-110 transition-transform"><MessageSquare size={16} className="text-blue-500"/></div>
                </div>
                <div className="flex items-end justify-between">
                  <p className="text-3xl font-black text-slate-800 leading-none">{kpis.abiertos}</p>
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Activos</span>
                </div>
              </div>

            </div>

            {/* RADIOGRAFÍA TÁCTICA DEL EQUIPO (SÓLO OWNER VIP) */}
            {currentUser.rol === 'owner' && (() => {
              const operariosStats = [];
              const ownersUnicos = [...new Set(insumos.map(i => i.owner?.toUpperCase().trim() || 'SIN ASIGNAR'))].filter(o => o !== 'SIN ASIGNAR');
              
              ownersUnicos.forEach(op => {
                const insOp = insumos.filter(i => i.owner?.toUpperCase().trim() === op && i.favorito);
                if (insOp.length > 0) {
                  const qOp = insOp.filter(i => i.supervivencia <= 0).length;
                  const rOp = insOp.filter(i => i.supervivencia <= uUrgencia && i.supervivencia > 0).length;
                  const sOp = Math.max(0, insOp.length - qOp - rOp);
                  const scOp = Math.round((sOp / insOp.length) * 100);
                  operariosStats.push({ nombre: op, total: insOp.length, quiebres: qOp, riesgos: rOp, sanos: sOp, score: scOp });
                }
              });
              operariosStats.sort((a,b) => a.score - b.score);
              if (operariosStats.length === 0) return null;

              return (
                <div className="mb-10">
                  <h3 className="text-[10px] font-black uppercase tracking-widest mb-3 text-slate-400">Radiografía Táctica del Equipo</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 w-full">
                    {operariosStats.map(op => {
                      const cStyle = obtenerColorOwner(op.nombre);
                      let opColorBar = "bg-emerald-500";
                      if (op.score < 100 && op.score >= 80) opColorBar = "bg-amber-500";
                      else if (op.score < 80) opColorBar = "bg-red-500";
                      
                      const perfilDestino = perfilesSimulables?.find(p => p.aliasMatch === op.nombre);
                      return (
                        <div key={op.nombre} onClick={() => { if (perfilDestino) setSimulatedId(perfilDestino.id); }} className="bg-white rounded-xl p-3 border border-slate-200 shadow-sm flex flex-col gap-2 hover:-translate-y-0.5 transition-all cursor-pointer">
                          <div className="flex justify-between items-center">
                            <div className={`flex items-center gap-1.5 px-1.5 py-0.5 rounded text-[8px] font-black border ${cStyle.bg} ${cStyle.text} ${cStyle.border} truncate max-w-[65%]`}>
                              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${cStyle.dot}`}></span>
                              <span className="truncate">{op.nombre}</span>
                            </div>
                            <span className={`text-sm font-black ${op.score < 80 ? 'text-red-600' : op.score < 100 ? 'text-amber-600' : 'text-emerald-600'}`}>{op.score}%</span>
                          </div>
                          <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
                            <div className={`h-full ${opColorBar}`} style={{ width: `${op.score}%` }}></div>
                          </div>
                          <div className="flex justify-between items-center text-[8px] font-black text-slate-400 uppercase">
                            <span>{op.sanos}/{op.total} OK</span>
                            {(op.quiebres > 0 || op.riesgos > 0) && <span className="text-red-500 bg-red-50 px-1 py-0.5 rounded">{op.quiebres}Q {op.riesgos}R</span>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            {/* GRILLA DE GRUPOS LOGÍSTICOS */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-4">
              <div className="flex items-center gap-4">
                <h2 className="text-lg font-black uppercase tracking-tight">Tus Grupos</h2>
                <button onClick={() => setFiltroRiesgoGrupo(!filtroRiesgoGrupo)} className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 border shadow-sm ${filtroRiesgoGrupo ? 'bg-red-500 text-white border-red-600' : 'bg-white text-red-500 border-red-200 hover:bg-red-50'}`}>
                  <AlertTriangle size={12} /> {filtroRiesgoGrupo ? 'Mostrando Riesgos' : 'Filtrar Riesgos'}
                </button>
              </div>
              {renderRadarDinamico(insumos)}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 w-full">
              {grupos.filter(g => {
                const items = insumos.filter(i => (i.grupo || 'SIN CLASIFICAR') === g && (currentUser.rol === 'owner' ? true : i.owner?.toUpperCase().trim() === currentUser.aliasMatch));
                if (items.length === 0) return false;
                return filtroRiesgoGrupo ? items.some(i => i.favorito && i.supervivencia <= uUrgency) : true;
              }).map(grupo => {
                const itemsG = insumos.filter(i => (i.grupo || 'SIN CLASIFICAR') === grupo && (currentUser.rol === 'owner' ? true : i.owner?.toUpperCase().trim() === currentUser.aliasMatch));
                const favsG = itemsG.filter(i => i.favorito);
                const qG = favsG.filter(i => i.supervivencia <= 0).length;
                const rG = favsG.filter(i => i.supervivencia <= uUrgencia && i.supervivencia > 0).length;
                const scoreG = favsG.length > 0 ? Math.round(((favsG.length - qG - rG) / favsG.length) * 100) : 100;

                return (
                  <div key={grupo} onClick={() => setSelectedGroup(grupo)} className="bg-white rounded-2xl p-5 border border-slate-200 cursor-pointer hover:shadow-xl hover:-translate-y-0.5 transition-all flex flex-col justify-between min-h-[190px]">
                    <div>
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-black text-xl text-slate-800 uppercase truncate pr-2">{grupo}</h3>
                        <span className={`text-[8px] font-black px-2 py-0.5 rounded border ${scoreG < 80 ? 'bg-red-50 text-red-700 border-red-200' : scoreG < 100 ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>{scoreG}%</span>
                      </div>
                      <div className="flex gap-1 flex-wrap mt-2">
                        {qG > 0 && <span className="bg-red-50 text-red-600 border border-red-100 font-black text-[8px] px-1.5 py-0.5 rounded">{qG} QUIEBRE</span>}
                        {rG > 0 && <span className="bg-amber-50 text-amber-600 border border-amber-100 font-black text-[8px] px-1.5 py-0.5 rounded">{rG} RIESGO</span>}
                      </div>
                    </div>
                    <div className="border-t pt-3 mt-4 flex justify-between items-center text-[9px] font-bold text-slate-400">
                      <span>{itemsG.length} Ítems</span>
                      <span className="text-slate-700 font-black">{favsG.length} Favoritos</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        ) : (
          <motion.div key="grupo-seleccionado" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="flex justify-between items-center mb-6">
              <button onClick={() => { setSelectedGroup(null); setFiltroVistaLista('todos'); }} className="flex items-center gap-2 text-slate-500 font-bold text-xs uppercase bg-white border px-3 py-1.5 rounded-lg shadow-sm hover:text-orange-500 transition-colors">
                <ArrowLeft size={14} /> Volver
              </button>
              <h2 className="text-lg font-black text-slate-800 uppercase tracking-wider">{selectedGroup}</h2>
            </div>
            <TablaInsumos datos={insumos.filter(i => (i.grupo || 'SIN CLASIFICAR') === selectedGroup).filter(i => currentUser.rol === 'owner' ? true : i.owner?.toUpperCase().trim() === currentUser.aliasMatch)} config={config} onGestionar={setActiveInsumo} toggleFavorito={toggleFavorito} toggleVisibilidadPlanta={toggleVisibilidadPlanta} isOwner={currentUser.rol === 'owner'} canEditFav={currentUser.rol === 'owner' || currentUser.editorFavoritos} obtenerColorOwner={obtenerColorOwner} archivarInsumo={archivarInsumo} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default VistaGestion;
