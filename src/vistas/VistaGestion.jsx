import React from 'react';
import { LayoutDashboard, AlertTriangle, Star, Clock, Folder, ArrowLeft, Activity, Bell } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import TablaInsumos from '../componentes/TablaInsumos';

const formatoNum = (num) => Number(num).toLocaleString('es-AR');

const VistaGestion = ({
  currentUser,
  insumos,
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
  renderRadarDinamico
}) => {
  return (
    <div className="p-4 md:p-6 h-full max-w-full">
      {/* CABECERA PRINCIPAL GESTIÓN ERP Y BARRA DE SALUD */}
      <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between mb-8 gap-6">
        <div className="flex items-center gap-4 shrink-0">
          <div className="w-12 h-12 bg-slate-800 rounded-2xl flex items-center justify-center shadow-lg">
            <LayoutDashboard size={24} className="text-orange-500" />
          </div>
          <div>
            <h1 className="text-2xl font-black uppercase text-slate-800 tracking-tight leading-none">Gestión de insumos </h1>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Hola {currentUser.nombre.split(' ')[0]}</p>
          </div>
        </div>

        {/* BARRA DE SALUD OPERATIVA (HEADER) */}
        {(() => {
          const misInsumosDashboard = currentUser.rol === 'owner' ? insumos : insumos.filter(i => i.owner?.toUpperCase().trim() === currentUser.aliasMatch);
          const uCritico = config?.umbralCritico !== undefined ? config.umbralCritico : 0;
          const uUrgencia = config?.umbralUrgencia !== undefined ? config.umbralUrgencia : 15;

          const totalFavs = misInsumosDashboard.filter(i => i.favorito).length;
          if (totalFavs === 0) return null;

          const quiebres = misInsumosDashboard.filter(i => i.favorito && i.supervivencia <= uCritico).length;
          const riesgos = misInsumosDashboard.filter(i => i.favorito && i.supervivencia <= uUrgencia && i.supervivencia > uCritico).length;
          
          const sanos = Math.max(0, totalFavs - quiebres - riesgos);
          const score = totalFavs > 0 ? Math.round((sanos / totalFavs) * 100) : 100;

          let colorClass = "bg-emerald-500"; let bgClass = "bg-emerald-50"; let borderClass = "border-emerald-200"; let textClass = "text-emerald-700";
          let msj = currentUser.rol === 'owner' ? "Operación global impecable." : "Cobertura total de tus FAVORITOS.";

          if (score < 100 && score >= 80) {
            colorClass = "bg-amber-500"; bgClass = "bg-amber-50"; borderClass = "border-amber-200"; textClass = "text-amber-700"; msj = "Frentes que requieren atención.";
          } else if (score < 80) {
            colorClass = "bg-red-500"; bgClass = "bg-red-50"; borderClass = "border-red-200"; textClass = "text-red-700"; msj = "Riesgo de quiebres inminentes.";
          }

          return (
            <div className={`flex-1 w-full max-w-3xl rounded-2xl border ${borderClass} ${bgClass} px-5 py-4 shadow-sm flex items-center gap-6 relative overflow-hidden`}>
              <div className={`absolute -right-10 -top-10 w-32 h-32 rounded-full blur-2xl opacity-20 pointer-events-none ${colorClass}`}></div>
              
              <div className="flex-1 relative z-10">
                <div className="flex justify-between items-end mb-2">
                  <div>
                    <h3 className={`font-black uppercase tracking-tight text-[13px] leading-none ${textClass}`}>{currentUser.rol === 'owner' ? 'Salud Operativa Global - FAVORITOS' : 'Salud Operativa del Inventario -SOLO DE FAVORITOS'}</h3>
                    <p className={`text-[9px] font-bold uppercase tracking-widest opacity-80 mt-1 ${textClass}`}>{msj}</p>
                  </div>
                  <div className="text-right">
                    <span className={`text-2xl font-black leading-none tracking-tighter ${textClass}`}>{score}%</span>
                  </div>
                </div>
                
                <div className="w-full h-3 rounded-full bg-white/60 overflow-hidden relative border border-white/50 shadow-inner">
                  <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'repeating-linear-gradient(45deg, #000, #000 4px, transparent 4px, transparent 8px)' }}></div>
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
          );
        })()}
      </div>

      <AnimatePresence mode="wait">
      {searchTerm !== "" ? (
          <motion.div key="search" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
              <h2 className="text-xl font-black uppercase tracking-tight">Resultados: {searchTerm}</h2>
              {renderRadarDinamico(resultadosBusqueda.filter(i => 
                currentUser.rol === 'owner' || i.owner?.toUpperCase().trim() === currentUser.aliasMatch
              ))}
            </div>
            <TablaInsumos 
              datos={resultadosBusqueda.filter(i => 
                currentUser.rol === 'owner' 
                  ? (filtroResponsable === 'TODOS' ? true : i.owner?.toUpperCase().trim() === filtroResponsable) 
                  : i.owner?.toUpperCase().trim() === currentUser.aliasMatch
              )} 
              config={config} 
              onGestionar={setActiveInsumo} 
              mostrarGrupo={true} 
              toggleFavorito={toggleFavorito} 
              toggleVisibilidadPlanta={toggleVisibilidadPlanta} 
              isOwner={currentUser.rol === 'owner'} 
              canEditFav={currentUser.rol === 'owner' || currentUser.editorFavoritos} 
              obtenerColorOwner={obtenerColorOwner} 
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
                    <button 
                      onClick={() => { setFiltroAlerta(null); setFiltroVistaLista('todos'); }} 
                      className="flex items-center gap-2 text-slate-500 font-bold text-xs uppercase bg-white px-3 py-1.5 rounded-lg border hover:text-orange-500 shadow-sm transition-colors"
                    >
                      <ArrowLeft size={14} /> Volver
                    </button>
                    <h2 className="text-2xl font-black uppercase border-l-2 border-orange-500 pl-4 tracking-tight flex items-center gap-3">
                      {tituloAlerta}
                      <span className="bg-slate-100 border border-slate-200 text-slate-500 text-[14px] font-black px-2.5 py-0.5 rounded-lg shadow-inner">
                        {datosFiltradosAlerta.length}
                      </span>
                    </h2>
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
                />
              </motion.div>
            );
          })()

        ) : !selectedGroup ? (
          <motion.div key="dashboard" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-5 w-full mb-10">
              {(() => {
                const misInsumosDashboard = currentUser.rol === 'owner' ? insumos : insumos.filter(i => i.owner?.toUpperCase().trim() === currentUser.aliasMatch);
                
                const uCritico = config?.umbralCritico !== undefined ? config.umbralCritico : 0;
                const uUrgencia = config?.umbralUrgencia !== undefined ? config.umbralUrgencia : 15;

                const kpiQuiebres = misInsumosDashboard.filter(i => i.favorito && i.supervivencia <= uCritico);
                const kpiFavRiesgo = misInsumosDashboard.filter(i => i.favorito && i.supervivencia <= uUrgencia && i.supervivencia > uCritico);
                const kpiDemoras = misInsumosDashboard.filter(i => i.ocDemorada > 0);
                const kpiMisFavoritos = misInsumosDashboard.filter(i => i.favorito);
                
                // --- NUEVOS KPIs TÁCTICOS ---
                const kpiAlertaPlanta = misInsumosDashboard.filter(i => i.alertaActivaEnPlanta || i.alertaAprobada);
                const kpiEsperando = misInsumosDashboard.filter(i => i.alertaPendiente);
                
                const total = misInsumosDashboard.length || 1;

                return (
                  <>
                    <div onClick={() => setFiltroAlerta('quiebres')} className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-sm cursor-pointer hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <AlertTriangle size={16} className="text-red-500 shrink-0"/>
                          <span className="text-[10px] sm:text-[11px] font-black text-slate-500 uppercase tracking-widest leading-tight">Sin Stock</span>
                        </div>
                      </div>
                      <div className="w-full h-2.5 flex gap-1 mb-4">
                        <div className="h-full rounded-full bg-red-500 transition-all duration-700" style={{ width: `${(kpiQuiebres.length/total)*100}%`, minWidth: kpiQuiebres.length>0?'4px':'0' }}></div>
                        <div className="h-full rounded-full flex-1 opacity-30" style={{ backgroundImage: 'repeating-linear-gradient(45deg, #cbd5e1, #cbd5e1 4px, transparent 4px, transparent 8px)' }}></div>
                      </div>
                      <div className="flex items-end justify-between">
                        <p className="text-2xl sm:text-3xl font-black text-slate-800 leading-none">{kpiQuiebres.length}</p>
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">De {total}</span>
                      </div>
                    </div>
                    
                    <div onClick={() => setFiltroAlerta('favoritos')} className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-sm cursor-pointer hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Star size={16} className="text-orange-500 shrink-0"/>
                          <span className="text-[10px] sm:text-[11px] font-black text-slate-500 uppercase tracking-widest leading-tight">En Riesgo</span>
                        </div>
                      </div>
                      <div className="w-full h-2.5 flex gap-1 mb-4">
                        <div className="h-full rounded-full bg-orange-500 transition-all duration-700" style={{ width: `${(kpiFavRiesgo.length/total)*100}%`, minWidth: kpiFavRiesgo.length>0?'4px':'0' }}></div>
                        <div className="h-full rounded-full flex-1 opacity-30" style={{ backgroundImage: 'repeating-linear-gradient(45deg, #cbd5e1, #cbd5e1 4px, transparent 4px, transparent 8px)' }}></div>
                      </div>
                      <div className="flex items-end justify-between">
                        <p className="text-2xl sm:text-3xl font-black text-slate-800 leading-none">{kpiFavRiesgo.length}</p>
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">De {total}</span>
                      </div>
                    </div>

                    <div onClick={() => setFiltroAlerta('oc_tardia')} className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-sm cursor-pointer hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Clock size={16} className="text-rose-500 shrink-0"/>
                          <span className="text-[10px] sm:text-[11px] font-black text-slate-500 uppercase tracking-widest leading-tight">Demoradas</span>
                        </div>
                      </div>
                      <div className="w-full h-2.5 flex gap-1 mb-4">
                        <div className="h-full rounded-full bg-rose-500 transition-all duration-700" style={{ width: `${(kpiDemoras.length/total)*100}%`, minWidth: kpiDemoras.length>0?'4px':'0' }}></div>
                        <div className="h-full rounded-full flex-1 opacity-30" style={{ backgroundImage: 'repeating-linear-gradient(45deg, #cbd5e1, #cbd5e1 4px, transparent 4px, transparent 8px)' }}></div>
                      </div>
                      <div className="flex items-end justify-between">
                        <p className="text-2xl sm:text-3xl font-black text-slate-800 leading-none">{kpiDemoras.length}</p>
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">De {total}</span>
                      </div>
                    </div>

                    <div onClick={() => setFiltroAlerta('mis_favoritos')} className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-sm cursor-pointer hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Folder size={16} className="text-blue-500 shrink-0"/>
                          <span className="text-[10px] sm:text-[11px] font-black text-slate-500 uppercase tracking-widest leading-tight">Favoritos</span>
                        </div>
                      </div>
                      <div className="w-full h-2.5 flex gap-1 mb-4">
                        <div className="h-full rounded-full bg-blue-500 transition-all duration-700" style={{ width: `${(kpiMisFavoritos.length/total)*100}%`, minWidth: kpiMisFavoritos.length>0?'4px':'0' }}></div>
                        <div className="h-full rounded-full flex-1 opacity-30" style={{ backgroundImage: 'repeating-linear-gradient(45deg, #cbd5e1, #cbd5e1 4px, transparent 4px, transparent 8px)' }}></div>
                      </div>
                      <div className="flex items-end justify-between">
                        <p className="text-2xl sm:text-3xl font-black text-slate-800 leading-none">{kpiMisFavoritos.length}</p>
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">De {total}</span>
                      </div>
                    </div>

                    {/* NUEVO: ALERTA EN PLANTA */}
                    <div onClick={() => setFiltroAlerta('alerta_planta')} className="bg-white rounded-2xl p-4 sm:p-5 border border-purple-200 shadow-sm cursor-pointer hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Activity size={16} className="text-purple-500 shrink-0"/>
                          <span className="text-[10px] sm:text-[11px] font-black text-purple-600 uppercase tracking-widest leading-tight">En Planta</span>
                        </div>
                      </div>
                      <div className="w-full h-2.5 flex gap-1 mb-4">
                        <div className="h-full rounded-full bg-purple-500 transition-all duration-700" style={{ width: `${(kpiAlertaPlanta.length/total)*100}%`, minWidth: kpiAlertaPlanta.length>0?'4px':'0' }}></div>
                        <div className="h-full rounded-full flex-1 opacity-30" style={{ backgroundImage: 'repeating-linear-gradient(45deg, #cbd5e1, #cbd5e1 4px, transparent 4px, transparent 8px)' }}></div>
                      </div>
                      <div className="flex items-end justify-between">
                        <p className="text-2xl sm:text-3xl font-black text-purple-700 leading-none">{kpiAlertaPlanta.length}</p>
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">De {total}</span>
                      </div>
                    </div>

                    {/* NUEVO: ESPERANDO CONFIRMACIÓN */}
                    <div onClick={() => setFiltroAlerta('esperando_aprobacion')} className="bg-white rounded-2xl p-4 sm:p-5 border border-teal-200 shadow-sm cursor-pointer hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Bell size={16} className="text-teal-500 shrink-0"/>
                          <span className="text-[10px] sm:text-[11px] font-black text-teal-600 uppercase tracking-widest leading-tight">Aprobar</span>
                        </div>
                      </div>
                      <div className="w-full h-2.5 flex gap-1 mb-4">
                        <div className="h-full rounded-full bg-teal-500 transition-all duration-700" style={{ width: `${(kpiEsperando.length/total)*100}%`, minWidth: kpiEsperando.length>0?'4px':'0' }}></div>
                        <div className="h-full rounded-full flex-1 opacity-30" style={{ backgroundImage: 'repeating-linear-gradient(45deg, #cbd5e1, #cbd5e1 4px, transparent 4px, transparent 8px)' }}></div>
                      </div>
                      <div className="flex items-end justify-between">
                        <p className="text-2xl sm:text-3xl font-black text-teal-700 leading-none">{kpiEsperando.length}</p>
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">De {total}</span>
                      </div>
                    </div>

                  </>
                );
              })()}
            </div>
            
            {/* DETALLE DE SALUD POR OPERARIO (SOLO ADMIN) */}
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
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 w-full">
                    {operariosStats.map(op => {
                      const cStyle = obtenerColorOwner(op.nombre);
                      let opColorBar = "bg-emerald-500";
                      if (op.score < 100 && op.score >= 80) opColorBar = "bg-amber-500";
                      else if (op.score < 80) opColorBar = "bg-red-500";

                      return (
                        <div key={op.nombre} className="bg-white rounded-xl p-3 border border-slate-200 shadow-sm flex flex-col gap-2 hover:shadow-md transition-shadow">
                          <div className="flex justify-between items-center">
                            <div className={`flex items-center gap-1.5 px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-widest border ${cStyle.bg} ${cStyle.text} ${cStyle.border} truncate max-w-[65%]`}>
                              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${cStyle.dot}`}></span>
                              <span className="truncate">{op.nombre}</span>
                            </div>
                            <span className={`text-sm font-black leading-none tracking-tight ${op.score < 80 ? 'text-red-600' : op.score < 100 ? 'text-amber-600' : 'text-emerald-600'}`}>
                              {op.score}%
                            </span>
                          </div>
                          
                          <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden relative mt-0.5 mb-1">
                            <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'repeating-linear-gradient(45deg, #000, #000 3px, transparent 3px, transparent 6px)' }}></div>
                            <div className={`h-full rounded-full ${opColorBar} relative z-10 transition-all duration-1000`} style={{ width: `${op.score}%` }}></div>
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
                <h2 className="text-lg font-black uppercase tracking-tight">estos son tus Grupos</h2>
                <button onClick={() => setFiltroRiesgoGrupo(!filtroRiesgoGrupo)} className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 transition-all border shadow-sm ${filtroRiesgoGrupo ? 'bg-red-500 text-white border-red-600' : 'bg-white text-red-500 border-red-200 hover:bg-red-50'}`}>
                  <AlertTriangle size={12} /> {filtroRiesgoGrupo ? 'Mostrando Riesgos' : 'Filtrar Riesgos'}
                </button>
              </div>
              {renderRadarDinamico(insumos)}
            </div>
            
            {/* DIRECTORIO NUEVO CON TARJETAS DE ALERTA COLOREADAS */}
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
                  const borderG = scoreG < 80 ? 'border-red-400' : scoreG < 100 ? 'border-orange-400' : 'border-slate-200';
                
                  return (
                    <div key={grupo} onClick={() => setSelectedGroup(grupo)} className={`rounded-2xl p-5 cursor-pointer hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between min-h-[210px] relative group bg-white border-2 ${borderG}`}>
                      <div className={`absolute top-0 left-0 bottom-0 w-1 ${colorG} opacity-70`}></div>
                      <div className="z-10">
                        <div className="flex justify-between items-center mb-1 pl-1">
                         <h3 className="font-black text-2xl uppercase tracking-tighter text-slate-800 truncate pr-4" title={grupo}>{grupo}</h3>
                         <span className={`text-[10px] font-black px-3 py-1.5 rounded-full shadow-sm transition-colors border ${scoreG < 80 ? 'bg-red-50 text-red-700 border-red-200' : scoreG < 100 ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-emerald-50 text-emerald-700 border-emerald-100'}`}>
                           {scoreG}% SALUD
                         </span>
                        </div>
                        <div className="h-[1px] w-full bg-slate-100 mb-5"></div>
                        <div className="flex justify-between items-center gap-4 mb-6 pl-1">
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
                          <div className="flex gap-1.5 shrink-0 items-center">
                            {qG > 0 && <span className="px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase bg-red-100 text-red-600 border border-red-200 shadow-sm animate-pulse">❌ {qG} QUIEBRE</span>}
                            {rG > 0 && <span className="px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase bg-amber-100 text-amber-600 border border-orange-200 shadow-sm">⚠️ {rG} RIESGO</span>}
                          </div>
                        </div>
                      </div>
                      <div className="mb-4 mt-auto pl-1">
                        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden relative border border-slate-50/50">
                          <div className={`h-full rounded-full transition-all duration-1000 ${colorG}`} style={{ width: `${scoreG}%` }}></div>
                        </div>
                      </div>
                      <div className="flex justify-between items-end border-t pt-3 pl-1 border-slate-50">
                        <div className="flex flex-col">
                          <span className="text-[8px] font-black uppercase text-slate-400 tracking-wider">Métricas de Stock</span>
                          <div className="flex items-baseline gap-2 mt-1">
                            <span className="text-xl font-black text-slate-800 leading-none">{itemsDelGrupo.length}</span>
                            <span className="text-[9px] font-bold text-slate-400 uppercase">Ítems Totales</span>
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
                    <button 
                      onClick={() => { setSelectedGroup(null); setFiltroVistaLista('todos'); }} 
                      className="flex items-center gap-2 text-slate-500 font-bold text-xs uppercase bg-white px-3 py-1.5 rounded-lg border hover:text-orange-500 shadow-sm transition-colors"
                    >
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
