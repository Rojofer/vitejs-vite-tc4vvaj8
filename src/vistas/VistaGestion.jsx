import React, { useState, useMemo } from 'react';
import { AlertTriangle, Star, Clock, ArrowLeft, Package, Activity, MessageSquare, CheckSquare, ChevronDown, ChevronUp, FileText, ListFilter, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import TablaInsumos from '../componentes/TablaInsumos';

const formatoNum = (num) => Number(num).toLocaleString('es-AR');

const VistaGestion = ({
  currentUser,
  insumos = [],
  reclamos = [],
  config,
  searchTerm,
  resultadosBusqueda,
  filtroAlerta,
  setFiltroAlerta,
  datosAlerta,
  tituloAlerta,
  selectedGroup,
  setSelectedGroup,
  grupos = [],
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
  // Switch maestro de visualización: 'insumos' (tabla normal) o 'documentos' (vista agrupada)
  const [tipoVistaTabla, setTipoVistaTabla] = useState('insumos');
  // Control de colapsables para los bloques de documentos
  const [docsExpandidos, setDocsExpandidos] = useState({});
  // Selección de ítems individuales para reclamos en lote
  const [seleccionadosPorDoc, setSeleccionadosPorDoc] = useState({});

  const umbral = config?.umbralUrgencia !== undefined ? config.umbralUrgencia : 30;

  // Filtro de insumos vivos y cálculo de KPIs
  const misInsumosDashboard = useMemo(() => {
    return insumos.filter(i => !i.discontinuado);
  }, [insumos]);

  const kpiReclamar = useMemo(() => {
    return misInsumosDashboard.filter(i => i.favorito && i.escalados === 0 && Math.round(i.supervivencia) <= umbral);
  }, [misInsumosDashboard, umbral]);

  // Datos base para la tabla final de este componente (aplica buscador si existe)
  const datosBaseTabla = useMemo(() => {
    if (searchTerm && resultadosBusqueda) return resultadosBusqueda;
    if (filtroAlerta && datosAlerta) return datosAlerta;
    return misInsumosDashboard;
  }, [searchTerm, resultadosBusqueda, filtroAlerta, datosAlerta, misInsumosDashboard]);

  // Aplicar sub-filtros de grupo/sector, favoritos y riesgo
  const datosFiltradosFinal = useMemo(() => {
    return datosBaseTabla.filter(ins => {
      if (selectedGroup && ins.grupo !== selectedGroup) return false;
      if (filtroResponsable && ins.owner !== filtroResponsable) return false;
      
      if (filtroVistaLista === 'favoritos' && !ins.favorito) return false;
      if (filtroVistaLista === 'nofavoritos' && ins.favorito) return false;
      
      if (filtroRiesgoGrupo === 'critico' && Math.round(ins.supervivencia) > (config?.umbralCritico || 0)) return false;
      if (filtroRiesgoGrupo === 'urgente' && (Math.round(ins.supervivencia) <= (config?.umbralCritico || 0) || Math.round(ins.supervivencia) > umbral)) return false;
      if (filtroRiesgoGrupo === 'saludable' && Math.round(ins.supervivencia) <= umbral) return false;
      
      return true;
    });
  }, [datosBaseTabla, selectedGroup, filtroResponsable, filtroVistaLista, filtroRiesgoGrupo, config, umbral]);

  // --- ESTRUCTURA DE AGRUPACIÓN POR DOCUMENTO ---
  const documentosAgrupados = useMemo(() => {
    const mapa = {};
    
    datosFiltradosFinal.forEach(ins => {
      let docTipo = 'SIN DOCUMENTO';
      let docNumero = '';
      let idAgrupacion = 'SIN_DOC';

      if (ins.pendienteAutorizacion) {
        docTipo = 'PENDIENTE AUTORIZACIÓN';
        idAgrupacion = 'PEND_AUTORIZ';
      } else if (ins.numeroOC) {
        docTipo = 'OC';
        docNumero = ins.numeroOC;
        idAgrupacion = `OC_${ins.numeroOC}`;
      } else if (ins.numeroSolped) {
        docTipo = 'SOLPED';
        docNumero = ins.numeroSolped;
        idAgrupacion = `SOL_${ins.numeroSolped}`;
      }

      if (!mapa[idAgrupacion]) {
        mapa[idAgrupacion] = {
          id: idAgrupacion,
          tipo: docTipo,
          numero: docNumero,
          proveedor: ins.proveedor || ins.detalleOCs?.proveedor || 'S/P',
          items: []
        };
      }
      
      // Cálculo de consumo mensual contextualizado
      const consumoPromedio = Number(ins.consumoPromedio) || 0;
      const consumoMensual = Math.round(consumoPromedio);

      mapa[idAgrupacion].items.push({
        ...ins,
        consumoMensual
      });
    });

    return Object.values(mapa);
  }, [datosFiltradosFinal]);

  const toggleExpandirDoc = (id) => {
    setDocsExpandidos(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleSeleccionItem = (docId, itemId) => {
    setSeleccionadosPorDoc(prev => {
      const actuales = prev[docId] || [];
      if (actuales.includes(itemId)) {
        return { ...prev, [docId]: actuales.filter(id => id !== itemId) };
      } else {
        return { ...prev, [docId]: [...actuales, itemId] };
      }
    });
  };

  // Pre-tildar automáticamente los insumos críticos la primera vez que se renderiza el grupo
  const obtenerSeleccionadosIniciales = (doc) => {
    if (seleccionadosPorDoc[doc.id] !== undefined) return seleccionadosPorDoc[doc.id];
    const criticos = doc.items
      .filter(i => i.favorito && i.escalados === 0 && Math.round(i.supervivencia) <= umbral)
      .map(i => i.id);
    return criticos;
  };

  return (
    <div className="p-4 md:p-6 h-full max-w-full">
      
      {/* CABECERA PRINCIPAL GESTIÓN ERP Y BARRA DE SALUD */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 mb-6">
        <div>
          <h1 className="text-xl font-black text-slate-800 uppercase tracking-tight">Panel Operativo de Insumos</h1>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-0.5">Control de Cobertura y Abastecimiento de Planta</p>
        </div>
        {renderRadarDinamico && renderRadarDinamico()}
      </div>

      {/* GRILLA DE KPIS - AJUSTADA PARA 7 TARJETAS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-7 gap-3 mb-6">
        
        <div onClick={() => setFiltroAlerta(null)} className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm cursor-pointer hover:shadow-lg hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Total Insumos</span>
            <div className="p-2 bg-slate-50 rounded-xl"><Package size={16} className="text-slate-400"/></div>
          </div>
          <p className="text-3xl font-black text-slate-800 leading-none">{misInsumDashboard.length}</p>
        </div>

        <div onClick={() => setFiltroAlerta('criticos')} className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm cursor-pointer hover:shadow-lg hover:-translate-y-1 hover:border-red-400 transition-all duration-300 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] font-black text-red-600 uppercase tracking-widest">En Quiebre</span>
            <div className="p-2 bg-red-50 rounded-xl"><AlertTriangle size={16} className="text-red-500"/></div>
          </div>
          <p className="text-3xl font-black text-red-600 leading-none">
            {misInsumosDashboard.filter(i => Math.round(i.supervivencia) <= (config?.umbralCritico || 0)).length}
          </p>
        </div>

        <div onClick={() => setFiltroAlerta('urgentes')} className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm cursor-pointer hover:shadow-lg hover:-translate-y-1 hover:border-amber-400 transition-all duration-300 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] font-black text-amber-600 uppercase tracking-widest">En Riesgo</span>
            <div className="p-2 bg-amber-50 rounded-xl"><Clock size={16} className="text-amber-500"/></div>
          </div>
          <p className="text-3xl font-black text-amber-600 leading-none">
            {misInsumosDashboard.filter(i => Math.round(i.supervivencia) > (config?.umbralCritico || 0) && Math.round(i.supervivencia) <= umbral).length}
          </p>
        </div>

        {/* TARJETA DINÁMICA: INSUMOS A RECLAMAR */}
        <div onClick={() => setFiltroAlerta('insumos_a_reclamar')} className={`bg-white rounded-2xl p-4 border shadow-sm cursor-pointer hover:shadow-lg hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between ${filtroAlerta === 'insumos_a_reclamar' ? 'border-red-500 ring-2 ring-red-100' : 'border-slate-200 hover:border-red-400'}`}>
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] font-black text-red-600 uppercase tracking-widest leading-tight">Insumos a Reclamar</span>
            <div className="p-2 bg-red-50 rounded-xl"><AlertTriangle size={16} className="text-red-500"/></div>
          </div>
          <div className="flex items-end justify-between">
            <p className="text-3xl font-black text-slate-800 leading-none">{kpiReclamar.length}</p>
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest text-right leading-tight">
              - {umbral} Días<br/>S/ Ticket
            </span>
          </div>
        </div>

        <div onClick={() => setFiltroAlerta('ocs')} className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm cursor-pointer hover:shadow-lg hover:-translate-y-1 hover:border-sky-400 transition-all duration-300 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] font-black text-sky-600 uppercase tracking-widest">Demoradas</span>
            <div className="p-2 bg-sky-50 rounded-xl"><MessageSquare size={16} className="text-sky-500"/></div>
          </div>
          <p className="text-3xl font-black text-sky-600 leading-none">
            {misInsumosDashboard.filter(i => i.escalados > 0).length}
          </p>
        </div>

        <div onClick={() => setFiltroAlerta('solpeds_viejas')} className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm cursor-pointer hover:shadow-lg hover:-translate-y-1 hover:border-indigo-400 transition-all duration-300 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Solpeds S/ OC</span>
            <div className="p-2 bg-indigo-50 rounded-xl"><FileText size={16} className="text-indigo-500"/></div>
          </div>
          <p className="text-3xl font-black text-indigo-600 leading-none">
            {misInsumosDashboard.filter(i => i.numeroSolped && !i.numeroOC).length}
          </p>
        </div>

        <div onClick={() => setFiltroAlerta('favoritos')} className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm cursor-pointer hover:shadow-lg hover:-translate-y-1 hover:border-orange-400 transition-all duration-300 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] font-black text-orange-500 uppercase tracking-widest">Favoritos</span>
            <div className="p-2 bg-orange-50 rounded-xl"><Star size={16} className="text-orange-500 fill-orange-500"/></div>
          </div>
          <p className="text-3xl font-black text-orange-500 leading-none">
            {misInsumosDashboard.filter(i => i.favorito).length}
          </p>
        </div>

      </div>

      {/* BARRA DE FILTROS SECUNDARIOS E INTERRUPTOR DE VISTA */}
      <div className="bg-slate-900 rounded-2xl p-4 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6 shadow-md border border-slate-800">
        
        {/* Filtros de Categoría / Sector */}
        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
          <div className="flex items-center gap-2 bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-700">
            <ListFilter size={14} className="text-slate-400" />
            <span className="text-[9px] font-black text-slate-300 uppercase tracking-wider">Sector:</span>
          </div>
          <select value={selectedGroup || ""} onChange={(e) => setSelectedGroup(e.target.value || null)} className="bg-slate-800 text-white border border-slate-700 px-3 py-1.5 rounded-xl text-xs font-black uppercase outline-none focus:border-orange-500 transition-all shadow-inner">
            <option value="">TODOS LOS SECTORES</option>
            {grupos.map(g => (
              <option key={g} value={g}>{g.toUpperCase()}</option>
            ))}
          </select>
        </div>

        {/* INTERRUPTOR MAESTRO DE DISEÑO DE TABLA */}
        <div className="flex items-center gap-1 bg-slate-800 p-1 rounded-xl border border-slate-700 self-stretch lg:self-auto">
          <button 
            onClick={() => setTipoVistaTabla('insumos')} 
            className={`flex-1 lg:flex-none px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${tipoVistaTabla === 'insumos' ? 'bg-orange-500 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'}`}
          >
            <Package size={14}/> Vista Insumos
          </button>
          <button 
            onClick={() => setTipoVistaTabla('documentos')} 
            className={`flex-1 lg:flex-none px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${tipoVistaTabla === 'documentos' ? 'bg-orange-500 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'}`}
          >
            <FileText size={14}/> Vista por Documento
          </button>
        </div>

        {/* Sub-filtros rápidos de favoritos */}
        <div className="flex items-center gap-1 bg-slate-800 p-1 rounded-xl border border-slate-700 w-full lg:w-auto justify-end">
          <button onClick={() => setFiltroVistaLista('todos')} className={`px-4 py-1.5 text-[10px] font-black uppercase rounded-lg transition-all ${filtroVistaLista === 'todos' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}>Todos</button>
          <button onClick={() => setFiltroVistaLista('favoritos')} className={`px-4 py-1.5 text-[10px] font-black uppercase rounded-lg transition-all flex items-center gap-1 ${filtroVistaLista === 'favoritos' ? 'bg-white text-orange-500 shadow-sm' : 'text-slate-400 hover:text-orange-400'}`}>★ Favs</button>
          <button onClick={() => setFiltroVistaLista('nofavoritos')} className={`px-4 py-1.5 text-[10px] font-black uppercase rounded-lg transition-all flex items-center gap-1 ${filtroVistaLista === 'nofavoritos' ? 'bg-white text-slate-600 shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}>☆ No Favs</button>
        </div>

      </div>

      {/* CONTENEDOR DE RENDERS DINÁMICOS */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {filtroAlerta && (
          <div className="bg-slate-50 px-6 py-3 border-b border-slate-200 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></span>
              <p className="text-xs font-black text-slate-700 uppercase tracking-wider">Filtro Activo de Alerta: <span className="text-orange-600 font-extrabold">{tituloAlerta || filtroAlerta}</span></p>
            </div>
            <button onClick={() => setFiltroAlerta(null)} className="text-[10px] font-black text-slate-400 hover:text-red-500 uppercase tracking-widest border border-slate-200 bg-white px-2 py-1 rounded-lg transition-colors">Limpiar</button>
          </div>
        )}

        {tipoVistaTabla === 'insumos' ? (
          /* DISEÑO TRADICIONAL: TABLA PLANA */
          <TablaInsumos 
            datos={datosFiltradosFinal} 
            config={config} 
            onGestionar={setActiveInsumo} 
            toggleFavorito={toggleFavorito} 
            toggleVisibilidadPlanta={toggleVisibilidadPlanta} 
            isOwner={currentUser.rol === 'owner'} 
            canEditFav={currentUser.rol === 'owner' || currentUser.editorFavoritos} 
            obtenerColorOwner={obtenerColorOwner}
          />
        ) : (
          /* NUEVO DISEÑO HÍBRIDO: AGRUPADO POR DOCUMENTO DE COMPRAS */
          <div className="p-4 space-y-4 max-w-full overflow-x-auto">
            {documentosAgrupados.map((doc) => {
              const itemsSeleccionados = obtenerSeleccionadosIniciales(doc);
              const estaExpandido = !!docsExpandidos[doc.id];
              
              return (
                <div key={doc.id} className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-sm transition-all duration-300">
                  
                  {/* CABECERA DEL BLOQUE DOCUMENTO */}
                  <div className="bg-slate-50 p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100">
                    <div className="flex items-center gap-3 cursor-pointer select-none" onClick={() => toggleExpandirDoc(doc.id)}>
                      <div className="p-2 bg-white border border-slate-200 rounded-xl text-slate-600 shadow-sm">
                        {estaExpandido ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded ${doc.tipo === 'OC' ? 'bg-sky-100 text-sky-800' : doc.tipo === 'SOLPED' ? 'bg-indigo-100 text-indigo-800' : 'bg-purple-100 text-purple-800'}`}>{doc.tipo}</span>
                          <span className="font-black text-sm text-slate-800 tracking-tight">{doc.numero || 'PENDIENTE'}</span>
                        </div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">PROVEEDOR: <span className="text-slate-600">{doc.proveedor}</span></p>
                      </div>
                    </div>

                    {itemsSeleccionados.length > 0 && (
                      <button 
                        onClick={() => {
                          // Simulación o llamado directo al lote del Redactor
                          const itemsCompletos = doc.items.filter(i => itemsSeleccionados.includes(i.id));
                          if (itemsCompletos.length > 0) {
                            setActiveInsumo(itemsCompletos[0]); // Abre el primero como puente o pasarela
                          }
                        }}
                        className="w-full sm:w-auto bg-red-500 hover:bg-red-600 text-white font-black uppercase text-[10px] tracking-widest px-4 py-2.5 rounded-xl shadow-md shadow-red-500/20 transition-all flex items-center justify-center gap-2"
                      >
                        <MessageSquare size={14}/> Reclamar {itemsSeleccionados.length} Seleccionados
                      </button>
                    )}
                  </div>

                  {/* SUB-TABLA DESPLEGABLE CON LOS MATERIALES */}
                  <AnimatePresence initial={false}>
                    {estaExpandido && (
                      <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden bg-white">
                        <table className="w-full text-left border-collapse min-w-[600px]">
                          <thead>
                            <tr className="border-b border-slate-100 bg-slate-50/50 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                              <th className="py-3 px-4 w-12 text-center">Sel.</th>
                              <th className="py-3 px-4 w-32">Código</th>
                              <th className="py-3 px-4">Insumo</th>
                              <th className="py-3 px-4 text-center w-28">Stock Actual</th>
                              <th className="py-3 px-4 text-center w-32">Consumo Mensual</th>
                              <th className="py-3 px-4 text-center w-28">Cobertura</th>
                              <th className="py-3 px-4 text-center w-36">Estado / Ticket</th>
                            </tr>
                          </thead>
                          <tbody>
                            {doc.items.map((ins) => {
                              const estaTildado = itemsSeleccionados.includes(ins.id);
                              const tieneTicketAbierto = ins.escalados > 0;
                              
                              // Configuración del color del semáforo de supervivencia
                              let colorSemaforo = "text-emerald-600 bg-emerald-50 border border-emerald-100";
                              let dotSemaforo = "bg-emerald-500";
                              if (Math.round(ins.supervivencia) <= (config?.umbralCritico || 0)) {
                                colorSemaforo = "text-red-600 bg-red-50 border border-red-100";
                                dotSemaforo = "bg-red-500";
                              } else if (Math.round(ins.supervivencia) <= umbral) {
                                colorSemaforo = "text-amber-600 bg-amber-50 border border-amber-100";
                                dotSemaforo = "bg-amber-500";
                              }

                              return (
                                <tr 
                                  key={ins.id} 
                                  className="border-b border-slate-100 hover:bg-slate-50/70 transition-colors cursor-pointer group"
                                >
                                  {/* CHECKBOX */}
                                  <td className="py-3 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                                    <input 
                                      type="checkbox" 
                                      disabled={tieneTicketAbierto}
                                      checked={estaTildado}
                                      onChange={() => toggleSeleccionItem(doc.id, ins.id)}
                                      className="w-4 h-4 text-red-500 border-slate-300 rounded focus:ring-red-400 disabled:opacity-30 disabled:cursor-not-allowed"
                                    />
                                  </td>
                                  
                                  {/* CONTENIDO INTERACTIVO (Abre Panel Lateral) */}
                                  <td className="py-3 px-4 font-bold text-xs text-slate-700" onClick={() => setActiveInsumo(ins)}>
                                    {ins.codigo}
                                  </td>
                                  <td className="py-3 px-4" onClick={() => setActiveInsumo(ins)}>
                                    <div className="flex flex-col">
                                      <span className="font-black text-xs text-slate-800 uppercase tracking-tight group-hover:text-orange-500 transition-colors">{ins.nombre}</span>
                                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">Responsable: {ins.owner || 'S/A'}</span>
                                    </div>
                                  </td>
                                  <td className="py-3 px-4 text-center font-bold text-xs text-slate-600" onClick={() => setActiveInsumo(ins)}>
                                    {formatoNum(ins.stockActual || 0)}
                                  </td>
                                  <td className="py-3 px-4 text-center font-black text-xs text-slate-700" onClick={() => setActiveInsumo(ins)}>
                                    {formatoNum(ins.consumoMensual || 0)}
                                  </td>
                                  <td className="py-3 px-4 text-center" onClick={() => setActiveInsumo(ins)}>
                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase ${colorSemaforo}`}>
                                      <span className={`w-1.5 h-1.5 rounded-full ${dotSemaforo}`}></span>
                                      {Math.round(ins.supervivencia) > 998 ? '999+' : Math.round(ins.supervivencia)} Días
                                    </span>
                                  </td>
                                  <td className="py-3 px-4 text-center" onClick={() => setActiveInsumo(ins)}>
                                    {tieneTicketAbierto ? (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-black uppercase bg-amber-100 text-amber-800 border border-amber-200">
                                        🔒 Gestión ({ins.ticketReclamo || 'Activa'})
                                      </span>
                                    ) : (
                                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Limpio S/ Reclamo</span>
                                    )}
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

            {documentosAgrupados.length === 0 && (
              <div className="text-center py-16 bg-white border border-slate-200 border-dashed rounded-2xl">
                <FileText size={32} className="mx-auto text-slate-300 mb-3"/>
                <p className="text-slate-500 font-bold text-sm uppercase tracking-wider">No se encontraron documentos agrupados</p>
                <p className="text-slate-400 text-xs mt-1">Ajustá los filtros o el buscador para procesar la información.</p>
              </div>
            )}
          </div>
        )}
      </div>

    </div>
  );
};

export default VistaGestion;
