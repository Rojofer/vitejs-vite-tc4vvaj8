import React, { useState, useMemo } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { motion, AnimatePresence } from 'framer-motion';
import { History, FileSpreadsheet, Search, Filter, X, ChevronRight, Clock, CheckSquare, AlertCircle, Info, FileText, CornerDownRight, Mail, TrendingUp, Target, Zap, BarChart2, ShieldCheck, Timer } from 'lucide-react';

const VistaAuditoria = ({ insumos, reclamos, currentUser, formatearFecha, obtenerMesAnio, setToastMsg, cerrarReclamoManual, auditoriaFiltroInsumo, setAuditoriaFiltroInsumo, setActiveInsumo, setDialogoConfirmacion}) => {
    const [filtroMes, setFiltroMes] = useState("TODOS");
    const [filtroTipo, setFiltroTipo] = useState("TODOS"); 
    const [filtroOperario, setFiltroOperario] = useState("TODOS");
    const [busquedaAuditoria, setBusquedaAuditoria] = useState("");
    const [auditoriaTab, setAuditoriaTab] = useState('abiertos');
    const [expandedRow, setExpandedRow] = useState(null);
    const [modalMensaje, setModalMensaje] = useState(null); 

    // --- LÓGICA DE CÁLCULO DE KPIs GERENCIALES ---
    const kpiData = useMemo(() => {
      // Filtramos la basura y nos quedamos solo con reclamos operativos reales a compras
      const validos = reclamos.filter(r => r.insumoId && r.insumoId !== "BROADCAST" && r.estado !== "INICIALIZADO" && r.tipo !== 'equipo' && r.tipo !== 'APROBACION GERENCIA' && r.tipo !== 'RECHAZO GERENCIA');

      // 1. Tasa de Resolución Mensual
      const hoy = new Date();
      const mesActual = hoy.getMonth();
      const anioActual = hoy.getFullYear();
      const reclamosMes = validos.filter(r => {
        const f = r.fecha?.seconds ? new Date(r.fecha.seconds * 1000) : new Date(r.fecha);
        return f && !isNaN(f.getTime()) && f.getMonth() === mesActual && f.getFullYear() === anioActual;
      });
      const cerradosMes = reclamosMes.filter(r => r.estado === 'CERRADO');
      const tasaResolucion = reclamosMes.length > 0 ? Math.round((cerradosMes.length / reclamosMes.length) * 100) : 100;

      // 2. Lead Time Promedio (Apertura a Cierre)
      const resueltos = validos.filter(r => r.estado === 'CERRADO' && r.fecha && r.fechaCierre);
      let totalDias = 0;
      resueltos.forEach(r => {
        const fInicio = r.fecha.seconds ? r.fecha.seconds : new Date(r.fecha).getTime() / 1000;
        const fFin = r.fechaCierre.seconds ? r.fechaCierre.seconds : new Date(r.fechaCierre).getTime() / 1000;
        totalDias += Math.max(0, (fFin - fInicio) / 86400); // Diferencia en días
      });
      const leadTime = resueltos.length > 0 ? (totalDias / resueltos.length).toFixed(1) : 0;

      // 3. Top Ofensores (Pareto)
      const conteoPorInsumo = {};
      validos.forEach(r => {
         conteoPorInsumo[r.insumoId] = (conteoPorInsumo[r.insumoId] || 0) + 1;
      });
      const topOfensores = Object.keys(conteoPorInsumo)
        .map(id => ({ id, cantidad: conteoPorInsumo[id], insumo: insumos.find(i => i.id === id) }))
        .filter(obj => obj.insumo) // descartar si el insumo ya no existe
        .sort((a,b) => b.cantidad - a.cantidad)
        .slice(0, 5); // Los 5 peores

      // 4. Efectividad del Primer Contacto (Insistencia)
      let hilosUnicos = 0;
      let hilosMultiples = 0;
      Object.values(conteoPorInsumo).forEach(cant => {
        if (cant === 1) hilosUnicos++;
        else if (cant > 1) hilosMultiples++;
      });
      const totalHilos = hilosUnicos + hilosMultiples;
      const efectividadPrimerContacto = totalHilos > 0 ? Math.round((hilosUnicos / totalHilos) * 100) : 100;

      return {
        tasaResolucion, reclamosMes: reclamosMes.length, cerradosMes: cerradosMes.length,
        leadTime,
        topOfensores,
        efectividadPrimerContacto,
        totalGestionados: validos.length
      };
    }, [reclamos, insumos]);

    // --- FUNCIÓN: GENERADOR DE DOSSIER PDF ---
    const exportarDossierPDF = (hiloActivo) => {
      const doc = new jsPDF();
      const insumo = insumos.find(i => i.id === hiloActivo.insumoId) || {};
      const threadItems = hiloActivo.subReclamos ?
        [...hiloActivo.subReclamos].sort((a,b) => (a.fecha?.seconds||0) - (b.fecha?.seconds||0)) : []; 

      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text("AUDITORÍA", 14, 20);
      
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100);
      doc.text(`Fecha de emisión: ${new Date().toLocaleString('es-AR')}`, 14, 28); 

      doc.setDrawColor(200);
      doc.setFillColor(248, 250, 252);
      doc.rect(14, 35, 182, 25, 'FD'); 
            
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text(`CÓDIGO: ${insumo.codigo || 'S/C'}`, 18, 49);
      doc.text(`MATERIAL: ${insumo.nombre || 'GENERAL'}`, 18, 55);
      
     const tableData = threadItems.map((item) => {
        const tipoReclamoDef = getTipoReclamo(item.mensaje);
        let accion = `[${tipoReclamoDef.num}] ${tipoReclamoDef.label}`;
        let operarioLimpio = (item.operario || "").replace(/➡️/g, '->');
                   
        return [
          formatearFecha(item.fecha),
          operarioLimpio,
          accion,
          item.mensaje + (item.cuerpoOriginal ? `\n\nDetalle: ${item.cuerpoOriginal}` : "")
        ];
      });

      autoTable(doc, {
        startY: 70, 
        head: [['Fecha / Hora', 'Responsable', 'Acción', 'Registro Oficial']],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold' },
        styles: { fontSize: 8, cellPadding: 3 },
        columnStyles: { 0: { cellWidth: 25 }, 1: { cellWidth: 25 }, 2: { cellWidth: 25 }, 3: { cellWidth: 'auto' } }
      });
      doc.save(`Trazabilidad_${insumo.nombre || 'Auditoria'}.pdf`);
      setToastMsg("Dossier PDF generado y descargado con éxito.");
      setTimeout(() => setToastMsg(null), 4000);
    };

    // --- DESCARGAR EXCEL INTERNO ---
    const descargarExcelAuditoria = (filtrados) => {
      let csv = "Fecha,Estado,Tipo,Insumo,Mensaje,Operario\n";
      filtrados.forEach(r => { const ins = insumos.find(i => i.id === r.insumoId)?.nombre || 'Eliminado'; csv += `"${formatearFecha(r.fecha)}","${r.estado}","${r.tipo === 'equipo'?'Alerta Interna':'Reclamo Compras'}","${ins}","${r.mensaje}","${r.operario}"\n`; });
      const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement("a"); link.href = URL.createObjectURL(blob);
      link.download = `Auditoria_${new Date().toLocaleDateString('es-AR')}.csv`; link.click();
    };

    // --- FILTROS Y TABLA ---
    // Ocultamos INICIALIZADO y BROADCAST de la tabla
    let filtrados = reclamos.filter(r => r.insumoId !== "BROADCAST" && r.estado !== "INICIALIZADO");

    const operariosUnicos = useMemo(() => {
      const ops = filtrados.map(r => r.operario).filter(Boolean);
      return [...new Set(ops)].sort();
    }, [filtrados]);
    
    if (currentUser.rol !== 'owner') {
      filtrados = filtrados.filter(r => r.operario === currentUser.nombre || (r.operario && r.operario.includes(currentUser.nombre)));
    } else {
      if (filtroOperario !== "TODOS") filtrados = filtrados.filter(r => r.operario === filtroOperario);
    }

    const mesesDisponibles = useMemo(() => { 
      const unique = Array.from(new Set(filtrados.map(r => obtenerMesAnio(r.fecha)))); 
      return unique.sort((a, b) => { 
        if (a === "Sin Fecha") return 1; if (b === "Sin Fecha") return -1; 
        const [mesA, anioA] = a.split(" "); const [mesB, anioB] = b.split(" "); 
        if (anioA !== anioB) return Number(anioB) - Number(anioA); 
        const ordenMeses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']; 
        return ordenMeses.indexOf(mesB) - ordenMeses.indexOf(mesA); 
      }); 
    }, [filtrados]);

    if (filtroMes !== "TODOS") filtrados = filtrados.filter(r => obtenerMesAnio(r.fecha) === filtroMes);
    
    if (filtroTipo !== "TODOS") {
      if (filtroTipo === "TIPO_1") filtrados = filtrados.filter(r => (r.mensaje || "").toUpperCase().includes("SOLPED"));
      if (filtroTipo === "TIPO_2") filtrados = filtrados.filter(r => (r.mensaje || "").toUpperCase().includes("AUTORIZAR"));
      if (filtroTipo === "TIPO_3") filtrados = filtrados.filter(r => (r.mensaje || "").toUpperCase().includes("APROBADA DEMORADA"));
      if (filtroTipo === "TIPO_4") filtrados = filtrados.filter(r => (r.mensaje || "").toUpperCase().includes("QUIEBRE"));
      if (filtroTipo === "OTRO") filtrados = filtrados.filter(r => {
        const txt = (r.mensaje || "").toUpperCase();
        return !txt.includes("SOLPED") && !txt.includes("AUTORIZAR") && !txt.includes("APROBADA DEMORADA") && !txt.includes("QUIEBRE");
      });
    }

    if (auditoriaTab === 'abiertos') {
      filtrados = filtrados.filter(r => r.estado === 'ABIERTO' || r.tipo === "APROBACION GERENCIA");
    } else if (auditoriaTab === 'resueltos') {
      filtrados = filtrados.filter(r => r.estado === 'CERRADO' && r.tipo !== "APROBACION GERENCIA");
    }
    
    if (busquedaAuditoria) { 
      const term = busquedaAuditoria.toLowerCase();
      filtrados = filtrados.filter(r => { 
        const ins = insumos.find(i => i.id === r.insumoId); 
        return r.mensaje.toLowerCase().includes(term) || (ins?.nombre || "").toLowerCase().includes(term) || (ins?.codigo || "").toLowerCase().includes(term); 
      });
    }
    
    if (auditoriaFiltroInsumo) filtrados = filtrados.filter(r => r.insumoId === auditoriaFiltroInsumo);

    const hilos = useMemo(() => { const h = []; const m = {}; filtrados.forEach(r => { if (!m[r.insumoId]) { m[r.insumoId] = { ...r, totalReclamos: 1, subReclamos: [r] }; h.push(m[r.insumoId]); } else { m[r.insumoId].totalReclamos += 1; m[r.insumoId].subReclamos.push(r); } }); return h; }, [filtrados]);
    
    // CEREBRO: Lee el asunto y deduce la etiqueta visual con su número y color
    const getTipoReclamo = (asunto) => {
      const txt = (asunto || "").toUpperCase();
      if (txt.includes("SOLPED")) return { num: "1", label: "SOLPEDS SIN O/C", style: "bg-sky-50 text-sky-700 border-sky-200" };
      if (txt.includes("AUTORIZAR")) return { num: "2", label: "AUTORIZAR OC", style: "bg-purple-50 text-purple-700 border-purple-200" };
      if (txt.includes("APROBADA DEMORADA")) return { num: "3", label: "O/C DEMORADAS", style: "bg-orange-50 text-orange-700 border-orange-200" };
      if (txt.includes("QUIEBRE")) return { num: "4", label: "RIESGO DE QUIEBRE", style: "bg-red-50 text-red-700 border-red-200" };
      return { num: "0", label: "HISTÓRICO", style: "bg-slate-50 text-slate-500 border-slate-200" };
    };
    
    return (
      <div className="p-4 md:p-6 h-full w-full relative flex justify-center">
        <div className="w-full max-w-full">
          
          <div className="flex items-center justify-end mb-6">
            <button onClick={() => descargarExcelAuditoria(filtrados)} className="flex items-center gap-2 bg-emerald-50 text-emerald-600 border border-emerald-200 hover:bg-emerald-100 hover:text-emerald-700 font-black text-[10px] uppercase tracking-widest px-4 py-2.5 rounded-xl transition-all shadow-sm">
              <FileSpreadsheet size={16}/> Descargar XLS
            </button>
          </div>
          
          <div className="flex gap-6 border-b border-slate-200 mb-6">
            <button onClick={() => setAuditoriaTab('abiertos')} className={`pb-3 font-black text-xs uppercase tracking-widest transition-all border-b-2 ${auditoriaTab === 'abiertos' ? 'border-sky-500 text-sky-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>En Curso</button>
            <button onClick={() => setAuditoriaTab('resueltos')} className={`pb-3 font-black text-xs uppercase tracking-widest transition-all border-b-2 ${auditoriaTab === 'resueltos' ? 'border-sky-500 text-sky-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>Resueltos</button>
            {currentUser.rol === 'owner' && <button onClick={() => setAuditoriaTab('kpis')} className={`pb-3 font-black text-xs uppercase tracking-widest transition-all border-b-2 ${auditoriaTab === 'kpis' ? 'border-orange-500 text-orange-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>Tablero KPIs</button>}
          </div>

          {(auditoriaTab === 'abiertos' || auditoriaTab === 'resueltos') && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              
              <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <div className="relative flex-1">
                  <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input type="text" placeholder="Buscar código, insumo o asunto..." value={busquedaAuditoria} onChange={e => setBusquedaAuditoria(e.target.value)} className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-sky-500 transition-all shadow-sm" />
                </div>
                
                {currentUser.rol === 'owner' && (
                  <select value={filtroOperario} onChange={e => setFiltroOperario(e.target.value)} className="p-3 bg-white border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest outline-none cursor-pointer shadow-sm text-slate-600">
                    <option value="TODOS">Todos los Operarios</option>
                    {operariosUnicos.map(op => <option key={op} value={op}>{op}</option>)}
                  </select>
                )}

                <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)} className="p-3 bg-white border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest outline-none cursor-pointer shadow-sm text-slate-600">
                  <option value="TODOS">Todos los Tipos</option>
                  <option value="TIPO_1">1 - SOLPEDS SIN O/C</option>
                  <option value="TIPO_2">2 - AUTORIZAR OC</option>
                  <option value="TIPO_3">3 - O/C DEMORADAS APROBADAS</option>
                  <option value="TIPO_4">4 - URGENTE: RIESGO DE QUIEBRE</option>
                  <option value="OTRO">0 - Históricos / Otros</option>
                </select>

                <select value={filtroMes} onChange={e => setFiltroMes(e.target.value)} className="p-3 bg-white border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest outline-none cursor-pointer shadow-sm text-slate-600">
                  <option value="TODOS">Mes: Total</option>
                  {mesesDisponibles.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              
              {auditoriaFiltroInsumo && (
                <div className="mb-6 flex items-center gap-3 bg-sky-100 border border-sky-200 text-sky-800 px-4 py-3 rounded-xl w-max shadow-sm">
                  <Filter size={16}/>
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-widest opacity-70">Filtrando historial de:</p>
                    <p className="text-xs font-bold uppercase">{insumos.find(i=>i.id===auditoriaFiltroInsumo)?.nombre || 'Insumo'}</p>
                  </div>
                  <button onClick={() => setAuditoriaFiltroInsumo(null)} className="ml-4 p-1 hover:bg-sky-200 rounded-md"><X size={14}/></button>
                </div>
              )}
              
              <div className="bg-white rounded-3xl shadow-sm border border-slate-200">
                <table className="w-full text-left whitespace-nowrap">
                  <thead className="sticky top-0 z-20 shadow-sm">
                    <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      <th className="py-4 px-4 w-12 text-center bg-white rounded-tl-3xl border-b border-slate-200"></th>
                      <th className="py-4 px-4 bg-white border-b border-slate-200">Cód. / Insumo</th>
                      <th className="py-4 px-4 bg-white border-b border-slate-200">Última Act.</th>
                      <th className="py-4 px-4 text-center bg-white border-b border-slate-200">Estado</th>
                      <th className="py-4 px-4 text-center bg-white border-b border-slate-200">Tipo</th>
                      <th className="py-4 px-4 bg-white border-b border-slate-200">Asunto (Clic para leer)</th>
                      {currentUser.rol === 'owner' && <th className="py-4 px-4 bg-white border-b border-slate-200">Operario</th>}
                      <th className="py-4 px-4 text-right bg-white rounded-tr-3xl border-b border-slate-200">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {hilos.length === 0 ? (
                      <tr>
                        <td colSpan="8" className="py-10 text-center text-slate-400 text-xs font-bold uppercase tracking-widest">No hay registros en la auditoría.</td>
                      </tr>
                    ) : (
                      hilos.map((h, idx) => {
                        const threadItems = h.subReclamos ? [...h.subReclamos].sort((a,b) => (b.fecha?.seconds||0) - (a.fecha?.seconds||0)) : [];
                        const isExpanded = expandedRow === h.insumoId;
                        const insumoAsociado = insumos.find(i => i.id === h.insumoId) || {};

                        return (
                          <React.Fragment key={h.insumoId || idx}>
                            <tr onClick={() => setActiveInsumo(insumoAsociado)} className="hover:bg-slate-50/80 transition-colors group align-middle cursor-pointer">
                              <td className="py-4 px-4 text-center">
                                {h.totalReclamos > 1 ? (
                                  <button onClick={(e) => { e.stopPropagation(); setExpandedRow(isExpanded ? null : h.insumoId); }} className="p-1 rounded bg-white border border-slate-200 text-slate-500 hover:border-slate-400 transition-colors shadow-sm">
                                    <ChevronRight size={14} className={`transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}/>
                                  </button>
                                ) : ( <span className="w-6 inline-block"></span> )}
                              </td>

                              <td className="py-4 px-4">
                                <div className="flex flex-col">
                                  <span className="text-[9px] font-mono text-slate-400">CÓD: {insumoAsociado.codigo || 'S/C'}</span>
                                  <span className="text-xs font-black text-slate-800 uppercase flex items-center gap-2">
                                    {insumoAsociado.nombre || 'GENERAL'}
                                    {h.totalReclamos > 1 && <span className="bg-slate-200 text-slate-600 text-[8px] px-1.5 py-0.5 rounded-full">{h.totalReclamos} MSJS</span>}
                                  </span>
                                </div>
                              </td>

                              <td className="py-4 px-4 text-[10px] font-bold text-slate-500">{formatearFecha(h.fecha)}</td>

                              <td className="py-4 px-4">
                                {h.estado === 'ABIERTO' && h.tipo !== "APROBACION GERENCIA" ? (
                                  <span className="px-2 py-1 rounded bg-orange-100 text-orange-700 text-[9px] font-black uppercase flex items-center gap-1 w-max shadow-sm"><span className="w-1 h-1 rounded-full bg-orange-500"></span> Abierto</span>
                                ) : h.tipo === "APROBACION GERENCIA" ? (
                                  <span className="px-2 py-1 rounded bg-amber-100 text-amber-700 text-[9px] font-black uppercase flex items-center gap-1 w-max shadow-sm"><Clock size={10}/> Esperando Envío</span>
                                ) : (
                                  <span className="px-2 py-1 rounded bg-slate-100 text-slate-600 text-[9px] font-black uppercase flex items-center gap-1 w-max shadow-sm"><span className="w-1 h-1 rounded-full bg-slate-400"></span> Resuelto</span>
                                )}
                              </td>

                              <td className="py-4 px-4">
                                {(() => {
                                  const tipo = getTipoReclamo(h.mensaje);
                                  return (
                                    <span className={`text-[9px] font-black border px-2 py-1 rounded flex items-center gap-1.5 w-max shadow-sm ${tipo.style}`}>
                                      <span className="bg-white text-current rounded-sm px-1.5 py-0.5 shadow-[0_1px_2px_rgba(0,0,0,0.05)]">{tipo.num}</span> 
                                      {tipo.label}
                                    </span>
                                  );
                                })()}
                              </td>

                              <td className="py-4 px-4">
                                <button onClick={(e) => { e.stopPropagation(); setModalMensaje(h); }} className="text-[10px] text-sky-600 hover:text-sky-800 font-bold uppercase truncate max-w-[250px] flex items-center gap-1.5 transition-colors text-left">
                                  <Info size={12} className="shrink-0" /> {h.mensaje}
                                </button>
                              </td>

                              {currentUser.rol === 'owner' && <td className="py-4 px-4 text-[9px] font-black text-slate-700 uppercase tracking-wide">{h.operario}</td>}

                              <td className="py-4 px-4 text-right">
                                <div className="flex items-center justify-end gap-3">
                                  {h.estado === 'ABIERTO' && (currentUser.rol === 'owner' || h.operario?.trim().toLowerCase() === currentUser.nombre?.trim().toLowerCase() || h.operario?.trim().toLowerCase() === currentUser.aliasMatch?.trim().toLowerCase()) && (
                                    <button onClick={(e) => { e.stopPropagation(); if(setDialogoConfirmacion) { const insumoAsociado = insumos.find(i => i.id === h.insumoId); setDialogoConfirmacion({ titulo: "Cerrar Reclamo", mensaje: `¿Confirmás que querés dar por cumplido y cerrar el reclamo de "${insumoAsociado?.nombre || 'este material'}"?`, textoConfirmar: "Sí, Cerrar Reclamo", colorBoton: "bg-emerald-500 hover:bg-emerald-600", onConfirm: () => cerrarReclamoManual(h.id) }); } else { cerrarReclamoManual(h.id, e); } }} className="px-3 py-1.5 bg-white border border-slate-200 text-slate-500 rounded text-[9px] font-black uppercase tracking-widest hover:border-slate-400 hover:text-slate-800 transition-all shadow-sm flex items-center gap-1">
                                      <X size={10} /> Cerrar
                                    </button>
                                  )}
                                  {currentUser.rol === 'owner' && (
                                    <button onClick={(e) => { e.stopPropagation(); exportarDossierPDF(h); }} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-all" title="Exportar Dossier PDF">
                                      <FileText size={16} />
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>

                            <AnimatePresence>
                              {isExpanded && threadItems.slice(1).map((item, iIdx) => {
                                const tipoSub = getTipoReclamo(item.mensaje);
                                return (
                                  <motion.tr key={item.id || iIdx} onClick={() => setActiveInsumo(insumoAsociado)} initial={{ opacity: 0, backgroundColor: "#f8fafc" }} animate={{ opacity: 1, backgroundColor: "#f8fafc" }} exit={{ opacity: 0 }} className="border-b border-slate-100/50 align-middle cursor-pointer">
                                    <td className="py-3 px-4"></td>
                                    <td className="py-3 px-4">
                                      <div className="flex items-center gap-2">
                                        <CornerDownRight size={12} className="text-slate-400" />
                                        <span className="text-[9px] font-black text-slate-400 uppercase">ITERACIÓN #{threadItems.length - iIdx - 1}</span>
                                      </div>
                                    </td>
                                    <td className="py-3 px-4 text-[10px] font-bold text-slate-500">{formatearFecha(item.fecha)}</td>
                                    <td className="py-3 px-4"></td>
                                    <td className="py-3 px-4">
                                      <span className={`text-[8px] font-black border px-1.5 py-0.5 rounded flex items-center gap-1 w-max shadow-xs ${tipoSub.style}`}>
                                        <span className="bg-white text-current rounded-sm px-1 py-0.1 shadow-xs">{tipoSub.num}</span> 
                                        {tipoSub.label}
                                      </span>
                                    </td>
                                    <td className="py-3 px-4">
                                      <button onClick={(e) => { e.stopPropagation(); setModalMensaje(item); }} className="text-[10px] text-sky-600 hover:text-sky-800 font-bold uppercase truncate max-w-[250px] flex items-center gap-1.5 transition-colors text-left">
                                        <Info size={12} className="shrink-0" /> {item.mensaje}
                                      </button>
                                    </td>
                                    <td className="py-3 px-4 text-[9px] font-black text-slate-500 uppercase">{item.operario}</td>
                                    <td className="py-3 px-4"></td>
                                  </motion.tr>
                                );
                              })}
                            </AnimatePresence>
                          </React.Fragment>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}

          {/* NUEVO MÓDULO DE TABLERO DE KPIs GERENCIALES */}
          {auditoriaTab === 'kpis' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* TARJETA 1: Tasa Resolucion */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tasa de Resolución</h3>
                      <p className="text-[9px] font-bold text-slate-400 mt-1 uppercase">Mes Actual</p>
                    </div>
                    <div className="p-2 bg-emerald-50 rounded-xl"><Target size={16} className="text-emerald-500"/></div>
                  </div>
                  <div>
                    <div className="flex items-end gap-2 mb-2">
                      <span className="text-3xl font-black text-slate-800 leading-none">{kpiData.tasaResolucion}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500" style={{width: `${kpiData.tasaResolucion}%`}}></div>
                    </div>
                    <p className="text-[9px] font-bold text-slate-400 mt-2 uppercase tracking-widest">{kpiData.cerradosMes} CERRADOS DE {kpiData.reclamosMes} ABIERTOS</p>
                  </div>
                </div>

                {/* TARJETA 2: Lead Time */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Lead Time Promedio</h3>
                      <p className="text-[9px] font-bold text-slate-400 mt-1 uppercase">Apertura a Cierre</p>
                    </div>
                    <div className="p-2 bg-blue-50 rounded-xl"><Timer size={16} className="text-blue-500"/></div>
                  </div>
                  <div>
                    <div className="flex items-baseline gap-1 mb-2">
                      <span className="text-3xl font-black text-slate-800 leading-none">{kpiData.leadTime}</span>
                      <span className="text-sm font-bold text-slate-400 uppercase">Días</span>
                    </div>
                    <p className="text-[9px] font-bold text-slate-400 mt-2 uppercase tracking-widest">TIEMPO HISTÓRICO DE RESPUESTA</p>
                  </div>
                </div>

                {/* TARJETA 3: Efectividad 1er Contacto */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Eficiencia de Contacto</h3>
                      <p className="text-[9px] font-bold text-slate-400 mt-1 uppercase">Sin Hilos de Insistencia</p>
                    </div>
                    <div className="p-2 bg-purple-50 rounded-xl"><Zap size={16} className="text-purple-500"/></div>
                  </div>
                  <div>
                    <div className="flex items-end gap-2 mb-2">
                      <span className="text-3xl font-black text-slate-800 leading-none">{kpiData.efectividadPrimerContacto}%</span>
                    </div>
                     <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-purple-500" style={{width: `${kpiData.efectividadPrimerContacto}%`}}></div>
                    </div>
                    <p className="text-[9px] font-bold text-slate-400 mt-2 uppercase tracking-widest">RESUELTOS CON 1 SOLO AVISO</p>
                  </div>
                </div>

                 {/* TARJETA 4: Tickets Totales */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Volumen Histórico</h3>
                      <p className="text-[9px] font-bold text-slate-400 mt-1 uppercase">Total de gestiones</p>
                    </div>
                    <div className="p-2 bg-orange-50 rounded-xl"><ShieldCheck size={16} className="text-orange-500"/></div>
                  </div>
                  <div>
                    <div className="flex items-end gap-2 mb-2">
                      <span className="text-3xl font-black text-slate-800 leading-none">{kpiData.totalGestionados}</span>
                    </div>
                    <p className="text-[9px] font-bold text-slate-400 mt-2 uppercase tracking-widest">TICKETS OPERADOS</p>
                  </div>
                </div>
              </div>

              {/* PARETO TOP OFENSORES */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-2 mb-6">
                  <BarChart2 size={20} className="text-slate-800"/>
                  <h3 className="text-lg font-black uppercase tracking-tight text-slate-800">Top Ofensores (Pareto de Reclamos)</h3>
                </div>
                
                {kpiData.topOfensores.length === 0 ? (
                  <div className="text-center py-10 text-slate-400 text-xs font-bold uppercase tracking-widest">No hay datos suficientes para el Pareto</div>
                ) : (
                  <div className="space-y-4">
                    {kpiData.topOfensores.map((item, idx) => {
                      const maximo = kpiData.topOfensores[0].cantidad;
                      const porcentaje = Math.round((item.cantidad / maximo) * 100);
                      return (
                        <div key={item.id} className="flex items-center gap-4">
                          <div className="w-6 text-center font-black text-slate-300 text-lg">#{idx + 1}</div>
                          <div className="flex-1">
                            <div className="flex justify-between items-end mb-1">
                              <span className="text-xs font-bold text-slate-700 uppercase truncate max-w-[200px] sm:max-w-md">{item.insumo.nombre}</span>
                              <span className="text-xs font-black text-rose-500">{item.cantidad} Reclamos</span>
                            </div>
                            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                              <div className="h-full bg-rose-400 rounded-full transition-all duration-1000" style={{width: `${porcentaje}%`}}></div>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </motion.div>
          )}
          
          <AnimatePresence>
            {modalMensaje && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4">
                <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col">
                  <div className="p-6 bg-slate-900 text-white flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      {modalMensaje.tipo?.includes('GERENCIA') ? <CheckSquare size={18} className="text-indigo-400"/> : <Mail size={18} className="text-sky-400"/>} 
                      <h3 className="font-black uppercase text-sm tracking-widest">
                        {modalMensaje.tipo?.includes('GERENCIA') ? 'Registro de Auditoría' : 'Inspección de Correo'}
                      </h3>
                    </div>
                    <button onClick={() => setModalMensaje(null)} className="text-slate-400 hover:text-white transition-colors"><X/></button>
                  </div>
                  
                  <div className="p-8 space-y-4 max-h-[70vh] overflow-auto bg-slate-50">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Fecha / Hora</p>
                        <p className="font-bold text-sm text-slate-800">{formatearFecha(modalMensaje.fecha)}</p>
                      </div>
                      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Responsable</p>
                        <p className="font-bold text-sm text-slate-800">{modalMensaje.operario}</p>
                      </div>
                    </div>
                    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">
                        {modalMensaje.tipo?.includes('GERENCIA') ? 'Detalle de la Operación' : 'Asunto Oficial'}
                      </p>
                      <p className="font-black text-slate-800 mb-4 pb-4 border-b border-slate-100">{modalMensaje.mensaje}</p>
                      
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">
                        {modalMensaje.tipo?.includes('GERENCIA') ? 'Motivo / Anotación' : 'Cuerpo del Mensaje'}
                      </p>
                      <div className="bg-slate-50 p-4 rounded-lg text-xs font-mono whitespace-pre-wrap border border-slate-100 text-slate-600 leading-relaxed">{modalMensaje.cuerpoOriginal || "Sin detalle."}</div>
                    </div>
                  </div>
                  
                  <div className="p-5 bg-white border-t border-slate-100 flex justify-end">
                    <button onClick={() => setModalMensaje(null)} className="px-8 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest bg-slate-900 text-white hover:bg-slate-800 transition-all active:scale-95 shadow-lg">Cerrar Detalle</button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    );
};

export default VistaAuditoria;
