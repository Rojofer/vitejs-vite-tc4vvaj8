import React, { useState, useMemo } from 'react';
import { AlertTriangle, Star, Clock, ArrowLeft, Package, Activity, MessageSquare, CheckSquare, ChevronDown, ChevronUp, FileText, ListFilter, CheckCircle } from 'lucide-react';
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
  archivarInsumo,
  abrirRedactorReclamo
}) => {

  // --- ESTADOS PARA LA VISTA AGRUPADA (NUEVO) ---
  const [tipoVistaTabla, setTipoVistaTabla] = useState('insumos'); 
  const [docsExpandidos, setDocsExpandidos] = useState({});
  const [seleccionadosPorDoc, setSeleccionadosPorDoc] = useState({});

  // --- MOTOR INTELIGENTE DE AGRUPACIÓN (CORREGIDO) ---
  const agruparPorDocumento = (datosBase) => {
    const mapa = {};

    datosBase.forEach(ins => {
      let tieneDoc = false;

      // 1. Desarmar y agrupar por Órdenes de Compra (OC)
      if (ins.detalleOCs && ins.detalleOCs.length > 0) {
        ins.detalleOCs.forEach(oc => {
          const num = oc.numero || 'S/N';
          const estadoOC = String(oc.estado || '').toUpperCase();
          const esPendiente = estadoOC.includes('PROCESO') || estadoOC.includes('AUTORIZAC') || estadoOC.includes('PENDIENTE');
          const docTipo = esPendiente ? 'OC A FIRMAR' : 'OC';
          const idAgrupacion = `${docTipo}_${num}`;

          if (!mapa[idAgrupacion]) {
             mapa[idAgrupacion] = { id: idAgrupacion, tipo: docTipo, numero: num, proveedor: oc.proveedor || ins.proveedor || 'S/P', items: [] };
          }
          // Evitamos duplicados si la base datos tiene ruido, y le inyectamos el numeroOC temporal para que App.jsx lo lea en el asunto del mail
          if (!mapa[idAgrupacion].items.some(i => i.id === ins.id)) {
             mapa[idAgrupacion].items.push({ ...ins, consumoMensual: Math.round(Number(ins.consumoPromedio) || 0), numeroOC: num });
          }
          tieneDoc = true;
        });
      }

      // 2. Desarmar y agrupar por Solpeds
      if (ins.detalleSolpeds && ins.detalleSolpeds.length > 0) {
        ins.detalleSolpeds.forEach(sp => {
          const num = sp.numero || 'S/N';
          const idAgrupacion = `SOL_${num}`;

          if (!mapa[idAgrupacion]) {
             mapa[idAgrupacion] = { id: idAgrupacion, tipo: 'SOLPED', numero: num, proveedor: 'INTERNO', items: [] };
          }
          if (!mapa[idAgrupacion].items.some(i => i.id === ins.id)) {
             mapa[idAgrupacion].items.push({ ...ins, consumoMensual: Math.round(Number(ins.consumoPromedio) || 0), numeroSolped: num });
          }
          tieneDoc = true;
        });
      }

      // 3. Los materiales que realmente están huérfanos sin ningún documento
      if (!tieneDoc) {
        const idAgrupacion = 'SIN_DOC';
        if (!mapa[idAgrupacion]) {
           mapa[idAgrupacion] = { id: idAgrupacion, tipo: 'SIN DOCUMENTO', numero: 'S/P', proveedor: ins.proveedor || 'S/P', items: [] };
        }
        mapa[idAgrupacion].items.push({ ...ins, consumoMensual: Math.round(Number(ins.consumoPromedio) || 0) });
      }
    });

    // FILTRO CORPORATIVO: Dejamos solo los documentos con más de 1 insumo (las OCs individuales se ven en la lista general)
    const documentosAgrupados = Object.values(mapa).filter(doc => doc.tipo === 'SIN DOCUMENTO' || doc.items.length > 1);

    // Ordenamos para que las OCs y Solpeds queden arriba, y los 'SIN DOCUMENTO' abajo
    return documentosAgrupados.sort((a, b) => {
      if (a.tipo === 'SIN DOCUMENTO') return 1;
      if (b.tipo === 'SIN DOCUMENTO') return -1;
      return a.id.localeCompare(b.id);
    });
  };

  const toggleExpandirDoc = (id) => setDocsExpandidos(prev => ({ ...prev, [id]: !prev[id] }));
  const toggleSeleccionItem = (docId, itemId) => {
    setSeleccionadosPorDoc(prev => {
      const actuales = prev[docId] || [];
      if (actuales.includes(itemId)) return { ...prev, [docId]: actuales.filter(id => id !== itemId) };
      return { ...prev, [docId]: [...actuales, itemId] };
    });
  };
  
  const obtenerSeleccionadosIniciales = (doc) => {
    if (seleccionadosPorDoc[doc.id] !== undefined) return seleccionadosPorDoc[doc.id];
    const umbral = config?.umbralUrgencia !== undefined ? config.umbralUrgencia : 30;
    return doc.items.filter(i => i.favorito && i.escalados === 0 && Math.round(i.supervivencia) <= umbral).map(i => i.id);
  };

  // --- COMPONENTE RENDERIZADOR HÍBRIDO ---
  const renderTablaHibrida = (datosRender) => {
    if (tipoVistaTabla === 'insumos') {
      return (
        <TablaInsumos 
          datos={datosRender} config={config} onGestionar={setActiveInsumo} mostrarGrupo={true} toggleFavorito={toggleFavorito} 
          toggleVisibilidadPlanta={toggleVisibilidadPlanta} isOwner={currentUser.rol === 'owner'} 
          canEditFav={currentUser.rol === 'owner' || currentUser.editorFavoritos} obtenerColorOwner={obtenerColorOwner} archivarInsumo={archivarInsumo}
        />
      );
    }

    const documentos = agruparPorDocumento(datosRender);
    const umbral = config?.umbralUrgencia !== undefined ? config.umbralUrgencia : 30;

    return (
      <div className="p-4 space-y-4 max-w-full overflow-x-auto bg-slate-50/50 rounded-b-2xl border-t border-slate-200 mt-4">
        {documentos.map((doc) => {
          const itemsSeleccionados = obtenerSeleccionadosIniciales(doc);
          const estaExpandido = !!docsExpandidos[doc.id];
          return (
            <div key={doc.id} className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-sm transition-all duration-300">
              <div className="bg-slate-50 p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100">
                <div className="flex items-center gap-3 cursor-pointer select-none" onClick={() => toggleExpandirDoc(doc.id)}>
                  <div className="p-2 bg-white border border-slate-200 rounded-xl text-slate-600 shadow-sm flex items-center justify-center w-8 h-8">
                    <span className="font-black text-[10px]">{estaExpandido ? '▲' : '▼'}</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded ${doc.tipo === 'OC' ? 'bg-sky-100 text-sky-800' : doc.tipo === 'OC A FIRMAR' ? 'bg-cyan-100 text-cyan-800' : doc.tipo === 'SOLPED' ? 'bg-indigo-100 text-indigo-800' : 'bg-slate-100 text-slate-500 border border-slate-200 shadow-sm'}`}>{doc.tipo}</span>
                      <span className="font-black text-sm text-slate-800 tracking-tight">{doc.numero || 'PENDIENTE'}</span>
                    </div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">PROVEEDOR: <span className="text-slate-600">{doc.proveedor}</span></p>
                  </div>
                </div>
                {itemsSeleccionados.length > 0 && (
                  <button onClick={() => {
                      const itemsCompletos = doc.items.filter(i => itemsSeleccionados.includes(i.id));
                      if (itemsCompletos.length > 0 && typeof abrirRedactorReclamo === 'function') {
                          // Se inyecta el proveedor al contexto
                          abrirRedactorReclamo(itemsCompletos, { numero: doc.numero, tipo: doc.tipo, proveedor: doc.proveedor });
                      }
                    }}
                    className={`w-full sm:w-auto text-white font-black uppercase text-[10px] tracking-widest px-4 py-2.5 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 ${
                      itemsSeleccionados.length > 1
                        ? 'bg-indigo-600 hover:bg-indigo-700 shadow-[0_4px_15px_rgba(79,70,229,0.4)] ring-2 ring-indigo-200/50 scale-105'
                        : 'bg-red-500 hover:bg-red-600 shadow-red-500/20'
                    }`}
                  >
                    <MessageSquare size={14}/> Reclamar {itemsSeleccionados.length} Sel.
                  </button>
                )}
              </div>
              <AnimatePresence initial={false}>
                {estaExpandido && (
                  <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden bg-white">
                    <table className="w-full text-left border-collapse min-w-[700px]">
                      <thead>
                        <tr className="border-b border-slate-100 bg-slate-50/50 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                          <th className="py-3 px-4 w-12 text-center">Sel.</th>
                          <th className="py-3 px-4 w-32">Código</th>
                          <th className="py-3 px-4">Insumo</th>
                          <th className="py-3 px-4 text-center w-24">Stock</th>
                          <th className="py-3 px-4 text-center w-28">Consumo</th>
                          <th className="py-3 px-4 text-center w-24">Cobertura</th>
                          <th className="py-3 px-4 text-center w-28">Demorado</th>
                          <th className="py-3 px-4 text-center w-32">Ticket</th>
                        </tr>
                      </thead>
                      <tbody>
                        {doc.items.map((ins) => {
                          const estaTildado = itemsSeleccionados.includes(ins.id);
                          const tieneTicketAbierto = ins.escalados > 0;
                          let colorSemaforo = "text-emerald-600 bg-emerald-50 border-emerald-100";
                          if (Math.round(ins.supervivencia) <= (config?.umbralCritico || 0)) colorSemaforo = "text-red-600 bg-red-50 border-red-100";
                          else if (Math.round(ins.supervivencia) <= umbral) colorSemaforo = "text-amber-600 bg-amber-50 border-amber-100";

                          // MAGIA NUEVA: Calcular la deuda atrasada EXCLUSIVA de este documento
                          let cantAtrasadaDoc = 0;
                          const hoyTabla = new Date(); hoyTabla.setHours(0,0,0,0);
                          
                          if (doc.tipo.includes('OC') && ins.detalleOCs) {
                              ins.detalleOCs.filter(o => String(o.numero) === String(doc.numero)).forEach(oc => {
                                  const fRaw = oc.fecha;
                                  if (fRaw) {
                                      let f = fRaw.seconds ? new Date(fRaw.seconds * 1000) : new Date(fRaw);
                                      f.setHours(0,0,0,0);
                                      if (f < hoyTabla) cantAtrasadaDoc += (Number(oc.cantidad) || 0);
                                  }
                              });
                          } else if (doc.tipo.includes('SOLPED') && ins.detalleSolpeds) {
                              ins.detalleSolpeds.filter(s => String(s.numero) === String(doc.numero)).forEach(sp => {
                                  const fRaw = sp.fechaCreacion || sp.fechaSolicitud || sp.fecha;
                                  if (fRaw) {
                                      let f = fRaw.seconds ? new Date(fRaw.seconds * 1000) : new Date(fRaw);
                                      f.setHours(0,0,0,0);
                                      if (f < hoyTabla) cantAtrasadaDoc += (Number(sp.cantidad) || 0);
                                  }
                              });
                          }

                          return (
                            <tr key={ins.id} className="border-b border-slate-100 hover:bg-slate-50/70 transition-colors cursor-pointer group">
                              <td className="py-3 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                                <input type="checkbox" disabled={tieneTicketAbierto} checked={estaTildado} onChange={() => toggleSeleccionItem(doc.id, ins.id)} className="w-4 h-4 text-red-500 border-slate-300 rounded focus:ring-red-400 disabled:opacity-30 disabled:cursor-not-allowed" />
                              </td>
                              <td className="py-3 px-4 font-bold text-xs text-slate-700" onClick={() => setActiveInsumo(ins)}>{ins.codigo}</td>
                              <td className="py-3 px-4" onClick={() => setActiveInsumo(ins)}>
                                <div className="flex flex-col">
                                  <span className="font-black text-xs text-slate-800 uppercase tracking-tight group-hover:text-orange-500 transition-colors">{ins.nombre}</span>
                                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">Resp: {ins.owner || 'S/A'}</span>
                                </div>
                              </td>
                              <td className="py-3 px-4 text-center font-bold text-xs text-slate-600" onClick={() => setActiveInsumo(ins)}>{formatoNum(ins.stockActual || 0)}</td>
                              <td className="py-3 px-4 text-center font-black text-xs text-slate-700" onClick={() => setActiveInsumo(ins)}>{formatoNum(ins.consumoMensual || 0)}</td>
                              <td className="py-3 px-4 text-center" onClick={() => setActiveInsumo(ins)}>
                                <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-black uppercase border ${colorSemaforo}`}>
                                  {Math.round(ins.supervivencia) > 998 ? '999+' : Math.round(ins.supervivencia)} D
                                </span>
                              </td>
                              
                              {/* NUEVA CELDA: COLUMNA DEMORADO */}
                              <td className="py-3 px-4 text-center font-black text-xs" onClick={() => setActiveInsumo(ins)}>
                                {cantAtrasadaDoc > 0 ? (
                                  <span className="text-red-600 bg-red-50 px-2 py-1 rounded border border-red-100">{formatoNum(cantAtrasadaDoc)}</span>
                                ) : (
                                  <span className="text-slate-300">0</span>
                                )}
                              </td>

                              <td className="py-3 px-4 text-center" onClick={() => setActiveInsumo(ins)}>
                                {tieneTicketAbierto ? <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-amber-100 text-amber-800 border border-amber-200">🔒 {ins.ticketReclamo || 'Gestión'}</span> : <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Limpio</span>}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
        {documentos.length === 0 && (
          <div className="text-center py-10 bg-white border border-slate-200 border-dashed rounded-2xl">
            <p className="text-slate-500 font-bold text-sm uppercase tracking-wider">No hay documentos en esta vista</p>
          </div>
        )}
      </div>
    );
  };

  // Switcher visual para usar al lado de los títulos
  const InterruptorVista = () => (
    <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 shadow-inner ml-4 shrink-0">
      <button onClick={() => setTipoVistaTabla('insumos')} className={`px-3 py-1.5 text-[10px] font-black uppercase rounded-lg transition-all ${tipoVistaTabla === 'insumos' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>Lista Insumos</button>
      <button onClick={() => setTipoVistaTabla('documentos')} className={`px-3 py-1.5 text-[10px] font-black uppercase rounded-lg transition-all ${tipoVistaTabla === 'documentos' ? 'bg-white text-orange-500 shadow-sm' : 'text-slate-400 hover:text-orange-400'}`}>Por Documento</button>
    </div>
  );

  return (
    <div className="p-4 md:p-6 h-full max-w-full">
      
      {/* CABECERA PRINCIPAL GESTIÓN ERP Y BARRA DE SALUD */}
      <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between mb-8 gap-6">
        
        {/* BARRA DE SALUD OPERATIVA (HEADER) CON MINI-KPIS */}
        {(() => {
          const misInsumosDashboard = currentUser.rol === 'owner' ? insumos : insumos.filter(i => i.owner?.toUpperCase().trim() === currentUser.aliasMatch);
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

          const uCritico = config?.umbralCritico !== undefined ? config.umbralCritico : 0;
          const uUrgencia = config?.umbralUrgencia !== undefined ? config.umbralUrgencia : 15;

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
              <div className="flex items-center">
                <h2 className="text-xl font-black uppercase tracking-tight">Resultados: {searchTerm}</h2>
                <InterruptorVista />
              </div>
              {renderRadarDinamico(resultadosBusqueda.filter(i => currentUser.rol === 'owner' || i.owner?.toUpperCase().trim() === currentUser.aliasMatch))}
            </div>

            {renderTablaHibrida(resultadosBusqueda.filter(i => currentUser.rol === 'owner' ? (filtroResponsable === 'TODOS' ? true : i.owner?.toUpperCase().trim() === filtroResponsable) : i.owner?.toUpperCase().trim() === currentUser.aliasMatch))}
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
                    <div className="flex items-center">
                      <h2 className="text-lg font-medium text-slate-700 tracking-tight">{tituloAlerta}</h2>
                      <InterruptorVista />
                    </div>
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
                
                {renderTablaHibrida(datosFiltradosAlerta)}
              </motion.div>
            );
          })()

        ) : !selectedGroup ? (
          <motion.div key="dashboard" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            
            {/* GRILLA DE KPIS - AJUSTADA PARA 7 TARJETAS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-7 gap-3 mb-6">
              {(() => {
                const misInsumosDashboard = currentUser.rol === 'owner' ? insumos : insumos.filter(i => i.owner?.toUpperCase().trim() === currentUser.aliasMatch);
                
                const uUrgencia = config?.umbralUrgencia !== undefined ? config.umbralUrgencia : 15;
                
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

                const kpiFavoritos = misInsumosDashboard.filter(i => i.favorito);
                const kpiRiesgo = misInsumosDashboard.filter(i => i.favorito && i.supervivencia <= uUrgencia);
                const kpiDemoras = misInsumosDashboard.filter(i => i.ocDemorada > 0);
                const kpiSolpeds = misInsumosDashboard.filter(ins => 
                  (ins.detalleSolpeds || []).some(sp => {
                    const fechaBase = sp.fechaCreacion || sp.fechaSolicitud || sp.fecha;
                    if (!fechaBase) return false;
                    return parsearFechaLocal(fechaBase) < hace10DiasLocal;
                  })
                );
                const misInsumosIds = misInsumosDashboard.map(i => i.id);
                const kpiTickets = (reclamos || []).filter(r => r.estado === 'ABIERTO' && r.tipo !== 'AVISO GERENCIA' && misInsumosIds.includes(r.insumoId));
                // Nuevo KPI: OCs Trabadas por firmas (Lee directo de SAP)
                const kpiOcPendientes = misInsumosDashboard.filter(i => 
                  i.detalleOCs && i.detalleOCs.some(oc => 
                    String(oc.estado || '').toUpperCase().includes('PROCESO') || 
                    String(oc.estado || '').toUpperCase().includes('AUTORIZAC') || 
                    String(oc.estado || '').toUpperCase().includes('PENDIENTE')
                  )
                );
                const total = misInsumosDashboard.length || 1;
            
                // NUEVO KPI: Insumos a Reclamar
                const umbral = config?.umbralUrgencia !== undefined ? config.umbralUrgencia : 30;
                const kpiReclamar = misInsumosDashboard.filter(i => i.favorito && i.escalados === 0 && Math.round(i.supervivencia) <= umbral);
                return (
                  <>
                    <div onClick={() => setFiltroAlerta('favoritos')} className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-sm cursor-pointer hover:shadow-lg hover:-translate-y-1 hover:border-yellow-200 transition-all duration-300 flex flex-col justify-between">
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-[10px] sm:text-[11px] font-black text-yellow-500 uppercase tracking-widest leading-tight">Favoritos</span>
                        <div className="p-2 bg-yellow-50 rounded-xl"><Star size={16} className="text-yellow-500 fill-yellow-400"/></div>
                      </div>
                      <div className="flex items-end justify-between">
                        <p className="text-3xl font-black text-slate-800 leading-none">{kpiFavoritos.length}</p>
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">De {total}</span>
                      </div>
                    </div>

                    <div onClick={() => setFiltroAlerta('riesgo')} className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-sm cursor-pointer hover:shadow-lg hover:-translate-y-1 hover:border-orange-200 transition-all duration-300 flex flex-col justify-between">
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-[10px] sm:text-[11px] font-black text-orange-500 uppercase tracking-widest leading-tight">En Riesgo</span>
                        <div className="p-2 bg-orange-50 rounded-xl"><Activity size={16} className="text-orange-500"/></div>
                      </div>
                      <div className="flex items-end justify-between">
                        <p className="text-3xl font-black text-slate-800 leading-none">{kpiRiesgo.length}</p>
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Críticos</span>
                      </div>
                    </div>

                    <div onClick={() => setFiltroAlerta('ocs')} className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-sm cursor-pointer hover:shadow-lg hover:-translate-y-1 hover:border-rose-200 transition-all duration-300 flex flex-col justify-between">
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-[10px] sm:text-[11px] font-black text-rose-500 uppercase tracking-widest leading-tight">Demoradas</span>
                        <div className="p-2 bg-rose-50 rounded-xl"><Clock size={16} className="text-rose-500"/></div>
                      </div>
                      <div className="flex items-end justify-between">
                        <p className="text-3xl font-black text-slate-800 leading-none">{kpiDemoras.length}</p>
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Atrasadas</span>
                      </div>
                    </div>

                    {/* NUEVA TARJETA: INSUMOS A RECLAMAR */}
                    <div onClick={() => setFiltroAlerta('insumos_a_reclamar')} className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-sm cursor-pointer hover:shadow-lg hover:-translate-y-1 hover:border-red-400 transition-all duration-300 flex flex-col justify-between">
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-[10px] sm:text-[11px] font-black text-red-600 uppercase tracking-widest leading-tight">Insumos a Reclamar</span>
                        <div className="p-2 bg-red-50 rounded-xl"><AlertTriangle size={16} className="text-red-500"/></div>
                      </div>
                      <div className="flex items-end justify-between">
                        <p className="text-3xl font-black text-slate-800 leading-none">{kpiReclamar.length}</p>
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest text-right leading-tight">
                          - {umbral} Días<br/>S/ Ticket
                        </span>
                      </div>
                    </div>
                    
                    <div onClick={() => setFiltroAlerta('solpeds_viejas')} className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-sm cursor-pointer hover:shadow-lg hover:-translate-y-1 hover:border-indigo-200 transition-all duration-300 flex flex-col justify-between">
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-[10px] sm:text-[11px] font-black text-indigo-500 uppercase tracking-widest leading-tight">Solpeds s/ OC</span>
                        <div className="p-2 bg-indigo-50 rounded-xl"><MessageSquare size={16} className="text-indigo-500"/></div>
                      </div>
                      <div className="flex items-end justify-between">
                        <p className="text-3xl font-black text-slate-800 leading-none">{kpiSolpeds.length}</p>
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">+10 Días</span>
                  </div>
                </div>

                {/* NUEVA TARJETA: OC PENDIENTES DE APROBACIÓN */}
                <div onClick={() => setFiltroAlerta('oc_pend_aprobacion')} className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-sm cursor-pointer hover:shadow-lg hover:-translate-y-1 hover:border-cyan-300 transition-all duration-300 flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-[10px] sm:text-[11px] font-black text-cyan-600 uppercase tracking-widest leading-tight">OC a Firmar</span>
                    <div className="p-2 bg-cyan-50 rounded-xl"><CheckSquare size={16} className="text-cyan-600"/></div>
                  </div>
                  <div className="flex items-end justify-between">
                    <p className="text-3xl font-black text-slate-800 leading-none">{kpiOcPendientes.length}</p>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Trabadas</span>
                  </div>
                </div>

                <div onClick={() => setFiltroAlerta('tickets_abiertos')} className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-sm cursor-pointer hover:shadow-lg hover:-translate-y-1 hover:border-blue-300 transition-all duration-300 flex flex-col justify-between">
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-[10px] sm:text-[11px] font-black text-blue-500 uppercase tracking-widest leading-tight">Tickets Abiertos</span>
                        <div className="p-2 bg-blue-50 rounded-xl"><MessageSquare size={16} className="text-blue-500"/></div>
                      </div>
                      <div className="flex items-end justify-between">
                        <p className="text-3xl font-black text-slate-800 leading-none">{kpiTickets.length}</p>
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Activos</span>
                      </div>
                    </div>
                  </>
                );
              })()}
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
                          className={`bg-white rounded-xl p-3 border border-slate-200 shadow-sm flex flex-col gap-2 hover:shadow-md transition-all ${perfilDestino ?
                          'cursor-pointer hover:-translate-y-1 hover:border-orange-300 ring-2 ring-transparent hover:ring-orange-100' : ''}`}
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
                    <div className="flex items-center">
                        <h2 className="text-2xl font-black uppercase border-l-2 border-orange-500 pl-4 tracking-tight flex items-center gap-3">
                          {selectedGroup}
                          <span className="bg-slate-100 border border-slate-200 text-slate-500 text-[14px] font-black px-2.5 py-0.5 rounded-lg shadow-inner">
                            {datosFiltradosGrupo.length}
                          </span>
                        </h2>
                        <InterruptorVista />
                    </div>
                  </div>
                  
                  <div className="flex bg-slate-100 p-1.5 rounded-xl border border-slate-200 shadow-inner">
                    <button onClick={() => setFiltroVistaLista('todos')} className={`px-4 py-1.5 text-[10px] font-black uppercase rounded-lg transition-all ${filtroVistaLista === 'todos' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>Todos</button>
                    <button onClick={() => setFiltroVistaLista('favoritos')} className={`px-4 py-1.5 text-[10px] font-black uppercase rounded-lg transition-all flex items-center gap-1 ${filtroVistaLista === 'favoritos' ? 'bg-white text-orange-500 shadow-sm' : 'text-slate-400 hover:text-orange-400'}`}>★ Favs</button>
                    <button onClick={() => setFiltroVistaLista('nofavoritos')} className={`px-4 py-1.5 text-[10px] font-black uppercase rounded-lg transition-all flex items-center gap-1 ${filtroVistaLista === 'nofavoritos' ? 'bg-white text-slate-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>☆ No Favs</button>
                  </div>
                </div>
                
                {renderTablaHibrida(datosFiltradosGrupo)}
              </motion.div>
            );
          })()
        )}
      </AnimatePresence>
    </div>
  );
};

export default VistaGestion;
