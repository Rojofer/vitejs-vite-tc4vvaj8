import React from 'react';
import { AlertTriangle, Star, Clock, ArrowLeft, Package, Activity, MessageSquare } from 'lucide-react';
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
  // LÓGICA DE CÁLCULO LOCAL PARA LOS BOTONES Y TARJETAS
  const misInsumosDashboard = currentUser.rol === 'owner' ? insumos : insumos.filter(i => i.owner?.toUpperCase().trim() === currentUser.aliasMatch);
  
  const uCritico = config?.umbralCritico !== undefined ? config.umbralCritico : 0;
  const uUrgencia = config?.umbralUrgencia !== undefined ? config.umbralUrgencia : 15;

  const kpiQuiebres = misInsumosDashboard.filter(i => i.favorito && i.supervivencia <= uCritico);
  const kpiFavRiesgo = misInsumosDashboard.filter(i => i.favorito && i.supervivencia <= uUrgencia);
  const kpiDemoras = misInsumosDashboard.filter(i => i.ocDemorada > 0);
  
  const hace10DiasLocal = new Date();
  hace10DiasLocal.setDate(new Date().getDate() - 10);
  
  const parsearFechaLocal = (fRaw) => {
    if (!fRaw) return new Date(2100, 1, 1);
    if (fRaw.seconds) return new Date(fRaw.seconds * 1000);
    if (typeof fRaw === 'string' && fRaw.includes('/')) {
      const p = fRaw.split('/');
      if (p.length === 3) return new Date(p[2], p[1]-1, p[0]);
    }
    return new Date(fRaw);
  };
  
  const kpiSolpeds = misInsumosDashboard.filter(ins => 
    (ins.detalleSolpeds || []).some(sp => {
      const fechaBase = sp.fechaCreacion || sp.fechaSolicitud || sp.fecha;
      if (!fechaBase) return false;
      return parsearFechaLocal(fechaBase) < hace10DiasLocal;
    })
  );
  
  const misInsumosIds = misInsumosDashboard.map(i => i.id);
  const kpiReclamosAbiertos = (reclamos || []).filter(r => r.estado === 'ABIERTO' && r.tipo !== 'AVISO GERENCIA' && misInsumosIds.includes(r.insumoId));
  const total = misInsumosDashboard.length || 1;

  return (
    <div className="p-4 md:p-6 h-full max-w-full">
      
      {/* CABECERA PRINCIPAL GESTIÓN ERP Y BARRA DE SALUD */}
      <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between mb-8 gap-6">
        
        {/* BARRA DE SALUD OPERATIVA (HEADER) CON MINI-KPIS */}
        {(() => {
          const totalProductos = misInsumosDashboard.length;
          const totalFavs = misInsumosDashboard.filter(i => i.favorito).length;
          
          const gruposDelUsuario = [...new Set(misInsumosDashboard.map(i => i.grupo || 'SIN CLASIFICAR'))];
          const totalGrupos = gruposDelUsuario.length;
          
          let gruposSanos = totalGrupos;
          let tieneFantasmas = false;
          if (currentUser.rol === 'owner') {
            const gruposConFantasmas = gruposDelUsuario.filter(g => {
              return misInsumosDashboard.some(i => (i.grupo || 'SIN CLASIFICAR') === g && (!i.owner || i.owner.trim() === '' || i.owner.toUpperCase().trim() === 'SIN ASIGNAR'));
            });
            gruposSanos = totalGrupos - gruposConFantasmas.length;
            tieneFantasmas = gruposConFantasmas.length > 0;
          }

          if (totalFavs === 0) return null;
          const quiebres = misInsumosDashboard.filter(i => i.favorito && i.supervivencia <= uCritico).length;
          const riesgos = misInsumosDashboard.filter(i => i.favorito && i.supervivencia <= uUrgencia && i.supervivencia > uCritico).length;
          const sanos = Math.max(0, totalFavs - quiebres - riesgos);
          const score = totalFavs > 0 ? Math.round((sanos / totalFavs) * 100) : 100;

          let colorClass = "bg-emerald-500"; let bgClass = "bg-emerald-50"; let borderClass = "border-emerald-200";
          let textClass = "text-emerald-700";
          let msj = currentUser.rol === 'owner' ? "Operación global impecable." : "Cobertura total de tus FAVORITOS.";
          if (score < 100 && score >= 80) {
            colorClass = "bg-amber-500";
            bgClass = "bg-amber-50"; borderClass = "border-amber-200"; textClass = "text-amber-700"; msj = "Frentes que requieren atención.";
          } else if (score < 80) {
            colorClass = "bg-red-500";
            bgClass = "bg-red-50"; borderClass = "border-red-200"; textClass = "text-red-700"; msj = "Riesgo de quiebres inminentes.";
          }

          return (
            <div className="flex flex-col lg:flex-row items-stretch justify-end gap-4 flex-1 w-full xl:w-auto">
              
              {/* TARJETA UNIFICADA: RESUMEN DE INVENTARIO (SÓLO OWNER) */}
              {currentUser?.rol === 'owner' && (
                <div onClick={() => setFiltroAlerta('todos')} className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col justify-center shadow-sm min-w-[320px] hover:shadow-md transition-shadow shrink-0 cursor-pointer group">
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Resumen de Inventario</h3>
                    <div className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest border ${tieneFantasmas ? 
                      'bg-red-50 text-red-600 border-red-200 animate-pulse' : 'bg-slate-50 text-slate-500 border-slate-100 shadow-sm'}`}>
                      Grupos: {gruposSanos}/{totalGrupos}
                    </div>
                  </div>

                  <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden flex mb-3 border border-slate-50">
                    <div style={{ width: `${totalProductos > 0 ? Math.round((totalFavs / totalProductos) * 100) : 0}%` }} className="h-full bg-orange-400 transition-all duration-500"></div>
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
              )}

              {/* BARRA DE SALUD OPERATIVA */}
              <div className={`w-full max-w-3xl rounded-2xl border ${borderClass} ${bgClass} px-5 py-4 shadow-sm flex items-center gap-6 relative overflow-hidden`}>
                <div className={`absolute -right-10 -top-10 w-32 h-32 rounded-full blur-2xl opacity-20 pointer-events-none ${colorClass}`}></div>
                
                <div className="flex-1 relative z-10">
                   <div className="flex justify-between items-end mb-2">
                    <div>
                      <h3 className={`font-black uppercase tracking-tight text-[13px] leading-none ${textClass}`}>{currentUser.rol === 'owner' ? 'Salud Operativa Global - FAVORITOS' : 'Salud Operativa del Inventario - SOLO DE FAVORITOS'}</h3>
                      <p className={`text-[9px] font-bold uppercase tracking-widest opacity-80 mt-1 ${textClass}`}>{msj}</p>
                    </div>
                    <div className="text-right">
                      <span className={`text-2xl font-black leading-none tracking-tighter ${textClass}`}>{score}%</span>
                    </div>
                  </div>
                  
                  <div className="w-full h-2 rounded-full bg-white/60 overflow-hidden relative shadow-inner">
                    <div className={`h-full rounded-full ${colorClass} transition-all duration-1000 relative z-10`} style={{ width: `${score}%` }}></div>
                  </div>
                </div>
                
                <div className={`hidden sm:flex flex-col gap-1.5 shrink-0 border-l pl-4 relative z-10 ${borderClass}`}>
                  <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-sm bg-emerald-500 shadow-sm"></div>
                      <span className={`text-[9px] font-bold uppercase tracking-widest ${textClass}`}><strong className="font-black">{sanos}</strong> Sanos</span>
                   </div>
                   <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-sm bg-amber-500 shadow-sm"></div>
                      <span className={`text-[9px] font-bold uppercase tracking-widest ${textClass}`}><strong className="font-black">{riesgos}</strong> Riesgo</span>
                   </div>
                   <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-sm bg-red-500 shadow-sm ${quiebres > 0 ? 'animate-pulse' : ''}`}></div>
                      <span className={`text-[9px] font-bold uppercase tracking-widest ${textClass}`}><strong className="font-black">{quiebres}</strong> Quiebres</span>
                   </div>
                </div>
              </div>

            </div>
          );
        })()}
      </div>

      <AnimatePresence mode="wait">
        {searchTerm !== "" ? (
          <motion.div key="search" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
              <h2 className="text-xl font-black uppercase tracking-tight">Resultados: {searchTerm}</h2>
              {renderRadarDinamico(resultadosBusqueda.filter(i => currentUser.rol === 'owner' || i.owner?.toUpperCase().trim() === currentUser.aliasMatch))}
            </div>
            <TablaInsumos 
              datos={resultadosBusqueda.filter(i => currentUser.rol === 'owner' ? (filtroResponsable === 'TODOS' ? true : i.owner?.toUpperCase().trim() === filtroResponsable) : i.owner?.toUpperCase().trim() === currentUser.aliasMatch)} 
              config={config} 
              onGestionar={setActiveInsumo} 
              mostrarGrupo={true} 
              toggleFavorito={toggleFavorito} 
              toggleVisibilidadPlanta={toggleVisibilidadPlanta} 
              isOwner={currentUser.rol === 'owner'} 
              canEditFav={currentUser.rol === 'owner' || currentUser.editorFavoritos} 
              obtenerColorOwner={obtenerColorOwner} 
              archivarInsumo={archivarInsumo}
            />
          </motion.div>

        ) : filtroAlerta ? (
          (() => {
            const datosFiltradosAlerta = datosAlerta
              .filter(i => currentUser.rol === 'owner' ? (filtroResponsable === 'TODOS' ? true : i.owner?.toUpperCase().trim() === filtroResponsable) : true)
              .filter(i => filtroVistaLista === 'todos' ? true : filtroVistaLista === 'favoritos' ? i.favorito : !i.favorito);

            return (
              <motion.div key="alerta" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                  <div className="flex items-center gap-4">
                    <button onClick={() => { setFiltroAlerta(null); setFiltroVistaLista('todos'); }} className="flex items-center gap-2 text-slate-500 font-bold text-xs uppercase bg-white px-3 py-1.5 rounded-lg border hover:text-orange-500 shadow-sm transition-colors">
                      <ArrowLeft size={14} /> Volver
                    </button>
                    <h2 className="text-lg font-medium text-slate-700 tracking-tight">{tituloAlerta}</h2>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    {filtroAlerta !== 'favoritos' && filtroAlerta !== 'mis_favoritos' && (
                      <div className="flex bg-slate-100 p-1.5 rounded-xl border border-slate-200 shadow-inner">
                        <button onClick={() => setFiltroVistaLista('todos')} className={`px-4 py-1.5 text-[10px] font-black uppercase rounded-lg transition-all ${filtroVistaLista === 'todos' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>Todos</button>
                        <button onClick={() => setFiltroVistaLista('favoritos')} className={`px-4 py-1.5 text-[10px] font-black uppercase rounded-lg transition-all flex items-center gap-1 ${filtroVistaLista === 'favoritos' ? 'bg-white text-orange-500 shadow-sm' : 'text-slate-400 hover:text-orange-400'}`}>★ Favs</button>
                        <button onClick={() => setFiltroVistaLista('nofavoritos')} className={`px-4 py-1.5 text-[10px] font-black uppercase rounded-lg transition-all flex items-center gap-1 ${filtroVistaLista === 'nofavoritos' ? 'bg-white text-slate-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>☆ No Favs</button>
                      </div>
                    )}
                    {renderRadarDinamico(datosAlerta)}
                  </div>
                </div>
                
                <TablaInsumos 
                  datos={datosFiltradosAlerta} 
                  config={config} 
                  onGestionar={setActiveInsumo} 
                  mostrarGrupo={true} 
                  toggleFavorito={toggleFavorito} 
                  toggleVisibilidadPlanta={toggleVisibilidadPlanta} 
                  isOwner={currentUser.rol === 'owner'} 
                  canEditFav={currentUser.rol === 'owner' || currentUser.editorFavoritos} 
                  obtenerColorOwner={obtenerColorOwner} 
                  archivarInsumo={archivarInsumo}
                />
              </motion.div>
            );
          })()

        ) : !selectedGroup ? (
          <motion.div key="dashboard" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            
            {/* BOTONERA TÁCTICA DE ALERTAS (NUEVO DISEÑO 4 BOTONES) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <button 
                onClick={() => setFiltroAlerta('quiebres')}
                className={`p-4 rounded-2xl border text-left transition-all bg-white border-slate-100 text-slate-600 hover:border-red-200 group hover:shadow-md`}
              >
                <div className="flex items-center justify-between mb-2">
                  <AlertTriangle size={18} className="text-red-500 group-hover:scale-110 transition-transform" />
                  <span className={`text-xs font-black px-2.5 py-0.5 rounded-full bg-red-50 text-red-600`}>{kpiQuiebres.length}</span>
                </div>
                <p className="text-[10px] font-black uppercase tracking-widest opacity-80">Quiebres</p>
                <p className="text-xs font-black mt-0.5 text-slate-800">Confirmados</p>
              </button>

              <button 
                onClick={() => setFiltroAlerta('riesgo')}
                className={`p-4 rounded-2xl border text-left transition-all bg-white border-slate-100 text-slate-600 hover:border-amber-200 group hover:shadow-md`}
              >
                <div className="flex items-center justify-between mb-2">
                  <Activity size={18} className="text-amber-500 group-hover:scale-110 transition-transform" />
                  <span className={`text-xs font-black px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-600`}>{kpiFavRiesgo.length}</span>
                </div>
                <p className="text-[10px] font-black uppercase tracking-widest opacity-80">En Riesgo</p>
                <p className="text-xs font-black mt-0.5 text-slate-800">Stock Crítico</p>
              </button>

              <button 
                onClick={() => setFiltroAlerta('ocs')}
                className={`p-4 rounded-2xl border text-left transition-all bg-white border-slate-100 text-slate-600 hover:border-orange-200 group hover:shadow-md`}
              >
                <div className="flex items-center justify-between mb-2">
                  <Clock size={18} className="text-orange-500 group-hover:scale-110 transition-transform" />
                  <span className={`text-xs font-black px-2.5 py-0.5 rounded-full bg-orange-50 text-orange-600`}>{kpiDemoras.length}</span>
                </div>
                <p className="text-[10px] font-black uppercase tracking-widest opacity-80">OC Demoradas</p>
                <p className="text-xs font-black mt-0.5 text-slate-800">Aprobadas s/ Recibir</p>
              </button>

              <button 
                onClick={() => setFiltroAlerta('solpeds_viejas')}
                className={`p-4 rounded-2xl border text-left transition-all bg-white border-slate-100 text-slate-600 hover:border-indigo-200 group hover:shadow-md`}
              >
                <div className="flex items-center justify-between mb-2">
                  <MessageSquare size={18} className="text-indigo-500 group-hover:scale-110 transition-transform" />
                  <span className={`text-xs font-black px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-600`}>{kpiSolpeds.length}</span>
                </div>
                <p className="text-[10px] font-black uppercase tracking-widest opacity-80">Solpeds s/ OC</p>
                <p className="text-xs font-black mt-0.5 text-slate-800">Dormidas +10 Días</p>
              </button>
            </div>

            {/* GRILLA DE KPIS DASHBOARD - 5 COLUMNAS SIMÉTRICAS */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-10">
              <div onClick={() => setFiltroAlerta('quiebres')} className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-sm cursor-pointer hover:shadow-lg hover:-translate-y-1 hover:border-red-200 transition-all duration-300 flex flex-col justify-between">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[10px] sm:text-[11px] font-black text-red-500 uppercase tracking-widest leading-tight">Quiebres</span>
                  <div className="p-2 bg-red-50 rounded-xl"><AlertTriangle size={16} className="text-red-500"/></div>
                </div>
                <div className="flex items-end justify-between">
                  <p className="text-3xl font-black text-slate-800 leading-none">{kpiQuiebres.length}</p>
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">De {total}</span>
                </div>
              </div>

              <div onClick={() => setFiltroAlerta('riesgo')} className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-sm cursor-pointer hover:shadow-lg hover:-translate-y-1 hover:border-orange-200 transition-all duration-300 flex flex-col justify-between">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[10px] sm:text-[11px] font-black text-orange-500 uppercase tracking-widest leading-tight">En Riesgo</span>
                  <div className="p-2 bg-orange-50 rounded-xl"><Activity size={16} className="text-orange-500"/></div>
                </div>
                <div className="flex items-end justify-between">
                  <p className="text-3xl font-black text-slate-800 leading-none">{kpiFavRiesgo.length}</p>
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">De {total}</span>
                </div>
              </div>

              <div onClick={() => setFiltroAlerta('ocs')} className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-sm cursor-pointer hover:shadow-lg hover:-translate-y-1 hover:border-rose-200 transition-all duration-300 flex flex-col justify-between">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[10px] sm:text-[11px] font-black text-rose-500 uppercase tracking-widest leading-tight">Demoradas</span>
                  <div className="p-2 bg-rose-50 rounded-xl"><Clock size={16} className="text-rose-500"/></div>
                </div>
                <div className="flex items-end justify-between">
                  <p className="text-3xl font-black text-slate-800 leading-none">{kpiDemoras.length}</p>
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">De {total}</span>
                </div>
              </div>

              <div onClick={() => setFiltroAlerta('solpeds_viejas')} className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-sm cursor-pointer hover:shadow-lg hover:-translate-y-1 hover:border-indigo-200 transition-all duration-300 flex flex-col justify-between">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[10px] sm:text-[11px] font-black text-indigo-500 uppercase tracking-widest leading-tight">Solpeds s/ OC</span>
                  <div className="p-2 bg-indigo-50 rounded-xl"><MessageSquare size={16} className="text-indigo-500"/></div>
                </div>
                <div className="flex items-end justify-between">
                  <p className="text-3xl font-black text-slate-800 leading-none">{kpiSolpeds.length}</p>
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">De {total}</span>
                </div>
              </div>

              <div onClick={() => setVistaActiva('auditoria')} className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-sm cursor-pointer hover:shadow-lg hover:-translate-y-1 hover:border-blue-300 transition-all duration-300 flex flex-col justify-between group">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[10px] sm:text-[11px] font-black text-blue-500 uppercase tracking-widest leading-tight">Tickets Abiertos</span>
                  <div className="p-2 bg-blue-50 rounded-xl"><MessageSquare size={16} className="text-blue-500"/></div>
                </div>
                <div className="flex items-end justify-between">
                  <p className="text-3xl font-black text-slate-800 leading-none">{kpiReclamosAbiertos.length}</p>
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Activos</span>
                </div>
              </div>
            </div>
                        
            {/* DETALLE DE SALUD POR OPERARIO (SOLO ADMIN) - LIMPIADO */}
            {currentUser.rol === 'owner' && (() => {
              const uCritico = config?.umbralCritico !== undefined ? config.umbralCritico : 0;
              const uUrgencia = config?.umbralUrgencia !== undefined ? config.umbralUrgencia : 15;
              
              const operariosStats = [];
              const ownersUnicos = [...new Set(insumos.map(i => i.owner?.toUpperCase().trim() || 'SIN ASIGNAR'))].filter(o => o !== 'SIN ASIGNAR');
              
              ownersUnicos.forEach(op => {
                const insOp = insumos.filter(i => i.owner?.toUpperCase().trim() === op && i.favorito);
                if (insOp.length > 0) {
                  const qOp = insOp.filter(i => i.supervivencia <= uCritico).length;
                  const rOp = insOp.filter(i => i.supervivencia <= uUrgencia && i.supervivencia > uCritico).length;
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
                        <div 
                          key={op.nombre} 
                          onClick={() => {
                            if (perfilDestino && typeof setSimulatedId === 'function') {
                               setSimulatedId(perfilDestino.id);
                            }
                          }}
                          className={`bg-white rounded-xl p-3 border border-slate-200 shadow-sm flex flex-col gap-2 hover:shadow-md transition-all ${perfilDestino ? 'cursor-pointer hover:-translate-y-1 hover:border-orange-300 ring-2 ring-transparent hover:ring-orange-100' : ''}`}
                        >
                          <div className="flex justify-between items-center">
                            <div className={`flex items-center gap-1.5 px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-widest border ${cStyle.bg} ${cStyle.text} ${cStyle.border} truncate max-w-[65%]`}>
                              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${cStyle.dot}`}></span>
                              <span className="truncate">{op.nombre}</span>
                            </div>
                            <span className={`text-sm font-black leading-none tracking-tight ${op.score < 80 ? 'text-red-600' : op.score < 100 ? 'text-amber-600' : 'text-emerald-600'}`}>
                              {op.score}%
                            </span>
                          </div>
                          
                          <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden mt-0.5 mb-1">
                            <div className={`h-full rounded-full ${opColorBar} transition-all duration-1000`} style={{ width: `${op.score}%` }}></div>
                          </div>
                          
                          <div className="flex justify-between items-center text-[8px] font-black uppercase text-slate-400">
                             <span title="Sanos / Total de Favoritos asignados">{op.sanos}/{op.total} OK</span>
                            {(op.quiebres > 0 || op.riesgos > 0) ? (
                              <span className={`${op.quiebres > 0 ? 'text-red-500' : 'text-amber-500'} bg-slate-50 px-1 py-0.5 rounded border border-slate-100`}>
                                {op.quiebres > 0 && `${op.quiebres}Q `}{op.riesgos > 0 && `${op.riesgos}R`}
                              </span>
                            ) : (
                              <span className="text-emerald-500">Perfecto</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-4">
              <div className="flex items-center gap-4">
                <h2 className="text-lg font-black uppercase tracking-tight">Tus Grupos</h2>
                <button onClick={() => setFiltroRiesgoGrupo(!filtroRiesgoGrupo)} className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 transition-all border shadow-sm ${filtroRiesgoGrupo ? 'bg-red-500 text-white border-red-600' : 'bg-white text-red-500 border-red-200 hover:bg-red-50'}`}>
                  <AlertTriangle size={12} /> {filtroRiesgoGrupo ? 'Mostrando Riesgos' : 'Filtrar Riesgos'}
                </button>
              </div>
              {renderRadarDinamico(insumos)}
            </div>
            
            {/* DIRECTORIO DE GRUPOS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 w-full">
              {(() => {
                let gruposAMostrar = grupos;
                if (currentUser.rol !== 'owner') {
                  const misGrupos = [...new Set(insumos.filter(i => i.owner?.toUpperCase().trim() === currentUser.aliasMatch).map(i => i.grupo || 'SIN CLASIFICAR'))];
                   gruposAMostrar = grupos.filter(g => misGrupos.includes(g));
                } else if (filtroResponsable !== 'TODOS') {
                  const gruposDelFiltro = [...new Set(insumos.filter(i => i.owner?.toUpperCase().trim() === filtroResponsable).map(i => i.grupo || 'SIN CLASIFICAR'))];
                  gruposAMostrar = grupos.filter(g => gruposDelFiltro.includes(g));
                }

                if (filtroRiesgoGrupo) {
                  const uUrgencia = config?.umbralUrgencia !== undefined ? config.umbralUrgencia : 15;
                  gruposAMostrar = gruposAMostrar.filter(g => {
                    const items = insumos.filter(i => (i.grupo || 'SIN CLASIFICAR') === g && (currentUser.rol === 'owner' ? true : i.owner?.toUpperCase().trim() === currentUser.aliasMatch));
                    return items.some(i => i.favorito && i.supervivencia <= uUrgencia);
                  });
                }

                return gruposAMostrar.map(grupo => { 
                  const itemsDelGrupo = currentUser.rol === 'owner' 
                    ? insumos.filter(i => (i.grupo || 'SIN CLASIFICAR') === grupo)
                    : insumos.filter(i => (i.grupo || 'SIN CLASIFICAR') === grupo && i.owner?.toUpperCase().trim() === currentUser.aliasMatch);
                
                  if (itemsDelGrupo.length === 0) return null; 
                
                  const responsablesUnicos = [...new Set(itemsDelGrupo.map(i => i.owner?.toUpperCase().trim() || "SIN ASIGNAR"))];
                  const favsDelGrupo = itemsDelGrupo.filter(i => i.favorito);
                  const uCritico = config?.umbralCritico || 0;
                  const uUrgencia = config?.umbralUrgencia || 15;
                  const qG = favsDelGrupo.filter(i => i.supervivencia <= uCritico).length;
                  const rG = favsDelGrupo.filter(i => i.supervivencia <= uUrgencia && i.supervivencia > uCritico).length;
                  const sG = Math.max(0, favsDelGrupo.length - qG - rG);
                  const scoreG = favsDelGrupo.length > 0 ? Math.round((sG / favsDelGrupo.length) * 100) : 100;
                  const colorG = scoreG < 80 ? 'bg-red-500' : scoreG < 100 ? 'bg-amber-500' : 'bg-emerald-500';
                  
                  return (
                    <div key={grupo} onClick={() => setSelectedGroup(grupo)} className="bg-white rounded-2xl p-5 cursor-pointer hover:shadow-xl hover:-translate-y-1 hover:border-slate-300 transition-all duration-300 flex flex-col justify-between min-h-[210px] relative border border-slate-200 group">
                      <div className="z-10">
                        <div className="flex justify-between items-center mb-1">
                          <h3 className="font-black text-2xl uppercase tracking-tighter text-slate-800 truncate pr-4" title={grupo}>{grupo}</h3>
                         <span className={`text-[9px] font-black px-2.5 py-1 rounded shadow-sm transition-colors border ${scoreG < 80 ? 'bg-red-50 text-red-700 border-red-200' : scoreG < 100 ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-emerald-50 text-emerald-700 border-emerald-100'}`}>
                           {scoreG}% SALUD
                         </span>
                        </div>
                        <div className="h-[1px] w-full bg-slate-100 mb-5"></div>
                        <div className="flex justify-between items-center gap-4 mb-6">
                          <div className="flex flex-wrap gap-2 flex-1">
                            {currentUser.rol === 'owner' && responsablesUnicos.map(resp => {
                              const cStyle = obtenerColorOwner(resp);
                              return (
                                <div key={resp} className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border shadow-sm ${cStyle.bg} ${cStyle.text} ${cStyle.border}`}>
                                  <span className={`w-2 h-2 rounded-full shrink-0 ${cStyle.dot}`}></span>
                                  {resp}
                                </div>
                              );
                            })}
                          </div>
                          <div className="flex gap-1.5 shrink-0 items-center flex-col">
                            {qG > 0 && <span className="px-2 py-1 rounded-md text-[8px] font-black uppercase bg-red-50 text-red-600 border border-red-200 shadow-sm animate-pulse w-full text-center">{qG} QUIEBRE</span>}
                            {rG > 0 && <span className="px-2 py-1 rounded-md text-[8px] font-black uppercase bg-amber-50 text-amber-600 border border-orange-200 shadow-sm w-full text-center">{rG} RIESGO</span>}
                          </div>
                        </div>
                      </div>
                      <div className="mb-4 mt-auto">
                        <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden relative">
                          <div className={`h-full rounded-full transition-all duration-1000 ${colorG}`} style={{ width: `${scoreG}%` }}></div>
                        </div>
                      </div>
                      <div className="flex justify-between items-end border-t pt-3 border-slate-50">
                         <div className="flex flex-col">
                          <span className="text-[8px] font-black uppercase text-slate-400 tracking-wider">Métricas de Stock</span>
                          <div className="flex items-baseline gap-2 mt-1">
                            <span className="text-xl font-black text-slate-800 leading-none">{itemsDelGrupo.length}</span>
                            <span className="text-[9px] font-bold text-slate-400 uppercase">Ítems</span>
                          </div>
                        </div>
                        <div className="flex flex-col text-right">
                          <span className="text-[8px] font-black uppercase text-slate-400 tracking-wider">Prioridad</span>
                          <div className="flex items-baseline justify-end gap-2 mt-1">
                            <span className="text-[9px] font-bold text-slate-400 uppercase">Favoritos</span>
                            <span className={`text-xl font-black leading-none ${scoreG < 100 ? 'text-orange-600' : 'text-emerald-600'}`}>{favsDelGrupo.length}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ); 
                });
              })()}
            </div>
          </motion.div>
        ) : (
          (() => {
            const datosFiltradosGrupo = insumos
              .filter(i => (i.grupo || 'SIN CLASIFICAR') === selectedGroup)
              .filter(i => currentUser.rol === 'owner' ? true : i.owner?.toUpperCase().trim() === currentUser.aliasMatch)
              .filter(i => filtroVistaLista === 'todos' ? true : filtroVistaLista === 'favoritos' ? i.favorito : !i.favorito);

            return (
              <motion.div key="tabla-grupo" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                  <div className="flex items-center gap-4">
                    <button onClick={() => { setSelectedGroup(null); setFiltroVistaLista('todos'); }} className="flex items-center gap-2 text-slate-500 font-bold text-xs uppercase bg-white px-3 py-1.5 rounded-lg border hover:text-orange-500 shadow-sm transition-colors">
                      <ArrowLeft size={14} /> Volver
                    </button>
                    <h2 className="text-2xl font-black uppercase border-l-2 border-orange-500 pl-4 tracking-tight flex items-center gap-3">
                      {selectedGroup}
                      <span className="bg-slate-100 border border-slate-200 text-slate-500 text-[14px] font-black px-2.5 py-0.5 rounded-lg shadow-inner">
                        {datosFiltradosGrupo.length}
                      </span>
                    </h2>
                  </div>
                  
                  <div className="flex bg-slate-100 p-1.5 rounded-xl border border-slate-200 shadow-inner">
                    <button onClick={() => setFiltroVistaLista('todos')} className={`px-4 py-1.5 text-[10px] font-black uppercase rounded-lg transition-all ${filtroVistaLista === 'todos' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>Todos</button>
                    <button onClick={() => setFiltroVistaLista('favoritos')} className={`px-4 py-1.5 text-[10px] font-black uppercase rounded-lg transition-all flex items-center gap-1 ${filtroVistaLista === 'favoritos' ? 'bg-white text-orange-500 shadow-sm' : 'text-slate-400 hover:text-orange-400'}`}>★ Favs</button>
                    <button onClick={() => setFiltroVistaLista('nofavoritos')} className={`px-4 py-1.5 text-[10px] font-black uppercase rounded-lg transition-all flex items-center gap-1 ${filtroVistaLista === 'nofavoritos' ? 'bg-white text-slate-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>☆ No Favs</button>
                  </div>
                </div>
                
                <TablaInsumos 
                  datos={datosFiltradosGrupo} 
                  config={config} 
                  onGestionar={setActiveInsumo} 
                  toggleFavorito={toggleFavorito} 
                  toggleVisibilidadPlanta={toggleVisibilidadPlanta} 
                  isOwner={currentUser.rol === 'owner'} 
                  canEditFav={currentUser.rol === 'owner' || currentUser.editorFavoritos} 
                  obtenerColorOwner={obtenerColorOwner} 
                  archivarInsumo={archivarInsumo}
                />
              </motion.div>
            );
          })()
        )}
      </AnimatePresence>
    </div>
  );
};

export default VistaGestion;
