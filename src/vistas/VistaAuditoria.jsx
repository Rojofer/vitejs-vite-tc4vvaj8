import React, { useState, useMemo } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { motion, AnimatePresence } from 'framer-motion';
import { History, FileSpreadsheet, Search, Filter, X, ChevronRight, Clock, CheckSquare, AlertCircle, Info, FileText, CornerDownRight, Mail, Target, Zap, ShieldCheck, Timer, Users, Copy, Plus, Package } from 'lucide-react';
import { db } from '../firebase';
import { doc, writeBatch, collection, query, where, getDocs, serverTimestamp } from 'firebase/firestore';

const VistaAuditoria = ({ insumos, reclamos, currentUser, formatearFecha, obtenerMesAnio, setToastMsg, cerrarReclamoManual, auditoriaFiltroInsumo, setAuditoriaFiltroInsumo, setActiveInsumo, setDialogoConfirmacion }) => {
    const [filtroMes, setFiltroMes] = useState("TODOS");
    const [filtroTipo, setFiltroTipo] = useState("TODOS"); 
    const [filtroOperario, setFiltroOperario] = useState("TODOS");
    const [busquedaAuditoria, setBusquedaAuditoria] = useState("");
    const [auditoriaTab, setAuditoriaTab] = useState('abiertos');
    const [ordenTabla, setOrdenTabla] = useState('recientes');
    const [expandedRow, setExpandedRow] = useState(null);
    const [modalMensaje, setModalMensaje] = useState(null);
    
    // ESTADOS DE INTERACTIVIDAD DEL DASHBOARD KPI
    const [operarioEnfoque, setOperarioEnfoque] = useState(null);
    const [grupoEnfoque, setGrupoEnfoque] = useState(null);

    // CEREBRO CLASIFICADOR: Deduce la etiqueta visual con su número, texto y color
    const getTipoReclamo = (asunto) => {
      const txt = (asunto || "").toUpperCase();
      if (txt.includes("SOLPED")) return { num: "1", label: "SOLPEDS SIN O/C", style: "bg-sky-50 text-sky-700 border-sky-200" };
      if (txt.includes("AUTORIZAR")) return { num: "2", label: "AUTORIZAR OC", style: "bg-purple-50 text-purple-700 border-purple-200" };
      if (txt.includes("APROBADA DEMORADA")) return { num: "3", label: "O/C DEMORADAS", style: "bg-orange-50 text-orange-700 border-orange-200" };
      if (txt.includes("QUIEBRE")) return { num: "4", label: "RIESGO DE QUIEBRE", style: "bg-red-50 text-red-700 border-red-200" };
      if (txt.includes("ADELANTAR")) return { num: "5", label: "ADELANTAR OC", style: "bg-teal-50 text-teal-700 border-teal-200" };
      return { num: "0", label: "HISTÓRICO", style: "bg-slate-50 text-slate-500 border-slate-200" };
    };

    // --- LÓGICA DE CÁLCULO DE KPIs GERENCIALES (INTERACTIVO CRUZADO) ---
    const kpiData = useMemo(() => {
      // Base general de reclamos válidos
      const validosGlobal = reclamos.filter(r => r.insumoId && r.insumoId !== "BROADCAST" && r.estado !== "INICIALIZADO" && r.tipo !== 'equipo' && r.tipo !== 'APROBACION GERENCIA' && r.tipo !== 'RECHAZO GERENCIA');

      // 1. LISTA DE GRUPOS (Se filtra por el Operario Seleccionado, si lo hay)
      const validosForGrupos = operarioEnfoque ? validosGlobal.filter(r => r.operario === operarioEnfoque) : validosGlobal;
      const conteoGrupos = {};
      validosForGrupos.forEach(r => {
          const ins = insumos.find(i => i.id === r.insumoId);
          const g = ins?.grupo && ins.grupo.trim() !== "" ? ins.grupo.toUpperCase() : 'SIN CLASIFICAR';
          conteoGrupos[g] = (conteoGrupos[g] || 0) + 1;
      });
      const listaGrupos = Object.entries(conteoGrupos).map(([nombre, cantidad]) => ({nombre, cantidad})).sort((a,b) => b.cantidad - a.cantidad);

      // 2. LISTA DE OPERARIOS (Se filtra por el Grupo Seleccionado, si lo hay)
      const validosForOperarios = grupoEnfoque ? validosGlobal.filter(r => {
          const ins = insumos.find(i => i.id === r.insumoId);
          const g = ins?.grupo && ins.grupo.trim() !== "" ? ins.grupo.toUpperCase() : 'SIN CLASIFICAR';
          return g === grupoEnfoque;
      }) : validosGlobal;

      const rankingOperarios = {};
      validosForOperarios.forEach(r => {
        const op = r.operario || "Sin Nombre";
        if (!rankingOperarios[op]) {
          rankingOperarios[op] = { total: 0, cerrados: 0 };
        }
        rankingOperarios[op].total++;
        if (r.estado === 'CERRADO') {
          rankingOperarios[op].cerrados++;
        }
      });
      const listaOperarios = Object.keys(rankingOperarios).map(name => {
        const item = rankingOperarios[name];
        return {
          nombre: name,
          total: item.total,
          efectividad: Math.round((item.cerrados / item.total) * 100)
        };
      }).sort((a, b) => b.total - a.total);

      // 3. MATRIZ DE ENFOQUE (Aplica AMBOS filtros para las tarjetas de KPIs y el Pulso)
      const validos = validosGlobal.filter(r => {
         const ins = insumos.find(i => i.id === r.insumoId);
         const g = ins?.grupo && ins.grupo.trim() !== "" ? ins.grupo.toUpperCase() : 'SIN CLASIFICAR';
         
         const matchOperario = operarioEnfoque ? r.operario === operarioEnfoque : true;
         const matchGrupo = grupoEnfoque ? g === grupoEnfoque : true;
         
         return matchOperario && matchGrupo;
      });

      const hoy = new Date();
      const mesActual = hoy.getMonth();
      const anioActual = hoy.getFullYear();

      // TASA DE EVACUACIÓN (Clearance Rate)
      const abiertosEsteMes = validos.filter(r => {
        const f = r.fecha?.seconds ? new Date(r.fecha.seconds * 1000) : new Date(r.fecha);
        return f && !isNaN(f.getTime()) && f.getMonth() === mesActual && f.getFullYear() === anioActual;
      });
      const cerradosEsteMes = validos.filter(r => {
        if (r.estado !== 'CERRADO' || !r.fechaCierre) return false;
        const f = r.fechaCierre?.seconds ? new Date(r.fechaCierre.seconds * 1000) : new Date(r.fechaCierre);
        return f && !isNaN(f.getTime()) && f.getMonth() === mesActual && f.getFullYear() === anioActual;
      });
      const tasaResolucion = abiertosEsteMes.length > 0 ? Math.round((cerradosEsteMes.length / abiertosEsteMes.length) * 100) : (cerradosEsteMes.length > 0 ? 100 : 0);

      // LEAD TIME PROMEDIO (Días)
      const resueltos = validos.filter(r => r.estado === 'CERRADO' && r.fecha && r.fechaCierre);
      let totalDias = 0;
      resueltos.forEach(r => {
         const fInicio = r.fecha?.seconds ? r.fecha.seconds : new Date(r.fecha).getTime() / 1000;
         const fFin = r.fechaCierre?.seconds ? r.fechaCierre.seconds : new Date(r.fechaCierre).getTime() / 1000;
        totalDias += Math.max(0, (fFin - fInicio) / 86400);
      });
      const leadTime = resueltos.length > 0 ? (totalDias / resueltos.length).toFixed(1) : 0;

      // EFICIENCIA DE CONTACTO
      const conteoPorInsumo = {};
      validos.forEach(r => {
         conteoPorInsumo[r.insumoId] = (conteoPorInsumo[r.insumoId] || 0) + 1;
      });
      let hilosUnicos = 0;
      let hilosMultiples = 0;
      Object.values(conteoPorInsumo).forEach(cant => {
        if (cant === 1) hilosUnicos++;
        else if (cant > 1) hilosMultiples++;
      });
      const totalHilos = hilosUnicos + hilosMultiples;
      const efectividadPrimerContacto = totalHilos > 0 ? Math.round((hilosUnicos / totalHilos) * 100) : 100;

      // BACKLOG OPERATIVO Y CRÍTICO
      const activosBacklog = validos.filter(r => r.estado === 'ABIERTO');
      const activosCriticos = activosBacklog.filter(r => {
        const fInicio = r.fecha?.seconds ? r.fecha.seconds : new Date(r.fecha).getTime() / 1000;
        const ahora = Date.now() / 1000;
        return ((ahora - fInicio) / 86400) > 7; 
      });

      // GRÁFICO DE PULSO LOGÍSTICO: ÚLTIMOS 20 DÍAS CALENDARIO
      const lista20Dias = [];
      for (let i = 19; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        d.setHours(0,0,0,0);
        
        const diaStr = String(d.getDate()).padStart(2, '0');
        const mesStr = String(d.getMonth() + 1).padStart(2, '0');
        
        const totalAlertasDia = validos.filter(r => {
          const fRec = r.fecha?.seconds ? new Date(r.fecha.seconds * 1000) : new Date(r.fecha);
          if (!fRec || isNaN(fRec.getTime())) return false;
          const target = new Date(fRec).setHours(0,0,0,0);
          return target === d.getTime();
        }).length;

        lista20Dias.push({
          label: `${diaStr}/${mesStr}`,
          cantidad: totalAlertasDia
        });
      }
      const maxActividadPulso = Math.max(...lista20Dias.map(d => d.cantidad), 1);

      return {
        tasaResolucion, abiertosEsteMes: abiertosEsteMes.length, cerradosEsteMes: cerradosEsteMes.length,
        leadTime,
        activosBacklog: activosBacklog.length, activosCriticos: activosCriticos.length,
        efectividadPrimerContacto,
        listaOperarios,
        listaGrupos,
        pulsoSemanas: lista20Dias,
        maxActividadPulso
      };
    }, [reclamos, insumos, operarioEnfoque, grupoEnfoque]);

    // --- ACCIONES DE REPORTE KPI ---
    const enviarReporteEmail = () => {
      const body = `REPORTE SEMANAL DE KPIs - PLANTA DEVESA\n\n1. EVACUACIÓN MENSUAL (Clearance Rate): ${kpiData.tasaResolucion}%\n- Cerrados este mes: ${kpiData.cerradosEsteMes}\n- Abiertos este mes: ${kpiData.abiertosEsteMes}\n\n2. BACKLOG ACTIVO: ${kpiData.activosBacklog} tickets en curso\n- Demora Crítica (>7 días sin respuesta): ${kpiData.activosCriticos}\n\n3. LEAD TIME PROMEDIO: ${kpiData.leadTime} días (Tiempo neto de resolución)\n\n4. EFICIENCIA DE CONTACTO: ${kpiData.efectividadPrimerContacto}% (Resueltos sin hilos de insistencia)\n\n---\nGenerado automáticamente desde ERP Planta.`;
      window.open(`mailto:fachaval@devesa.com?subject=Reporte Semanal KPIs - ERP Planta&body=${encodeURIComponent(body)}`, '_blank');
    };

    const exportarKpiPDF = () => {
      const docPdf = new jsPDF();
      docPdf.setFontSize(16);
      docPdf.setFont("helvetica", "bold");
      docPdf.text("TABLERO DE KPIs GERENCIALES - PLANTA DEVESA", 14, 20);
      
      docPdf.setFontSize(9);
      docPdf.setFont("helvetica", "normal");
      docPdf.setTextColor(100);
      docPdf.text(`Fecha de emisión: ${new Date().toLocaleString('es-AR')}`, 14, 28); 
      
      autoTable(docPdf, {
        startY: 35,
        head: [['Indicador', 'Valor', 'Detalle']],
        body: [
          ['Evacuación Mensual', `${kpiData.tasaResolucion}%`, `${kpiData.cerradosEsteMes} cerrados vs ${kpiData.abiertosEsteMes} nuevos`],
          ['Lead Time Promedio', `${kpiData.leadTime} Días`, 'Tiempo neto de resolución'],
          ['Eficiencia de Contacto', `${kpiData.efectividadPrimerContacto}%`, 'Resueltos en el primer aviso'],
          ['Backlog Activo', `${kpiData.activosBacklog} Tickets`, `${kpiData.activosCriticos} tickets con demora crítica (>7 días)`]
        ],
        theme: 'grid',
        headStyles: { fillColor: [15, 23, 42] }
      });
      
      docPdf.save(`Reporte_KPIs_${new Date().toISOString().split('T')[0]}.pdf`);
      setToastMsg("✅ Reporte PDF generado exitosamente.");
      setTimeout(() => setToastMsg(null), 3000);
    };

    // --- FUNCIÓN LOGÍSTICA: CIERRE MASIVO EN BLOQUE ---
    const ejecutarCierreMasivoEnBloque = async (insumoId) => {
      try {
        const batch = writeBatch(db);
        
        const qReclamos = query(
          collection(db, "reclamos"), 
          where("insumoId", "==", insumoId), 
          where("estado", "==", "ABIERTO")
        );
        const snapshot = await getDocs(qReclamos);
        
        snapshot.docs.forEach((documento) => {
          batch.update(doc(db, "reclamos", documento.id), {
            estado: 'CERRADO',
            fechaCierre: serverTimestamp(),
            motivoCierre: `Cierre unificado por ${currentUser.nombre}`
          });
        });

        batch.update(doc(db, "insumos", insumoId), { ticketReclamo: null });

        await batch.commit();
        setExpandedRow(null);
        setToastMsg("✅ Ticket cerrado por completo. Todas las iteraciones pasaron a historial.");
        setTimeout(() => setToastMsg(null), 4000);
      } catch (error) {
        console.error("Error en cierre masivo:", error);
        setToastMsg("⚠️ Error al intentar cerrar el bloque de datos.");
        setTimeout(() => setToastMsg(null), 4000);
      }
    };

    // --- GENERADOR DE DOSSIER DE TRAZABILIDAD PDF ---
    const exportarDossierPDF = (hiloActivo) => {
      const docPdf = new jsPDF();
      const insumo = insumos.find(i => i.id === hiloActivo.insumoId) || {};
      const threadItems = hiloActivo.subReclamos ?
        [...hiloActivo.subReclamos].sort((a,b) => (a.fecha?.seconds||0) - (b.fecha?.seconds||0)) : []; 

      docPdf.setFontSize(16);
      docPdf.setFont("helvetica", "bold");
      docPdf.text("AUDITORÍA", 14, 20);
      
      docPdf.setFontSize(9);
      docPdf.setFont("helvetica", "normal");
      docPdf.setTextColor(100);
      docPdf.text(`Fecha de emisión: ${new Date().toLocaleString('es-AR')}`, 14, 28); 

      docPdf.setDrawColor(200);
      docPdf.setFillColor(248, 250, 252);
      docPdf.rect(14, 35, 182, 25, 'FD'); 
            
      docPdf.setFontSize(11);
      docPdf.setFont("helvetica", "bold");
      docPdf.text(`CÓDIGO: ${insumo.codigo || 'S/C'}`, 18, 49);
      docPdf.text(`MATERIAL: ${insumo.nombre || 'GENERAL'}`, 18, 55);

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

      autoTable(docPdf, {
        startY: 70, 
        head: [['Fecha / Hora', 'Responsable', 'Acción', 'Registro Oficial']],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold' },
        styles: { fontSize: 8, cellPadding: 3 },
        columnStyles: { 0: { cellWidth: 25 }, 1: { cellWidth: 25 }, 2: { cellWidth: 35 }, 3: { cellWidth: 'auto' } }
      });

      docPdf.save(`Trazabilidad_${insumo.nombre || 'Auditoria'}.pdf`);
      setToastMsg("Dossier PDF generado y descargado con éxito.");
      setTimeout(() => setToastMsg(null), 4000);
    };

    // --- DESCARGAR EXCEL BRUTO ---
    const descargarExcelAuditoria = (filtrados) => {
      let csv = "Fecha,Estado,Tipo,Insumo,Mensaje,Operario\n";
      filtrados.forEach(r => { 
        const ins = insumos.find(i => i.id === r.insumoId)?.nombre || 'Eliminado'; 
        const tipoDef = getTipoReclamo(r.mensaje);
        csv += `"${formatearFecha(r.fecha)}","${r.estado}","[${tipoDef.num}] ${tipoDef.label}","${ins}","${r.mensaje}","${r.operario}"\n`; 
      });
      const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement("a"); link.href = URL.createObjectURL(blob);
      link.download = `Auditoria_${new Date().toLocaleDateString('es-AR')}.csv`; link.click();
    };

    // --- LÓGICA DE FILTRADO DE LA TABLA PRINCIPAL ---
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
      if (filtroTipo === "TIPO_5") filtrados = filtrados.filter(r => (r.mensaje || "").toUpperCase().includes("ADELANTAR"));
      if (filtroTipo === "OTRO") filtrados = filtrados.filter(r => {
        const txt = (r.mensaje || "").toUpperCase();
        return !txt.includes("SOLPED") && !txt.includes("AUTORIZAR") && !txt.includes("APROBADA DEMORADA") && !txt.includes("QUIEBRE") && !txt.includes("ADELANTAR");
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

    const hilos = useMemo(() => { 
      const h = []; const m = {}; 
      filtrados.forEach(r => { 
        if (!m[r.insumoId]) { 
          m[r.insumoId] = { ...r, totalReclamos: 1, subReclamos: [r] }; 
          h.push(m[r.insumoId]); 
        } else { 
          m[r.insumoId].totalReclamos += 1; 
          m[r.insumoId].subReclamos.push(r); 
        } 
      }); 
      
      h.sort((a, b) => {
        if (ordenTabla === 'recientes') {
          return (b.fecha?.seconds || 0) - (a.fecha?.seconds || 0);
        } else if (ordenTabla === 'criticos') {
          return (a.fecha?.seconds || 0) - (b.fecha?.seconds || 0);
        } else if (ordenTabla === 'insumo') {
          const insA = insumos.find(i => i.id === a.insumoId)?.nombre || '';
          const insB = insumos.find(i => i.id === b.insumoId)?.nombre || '';
          return insA.localeCompare(insB);
        }
        return 0;
      });

      return h; 
    }, [filtrados, insumos, ordenTabla]);

    return (
      <div className="p-4 md:p-6 h-full w-full relative flex justify-center">
        <div className="w-full max-w-full">
          
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-200 mb-6 pb-2 gap-4">
            <div className="flex gap-6">
              <button onClick={() => setAuditoriaTab('abiertos')} className={`pb-3 font-black text-xs uppercase tracking-widest transition-all border-b-2 -mb-[2px] ${auditoriaTab === 'abiertos' ? 'border-sky-500 text-sky-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>En Curso</button>
              <button onClick={() => setAuditoriaTab('resueltos')} className={`pb-3 font-black text-xs uppercase tracking-widest transition-all border-b-2 -mb-[2px] ${auditoriaTab === 'resueltos' ? 'border-sky-500 text-sky-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>Resueltos</button>
              {currentUser.rol === 'owner' && <button onClick={() => setAuditoriaTab('kpis')} className={`pb-3 font-black text-xs uppercase tracking-widest transition-all border-b-2 -mb-[2px] ${auditoriaTab === 'kpis' ? 'border-orange-500 text-orange-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>Tablero KPIs</button>}
            </div>

            {auditoriaTab === 'kpis' && currentUser.rol === 'owner' && (
              <div className="flex gap-3 mb-2 sm:mb-0">
                <button onClick={exportarKpiPDF} className="bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-800 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-sm transition-all">
                   <FileText size={14} /> Exportar Reporte PDF
                </button>
                <button onClick={enviarReporteEmail} className="bg-slate-900 text-white hover:bg-slate-800 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-sm transition-all">
                   <Mail size={14} /> Generar y Enviar Reporte
                </button>
              </div>
            )}
          </div>

          {(auditoriaTab === 'abiertos' || auditoriaTab === 'resueltos') && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              
              <div className="flex flex-col sm:flex-row flex-wrap gap-4 mb-6">
                <div className="relative flex-1 min-w-[200px]">
                  <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input type="text" placeholder="Buscar código, insumo o asunto..." value={busquedaAuditoria} onChange={e => setBusquedaAuditoria(e.target.value)} className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-sky-500 transition-all shadow-sm" />
                </div>
       
                <select value={ordenTabla} onChange={e => setOrdenTabla(e.target.value)} className="p-3 bg-white border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest outline-none cursor-pointer shadow-sm text-slate-600">
                  <option value="recientes">Más recientes</option>
                  <option value="criticos">Mayor demora</option>
                  <option value="insumo">A-Z Insumo</option>
                </select>

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
                  <option value="TIPO_5">5 - ADELANTAR OC</option>
                  <option value="OTRO">0 - Históricos / Otros</option>
                </select>

                <select value={filtroMes} onChange={e => setFiltroMes(e.target.value)} className="p-3 bg-white border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest outline-none cursor-pointer shadow-sm text-slate-600">
                  <option value="TODOS">Mes: Total</option>
                  {mesesDisponibles.map(m => <option key={m} value={m}>{m}</option>)}
                </select>

                <button onClick={() => descargarExcelAuditoria(filtrados)} className="p-3 bg-emerald-50 text-emerald-600 border border-emerald-200 hover:bg-emerald-100 hover:text-emerald-700 rounded-xl transition-all shadow-sm flex items-center justify-center shrink-0" title="Descargar XLS">
                  <FileSpreadsheet size={18}/>
                </button>
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
              
              <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-x-auto w-full">
                <table className="w-full text-left whitespace-nowrap min-w-[900px]">
                  <thead className="sticky top-0 z-20 shadow-sm">
                    <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      <th className="py-4 px-4 w-12 text-center bg-white rounded-tl-3xl border-b border-slate-200"></th>
                      <th className="py-4 px-4 bg-white border-b border-slate-200 text-center w-24 text-[10px] font-black text-slate-400 uppercase tracking-widest">Nro. Ticket</th>
                      <th className="py-4 px-4 bg-white border-b border-slate-200">Cód. / Insumo</th>
                      <th className="py-4 px-4 bg-white border-b border-slate-200 text-center">Última Act.</th>
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
                        
                        const fInicio = h.fecha?.seconds ? h.fecha.seconds * 1000 : new Date(h.fecha).getTime();
                        const fInicioDia = new Date(fInicio).setHours(0,0,0,0);
                        const hoyDia = new Date().setHours(0,0,0,0);
                        const diasActivo = Math.floor((hoyDia - fInicioDia) / 86400000);
                        const esCritico = diasActivo >= 7;

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
                              <td className="py-4 px-4 text-center align-middle">
                                {insumoAsociado.ticketReclamo ? (
                                  <div className="flex items-center justify-center gap-1.5 group/ticket">
                                    <span className="px-2 py-1 bg-slate-100 rounded-lg text-[10px] font-black text-slate-700 tracking-wide border border-slate-200">
                                      {insumoAsociado.ticketReclamo}
                                    </span>
                                    <button 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        navigator.clipboard.writeText(`[${insumoAsociado.ticketReclamo}]`);
                                        if (setToastMsg) {
                                          setToastMsg(`📋 Copiado: [${insumoAsociado.ticketReclamo}]`);
                                          setTimeout(() => setToastMsg(null), 2000);
                                        }
                                      }}
                                      className="p-1 rounded-md text-slate-400 hover:text-cyan-600 hover:bg-slate-100 opacity-0 group-hover/ticket:opacity-100 transition-all"
                                      title="Copiar Ticket"
                                    >
                                      <Copy size={12} />
                                    </button>
                                  </div>
                                ) : (
                                  <span className="text-slate-400">-</span>
                                )}
                              </td>
                              <td className="py-4 px-4">
                                <div className="flex flex-col">
                                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">CÓDIGO: {insumoAsociado.codigo || 'S/C'}</span>
                                  <span className="text-xs font-black text-slate-800 uppercase flex items-center gap-2">
                                    {insumoAsociado.nombre || 'GENERAL'}
                                    {h.totalReclamos > 1 && <span className="bg-slate-200 text-slate-600 text-[8px] px-1.5 py-0.5 rounded-full">{h.totalReclamos} MSJS</span>}
                                  </span>
                                </div>
                              </td>
                              <td className="py-4 px-4 text-center">
                                <div className="flex flex-col gap-1.5 items-center">
                                  <span className="text-[10px] font-bold text-slate-500">{formatearFecha(h.fecha)}</span>
                                  {h.estado === 'ABIERTO' && (
                                    <span className={`text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded shadow-sm ${esCritico ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-500'}`}>
                                      {diasActivo === 0 ? 'HOY' : `🕒 ${diasActivo} ${diasActivo === 1 ? 'DÍA' : 'DÍAS'} ACTIVO`}
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="py-4 px-4 text-center">
                                {(() => {
                                  const tipo = getTipoReclamo(h.mensaje);
                                  return (
                                    <span className={`text-[9px] font-black border px-2 py-1 rounded flex items-center gap-1.5 mx-auto w-max shadow-sm ${tipo.style}`}>
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
                                    <button 
                                      onClick={(e) => { 
                                        e.stopPropagation(); 
                                        setDialogoConfirmacion({ 
                                          titulo: "Finalizar Ticket Completo", 
                                          mensaje: `¿Confirmás que querés liquidar y cerrar el ticket completo de "${insumoAsociado?.nombre || 'este material'}"? Esto procesará todas las iteraciones en bloque.`, 
                                          textoConfirmar: "Sí, Finalizar", 
                                          colorBoton: "bg-rose-500 hover:bg-rose-600", 
                                          onConfirm: () => ejecutarCierreMasivoEnBloque(h.insumoId) 
                                        }); 
                                      }} 
                                      className="px-2 py-1 bg-rose-50 border border-rose-200 text-rose-600 rounded text-[9px] font-black uppercase tracking-widest hover:bg-rose-100 transition-all shadow-sm flex items-center gap-1"
                                    >
                                      <X size={10} /> Finalizar
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
                                    <td className="py-3 px-4"></td>
                                    <td className="py-3 px-4">
                                      <div className="flex items-center gap-2">
                                        <CornerDownRight size={12} className="text-slate-400" />
                                        <span className="text-[9px] font-black text-slate-400 uppercase">ITERACIÓN #{threadItems.length - iIdx - 1}</span>
                                      </div>
                                    </td>
                                    <td className="py-3 px-4 text-center text-[10px] font-bold text-slate-500">{formatearFecha(item.fecha)}</td>
                                    <td className="py-3 px-4 text-center">
                                      <span className="px-2 py-1 rounded bg-slate-100 text-slate-500 text-[9px] font-black uppercase flex items-center gap-1 mx-auto w-max shadow-xs"><span className="w-1 h-1 rounded-full bg-slate-300"></span> Archivada</span>
                                    </td>
                                    <td className="py-3 px-4 text-center">
                                      <span className={`text-[8px] font-black border px-1.5 py-0.5 rounded flex items-center gap-1 mx-auto w-max shadow-xs ${tipoSub.style}`}>
                                        <span className="bg-white text-current rounded-sm px-1 py-0.1 shadow-xs">{tipoSub.num}</span> 
                                        {tipoSub.label}
                                      </span>
                                    </td>
                                    <td className="py-3 px-4">
                                      <button onClick={(e) => { e.stopPropagation(); setModalMensaje(item); }} className="text-[10px] text-sky-600 hover:text-sky-800 font-bold uppercase truncate max-w-[250px] flex items-center gap-1.5 transition-colors text-left">
                                        <Info size={12} className="shrink-0" /> {item.mensaje}
                                      </button>
                                    </td>
                                    {currentUser.rol === 'owner' && <td className="py-3 px-4 text-[9px] font-black text-slate-500 uppercase">{item.operario}</td>}
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

          {/* TABLERO DE KPIs GERENCIALES */}
          {auditoriaTab === 'kpis' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Evacuación Mensual</h3>
                      <p className="text-[9px] font-bold text-slate-400 mt-1 uppercase">Clearance Rate</p>
                    </div>
                    <div className="p-2 bg-emerald-50 rounded-xl"><Target size={16} className="text-emerald-500"/></div>
                  </div>
                  <div>
                    <div className="flex items-end gap-2 mb-2">
                      <span className="text-3xl font-black text-slate-800 leading-none">{kpiData.tasaResolucion}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className={`h-full ${kpiData.tasaResolucion >= 100 ? 'bg-emerald-500' : 'bg-amber-400'}`} style={{width: `${Math.min(kpiData.tasaResolucion, 100)}%`}}></div>
                    </div>
                    <p className="text-[9px] font-bold text-slate-400 mt-2 uppercase tracking-widest">{kpiData.cerradosEsteMes} CERRADOS VS {kpiData.abiertosEsteMes} NUEVOS</p>
                  </div>
                </div>

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

                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Backlog Activo</h3>
                      <p className="text-[9px] font-bold text-slate-400 mt-1 uppercase">Tickets en Planta</p>
                    </div>
                    <div className="p-2 bg-rose-50 rounded-xl"><AlertCircle size={16} className="text-rose-500"/></div>
                  </div>
                  <div>
                    <div className="flex items-end gap-2 mb-2">
                      <span className="text-3xl font-black text-slate-800 leading-none">{kpiData.activosBacklog}</span>
                    </div>
                    <p className={`text-[9px] font-black mt-2 uppercase tracking-widest ${kpiData.activosCriticos > 0 ? 'text-rose-500' : 'text-slate-400'}`}>
                      {kpiData.activosCriticos > 0 ? `⚠️ ${kpiData.activosCriticos} CON DEMORA CRÍTICA (>7 DÍAS)` : '0 TICKETS VENCIDOS'}
                    </p>
                  </div>
                </div>

                {/* ESPACIO RESERVADO PARA 5TA TARJETA */}
                <div className="bg-slate-50/50 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center p-5 text-center min-h-[140px]">
                   <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center mb-3">
                     <Plus size={16} className="text-slate-400" />
                   </div>
                   <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Nuevo Indicador</span>
                   <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Espacio Reservado</span>
                </div>
              </div>

              {/* GRÁFICO DE PULSO DEL EQUIPO - 20 DÍAS CALENDARIO CON SCROLL HORIZONTAL */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm w-full">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                    <History size={20} className="text-slate-800"/>
                    <div>
                      <h3 className="text-sm font-black uppercase tracking-tight text-slate-800">
                        Pulso del Equipo 
                        {operarioEnfoque && !grupoEnfoque && ` (Operario: ${operarioEnfoque})`}
                        {grupoEnfoque && !operarioEnfoque && ` (Grupo: ${grupoEnfoque})`}
                        {operarioEnfoque && grupoEnfoque && ` (${operarioEnfoque} | ${grupoEnfoque})`}
                      </h3>
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Volumen de interacciones en los últimos 20 días calendario</p>
                    </div>
                  </div>
                  {/* Botón de limpieza rápida si hay filtros activos */}
                  {(operarioEnfoque || grupoEnfoque) && (
                    <button 
                      onClick={() => { setOperarioEnfoque(null); setGrupoEnfoque(null); }}
                      className="text-[9px] font-black uppercase tracking-widest text-sky-600 bg-sky-50 px-3 py-1.5 rounded-lg hover:bg-sky-100 transition-colors"
                    >
                      Limpiar Filtros
                    </button>
                  )}
                </div>
                
                <div className="flex items-end gap-2 sm:gap-4 h-48 pt-6 overflow-x-auto scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent w-full border-b border-slate-100 px-2 pb-2">
                  {kpiData.pulsoSemanas.map((dia, idx) => {
                    const pctAltura = Math.max(8, Math.round((dia.cantidad / kpiData.maxActividadPulso) * 100));
                    return (
                      <div key={idx} className="flex-1 min-w-[40px] max-w-[60px] flex flex-col items-center group relative h-full justify-end shrink-0">
                        
                        <div className="absolute -top-3 opacity-0 group-hover:opacity-100 bg-slate-900 text-white font-black text-[9px] px-1.5 py-0.5 rounded transition-all shadow-md z-30 pointer-events-none">
                          {dia.cantidad}
                        </div>
                        
                        <span className="text-[10px] font-black text-slate-700 mb-1 leading-none">{dia.cantidad}</span>
                        
                        <div 
                          style={{ height: `${pctAltura}%` }} 
                          className={`w-full rounded-t-lg transition-all duration-300 shadow-xs ${
                            dia.cantidad > 0 
                              ? 'bg-gradient-to-t from-indigo-500 to-indigo-400 group-hover:from-indigo-600 group-hover:to-indigo-500' 
                              : 'bg-slate-100'
                          }`}
                        ></div>
                        
                        <span className="text-[8px] font-black text-slate-400 uppercase mt-2 tracking-tighter whitespace-nowrap">{dia.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* RANKING DE GRUPOS DE INSUMOS INTERACTIVO */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                  <div className="flex items-center gap-2 mb-6">
                    <Package size={20} className="text-slate-800"/>
                    <div>
                      <h3 className="text-sm font-black uppercase tracking-tight text-slate-800">
                        Ranking de Grupos
                      </h3>
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Clickeá un grupo para filtrar el tablero</p>
                    </div>
                  </div>
                  
                  {kpiData.listaGrupos.length === 0 ? (
                    <div className="text-center py-10 text-slate-400 text-xs font-bold uppercase tracking-widest">No hay datos de grupos</div>
                  ) : (
                    <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-200">
                      {kpiData.listaGrupos.map((item, idx) => {
                        const maximo = kpiData.listaGrupos[0].cantidad;
                        const porcentaje = Math.round((item.cantidad / maximo) * 100);
                        const isSelected = grupoEnfoque === item.nombre;

                        return (
                          <div 
                            key={item.nombre} 
                            onClick={() => setGrupoEnfoque(isSelected ? null : item.nombre)}
                            className={`flex items-center gap-4 cursor-pointer p-2 rounded-xl transition-all ${isSelected ? 'bg-sky-50 border border-sky-200 shadow-sm' : 'hover:bg-slate-50 border border-transparent'}`}
                          >
                            <div className="w-6 text-center font-black text-slate-300 text-sm">#{idx + 1}</div>
                            <div className="flex-1">
                              <div className="flex justify-between items-end mb-1">
                                <span className="text-xs font-bold text-slate-700 uppercase flex items-center gap-2">
                                  {item.nombre}
                                  {isSelected && <span className="text-[8px] bg-sky-500 text-white px-1.5 py-0.5 rounded shadow-sm">FILTRANDO</span>}
                                </span>
                                <span className="text-xs font-black text-rose-500">{item.cantidad} Reclamos</span>
                              </div>
                              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                                <div className="h-full bg-rose-400 rounded-full" style={{width: `${porcentaje}%`}}></div>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                  <div className="flex items-center gap-2 mb-6">
                    <Users size={20} className="text-slate-800"/>
                    <div>
                      <h3 className="text-sm font-black uppercase tracking-tight text-slate-800">Control de Alertas por Operario</h3>
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Clickeá un operario para filtrar su rendimiento</p>
                    </div>
                  </div>
                  
                  {kpiData.listaOperarios.length === 0 ? (
                    <div className="text-center py-10 text-slate-400 text-xs font-bold uppercase tracking-widest">Sin registros de operarios activos</div>
                  ) : (
                    <div className="overflow-x-auto max-h-[300px] scrollbar-thin scrollbar-thumb-slate-200">
                      <table className="w-full text-left whitespace-nowrap text-xs font-bold">
                        <thead className="sticky top-0 bg-white z-10">
                          <tr className="border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            <th className="pb-3 px-3">Nombre Operario</th>
                            <th className="pb-3 px-3 text-center">Alertas Emitidas</th>
                            <th className="pb-3 px-3 text-right">Efectividad de Cierre</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {kpiData.listaOperarios.map((op) => (
                            <tr 
                              key={op.nombre} 
                              onClick={() => setOperarioEnfoque(operarioEnfoque === op.nombre ? null : op.nombre)}
                              className={`text-slate-700 cursor-pointer transition-colors ${operarioEnfoque === op.nombre ? 'bg-sky-50/80 border-l-4 border-sky-500' : 'hover:bg-slate-50 border-l-4 border-transparent'}`}
                            >
                              <td className="py-3 px-3 uppercase text-slate-800 font-black flex items-center gap-2">
                                {op.nombre}
                                {operarioEnfoque === op.nombre && <span className="text-[8px] bg-sky-500 text-white px-1.5 py-0.5 rounded shadow-sm">FILTRANDO</span>}
                              </td>
                              <td className="py-3 px-3 text-center text-slate-600">{op.total} alertas</td>
                              <td className="py-3 px-3 text-right">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-black ${op.efectividad >= 80 ? 'bg-emerald-50 text-emerald-700' : op.efectividad >= 40 ? 'bg-amber-50 text-amber-700' : 'bg-rose-50 text-rose-700'}`}>
                                  {op.efectividad}% resuelto
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
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
