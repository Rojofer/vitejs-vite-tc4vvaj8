import React, { useState, useMemo } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { motion, AnimatePresence } from 'framer-motion';
import { History, FileSpreadsheet, Search, Filter, X, ChevronRight, CheckSquare, AlertCircle, Info, FileText, CornerDownRight, Mail, MessageSquare, Target, Zap, BarChart2, Timer, Users, Copy, Package, ShoppingCart, Download, Trash2, Megaphone, CheckSquare as CheckIcon, Square } from 'lucide-react';
import { db } from '../firebase';
import { doc, writeBatch, collection, query, where, getDocs, serverTimestamp } from 'firebase/firestore';

const VistaAuditoria = ({ insumos, reclamos, config, currentUser, formatearFecha, obtenerMesAnio, setToastMsg, setDialogoConfirmacion, setActiveInsumo, auditoriaFiltroInsumo, setAuditoriaFiltroInsumo }) => {
    const [filtroMes, setFiltroMes] = useState("TODOS");
    const [filtroTipo, setFiltroTipo] = useState("TODOS"); 
    const [filtroOperario, setFiltroOperario] = useState("TODOS");
    const [filtroResponsable, setFiltroResponsable] = useState("TODOS");
    const [busquedaAuditoria, setBusquedaAuditoria] = useState("");
    const [auditoriaTab, setAuditoriaTab] = useState('abiertos');
    const [ordenTabla, setOrdenTabla] = useState('recientes');
    const [expandedRow, setExpandedRow] = useState(null);
    const [modalMensaje, setModalMensaje] = useState(null);
    
    // ESTADOS KPI Y DASHBOARD
    const [operarioEnfoque, setOperarioEnfoque] = useState(null);
    const [grupoEnfoque, setGrupoEnfoque] = useState(null);
    const [compradorEnfoque, setCompradorEnfoque] = useState(null);
    const [diaEnfoque, setDiaEnfoque] = useState(null); 
    const [busquedaKpi, setBusquedaKpi] = useState("");

    // ESTADOS DEL PANEL DE DESPACHO MANUAL
    const [modalDespacho, setModalDespacho] = useState(false);
    const [operariosSeleccionados, setOperariosSeleccionados] = useState([]);
    const [enviandoMails, setEnviandoMails] = useState(false);

    // CEREBRO CLASIFICADOR
    const getTipoReclamo = (asunto) => {
      const txt = (asunto || "").toUpperCase();
      if (txt.includes("SOLPED")) return { num: "1", label: "SOLPEDS SIN O/C", style: "bg-sky-50 text-sky-700 border-sky-200" };
      if (txt.includes("AUTORIZAR")) return { num: "2", label: "AUTORIZAR OC", style: "bg-purple-50 text-purple-700 border-purple-200" };
      if (txt.includes("APROBADA DEMORADA")) return { num: "3", label: "O/C DEMORADAS", style: "bg-orange-50 text-orange-700 border-orange-200" };
      if (txt.includes("QUIEBRE")) return { num: "4", label: "RIESGO DE QUIEBRE", style: "bg-red-50 text-red-700 border-red-200" };
      if (txt.includes("ADELANTAR")) return { num: "5", label: "ADELANTAR OC", style: "bg-teal-50 text-teal-700 border-teal-200" };
      return { num: "0", label: "HISTÓRICO", style: "bg-slate-50 text-slate-500 border-slate-200" };
    };

    const extraerComprador = (cuerpo) => {
      if (!cuerpo) return 'SIN ASIGNAR';
      const txt = cuerpo.toUpperCase();
      if (!txt.includes("RESP:")) return 'SIN ASIGNAR';
      const rawPart = txt.split("RESP:")[1];

      if (rawPart.includes('ARGÜERO') || rawPart.includes('ARGUERO') || rawPart.includes('HERNÁN')) return 'HERNÁN ARGÜERO (G03)';
      if (rawPart.includes('LILIAN') || rawPart.includes('SAMANIEGO')) return 'LILIAN SAMANIEGO (G04)';
      if (rawPart.includes('JOANNY') || rawPart.includes('ROMERO')) return 'JOANNY G. ROMERO (G05)';
      if (rawPart.includes('ROBERTO') || rawPart.includes('SOSA')) return 'ROBERTO SOSA (G06)';
      if (rawPart.includes('EZEQUIEL') || rawPart.includes('ZANON')) return 'EZEQUIEL ZANON (G07)';
      if (rawPart.includes('MARTÍN') || rawPart.includes('MARTIN') || rawPart.includes('ESTREBOU')) return 'MARTÍN ESTREBOU (G08)';
      if (rawPart.includes('NAHUEL') || rawPart.includes('JUMILL')) return 'NAHUEL JOSE JUMILLA (G09)';
      if (rawPart.includes('LUCAS') || rawPart.includes('JIMENEZ') || rawPart.includes('JIMÉNEZ')) return 'LUCAS A. JIMENEZ (G10)';

      const fallbackMatch = rawPart.match(/\s*([A-ZÁÉÍÓÚÑ]+)/);
      return fallbackMatch ? fallbackMatch[1].trim() : 'SIN ASIGNAR';
    };

    const mesesDisponibles = useMemo(() => { 
      const validos = reclamos.filter(r => r.insumoId && r.insumoId !== "BROADCAST" && r.estado !== "INICIALIZADO");
      return Array.from(new Set(validos.map(r => obtenerMesAnio(r.fecha)))).sort((a, b) => { 
        if (a === "Sin Fecha") return 1; if (b === "Sin Fecha") return -1; 
        const ordenMeses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']; 
        return Number(b.split(" ")[1]) - Number(a.split(" ")[1]) || ordenMeses.indexOf(b.split(" ")[0]) - ordenMeses.indexOf(a.split(" ")[0]); 
      }); 
    }, [reclamos]);

    // --- LÓGICA DE RESUMEN PARA EL PANEL DE DESPACHO ---
    // --- LÓGICA DE RESUMEN PARA EL PANEL DE DESPACHO ---
    const resumenOperarios = useMemo(() => {
      const mapa = {};
      
      // Normalizador anti-tildes
      const normalize = (str) => (str || '').normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toUpperCase();

      const obtenerNombreReal = (rawName) => {
        const txt = normalize(rawName);
        if (!config || !config.contactos) return txt;
        
        const contacto = config.contactos.find(c => 
          normalize(c.alias) === txt || normalize(c.label) === txt
        );
        return contacto && contacto.label ? normalize(contacto.label) : txt;
      };

      // Usa estrictamente el deslizador de "Email" (el morado)
      let umbral = 30;
      if (config && config.umbralMailRiesgo !== undefined) {
         umbral = Number(config.umbralMailRiesgo);
      }

      // 1. Detectar Huérfanos (Fórmula Pura)
      insumos.forEach(ins => {
        const stockActual = Number(ins.stockActual) || 0;
        const consumoPromedio = Number(ins.consumoPromedio) || 0;
        const consumoDiario = consumoPromedio > 0 ? (consumoPromedio / 26) : 0;
        
        let coberturaReal = 999;
        if (consumoDiario > 0) {
          coberturaReal = stockActual / consumoDiario;
        } else if (stockActual === 0) {
          coberturaReal = 0;
        }

        if (!ins.discontinuado && ins.favorito && Math.round(ins.supervivencia) <= umbral && ins.escalados === 0) {
          const opUnificado = obtenerNombreReal(ins.owner);
          if (!mapa[opUnificado]) mapa[opUnificado] = { nombre: opUnificado, huerfanos: 0, activos: 0 };
          mapa[opUnificado].huerfanos++;
        }
      });

      // 2. Detectar Tickets Activos
      reclamos.forEach(r => {
        if (r.estado === 'ABIERTO' && r.tipo !== 'equipo') {
          const opUnificado = obtenerNombreReal(r.operario);
          if (!mapa[opUnificado]) mapa[opUnificado] = { nombre: opUnificado, huerfanos: 0, activos: 0 };
          mapa[opUnificado].activos++;
        }
      });

      return Object.values(mapa).sort((a, b) => a.nombre.localeCompare(b.nombre));
    }, [insumos, reclamos, config]);

    // --- ACCIÓN DE DESPACHO MANUAL AL SERVIDOR (APPS SCRIPT) ---
    const ejecutarDespachoManual = async () => {
      if (operariosSeleccionados.length === 0) return;
      setEnviandoMails(true);

      try {
        // ==============================================================================
        // ⚠️ IMPORTANTE FERNANDO: Pegá acá la URL de tu Web App de Google Apps Script ⚠️
        // ==============================================================================
        const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbweto_anTsSu9w_KI_cEbdwoQQix4op6uV_TuhdZVENL5KCTgFy4hOrEaKEPtJjtVBW/exec"; 
        
        await fetch(SCRIPT_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' }, // text/plain evita bloqueos CORS
          body: JSON.stringify({ seleccionados: operariosSeleccionados })
        });

        setToastMsg(`✅ Reportes enviados con éxito a ${operariosSeleccionados.length} operarios.`);
        setModalDespacho(false);
        setOperariosSeleccionados([]);
      } catch (error) {
        console.error(error);
        setToastMsg("⚠️ Error al conectarse con el servidor de correos.");
      } finally {
        setEnviandoMails(false);
      }
    };

    // --- LÓGICA DE CÁLCULO DE KPIs GERENCIALES ---
    const kpiData = useMemo(() => {
      const validosInteracciones = reclamos.filter(r => {
        if (!r.insumoId || r.insumoId === "BROADCAST" || r.estado === "INICIALIZADO" || r.tipo === 'equipo') return false;
        
        if (busquedaKpi.trim()) {
            const ins = insumos.find(i => i.id === r.insumoId);
            const term = busquedaKpi.toLowerCase();
            return (ins?.nombre || "").toLowerCase().includes(term) || 
                   (ins?.codigo || "").toLowerCase().includes(term) ||
                   (ins?.ticketReclamo || "").toLowerCase().includes(term) ||
                   (r.cuerpoOriginal || "").toLowerCase().includes(term);
        }
        return true;
      });
      
      let insumosActivosEnDia = null;
      if (diaEnfoque) {
          const activosDia = validosInteracciones.filter(r => {
              const f = r.fecha?.seconds ? new Date(r.fecha.seconds * 1000) : new Date(r.fecha);
              if (!f || isNaN(f.getTime())) return false;
              const dStr = `${String(f.getDate()).padStart(2, '0')}/${String(f.getMonth() + 1).padStart(2, '0')}`;
              return dStr === diaEnfoque;
          });
          insumosActivosEnDia = new Set(activosDia.map(a => a.insumoId));
      }
      const cumpleDia = (insumoId) => !insumosActivosEnDia || insumosActivosEnDia.has(insumoId);

      const mapaTickets = {};
      validosInteracciones.forEach(r => {
        if (!mapaTickets[r.insumoId]) {
          mapaTickets[r.insumoId] = { ...r, interaccionesTotal: 1, fechaInicioReal: r.fecha };
        } else {
          mapaTickets[r.insumoId].interaccionesTotal += 1;
          const tActual = r.fecha?.seconds || 0;
          const tGuardado = mapaTickets[r.insumoId].fecha?.seconds || 0;
          
          if (r.estado === 'ABIERTO') mapaTickets[r.insumoId].estado = 'ABIERTO'; 
          if (tActual < (mapaTickets[r.insumoId].fechaInicioReal?.seconds || Infinity)) {
             mapaTickets[r.insumoId].fechaInicioReal = r.fecha; 
          }
          if (tActual > tGuardado) {
             mapaTickets[r.insumoId].cuerpoOriginal = r.cuerpoOriginal;
             mapaTickets[r.insumoId].mensaje = r.mensaje;
             mapaTickets[r.insumoId].tipo = r.tipo;
             mapaTickets[r.insumoId].operario = r.operario;
             mapaTickets[r.insumoId].fechaCierre = r.fechaCierre; 
             mapaTickets[r.insumoId].fecha = r.fecha; 
          }
        }
      });

      const validosTickets = Object.values(mapaTickets);
      const ticketsMes = filtroMes === "TODOS" ? validosTickets : validosTickets.filter(r => obtenerMesAnio(r.fecha) === filtroMes);

      const ticketsParaGrupos = ticketsMes.filter(r => {
          const comp = extraerComprador(r.cuerpoOriginal);
          return (!operarioEnfoque || r.operario === operarioEnfoque) && (!compradorEnfoque || comp === compradorEnfoque) && cumpleDia(r.insumoId);
      });
      const conteoGrupos = {};
      ticketsParaGrupos.forEach(r => {
          const ins = insumos.find(i => i.id === r.insumoId);
          const g = ins?.grupo && ins.grupo.trim() !== "" ? ins.grupo.toUpperCase() : 'SIN CLASIFICAR';
          conteoGrupos[g] = (conteoGrupos[g] || 0) + 1;
      });
      const listaGrupos = Object.entries(conteoGrupos).map(([nombre, cantidad]) => ({nombre, cantidad})).sort((a,b) => b.cantidad - a.cantidad);

      const ticketsParaCompradores = ticketsMes.filter(r => {
          const ins = insumos.find(i => i.id === r.insumoId);
          const g = ins?.grupo && ins.grupo.trim() !== "" ? ins.grupo.toUpperCase() : 'SIN CLASIFICAR';
          return (!grupoEnfoque || g === grupoEnfoque) && (!operarioEnfoque || r.operario === operarioEnfoque) && cumpleDia(r.insumoId);
      });
      const rankingComps = {};
      ticketsParaCompradores.forEach(r => {
        const tipo = getTipoReclamo(r.mensaje);
        if (tipo.num === "2" || r.tipo === 'APROBACION GERENCIA') return; 
        const comp = extraerComprador(r.cuerpoOriginal);
        if (!rankingComps[comp]) rankingComps[comp] = { total: 0, cerrados: 0 };
        rankingComps[comp].total++;
        if (r.estado === 'CERRADO') rankingComps[comp].cerrados++;
      });
      const listaCompradores = Object.entries(rankingComps).map(([nombre, data]) => ({
        nombre, total: data.total, efectividad: Math.round((data.cerrados / data.total) * 100)
      })).sort((a,b) => b.total - a.total);

      const ticketsParaOperarios = ticketsMes.filter(r => {
          const ins = insumos.find(i => i.id === r.insumoId);
          const g = ins?.grupo && ins.grupo.trim() !== "" ? ins.grupo.toUpperCase() : 'SIN CLASIFICAR';
          const comp = extraerComprador(r.cuerpoOriginal);
          return (!grupoEnfoque || g === grupoEnfoque) && 
                 (!compradorEnfoque || comp === compradorEnfoque) && 
                 cumpleDia(r.insumoId);
      });
      
      const rankingOperarios = {};
      ticketsParaOperarios.forEach(r => {
        const op = r.operario || "Sin Nombre";
        if (!rankingOperarios[op]) rankingOperarios[op] = { total: 0, cerrados: 0 };
        rankingOperarios[op].total++;
        if (r.estado === 'CERRADO') rankingOperarios[op].cerrados++;
      });
      const listaOperarios = Object.keys(rankingOperarios).map(name => {
        return { nombre: name, total: rankingOperarios[name].total, efectividad: Math.round((rankingOperarios[name].cerrados / rankingOperarios[name].total) * 100) };
      }).sort((a, b) => a.nombre.localeCompare(b.nombre));

      const ticketsDashboard = ticketsMes.filter(r => {
         const ins = insumos.find(i => i.id === r.insumoId);
         const g = ins?.grupo && ins.grupo.trim() !== "" ? ins.grupo.toUpperCase() : 'SIN CLASIFICAR';
         const comp = extraerComprador(r.cuerpoOriginal);
         return (!operarioEnfoque || r.operario === operarioEnfoque) && (!grupoEnfoque || g === grupoEnfoque) && (!compradorEnfoque || comp === compradorEnfoque) && cumpleDia(r.insumoId);
      });

      const determinarSiEsDelMes = (f) => {
         if (!f || isNaN(f.getTime())) return false;
         if (filtroMes !== "TODOS") return obtenerMesAnio(f) === filtroMes;
         return f.getMonth() === new Date().getMonth() && f.getFullYear() === new Date().getFullYear();
      };
      
      const abiertosEnElPeriodo = ticketsDashboard.filter(r => r.fechaInicioReal && determinarSiEsDelMes(new Date(r.fechaInicioReal.seconds ? r.fechaInicioReal.seconds * 1000 : r.fechaInicioReal)));
      const cerradosEnElPeriodo = ticketsDashboard.filter(r => r.estado === 'CERRADO' && r.fechaCierre && determinarSiEsDelMes(new Date(r.fechaCierre.seconds ? r.fechaCierre.seconds * 1000 : r.fechaCierre)));
      const tasaResolucion = abiertosEnElPeriodo.length > 0 ? Math.round((cerradosEnElPeriodo.length / abiertosEnElPeriodo.length) * 100) : (cerradosEnElPeriodo.length > 0 ? 100 : 0);

      const resueltos = ticketsDashboard.filter(r => r.estado === 'CERRADO' && r.fechaInicioReal && r.fechaCierre);
      let totalDias = 0;
      resueltos.forEach(r => {
         const fInicio = r.fechaInicioReal?.seconds ? r.fechaInicioReal.seconds : new Date(r.fechaInicioReal).getTime() / 1000;
         const fFin = r.fechaCierre?.seconds ? r.fechaCierre.seconds : new Date(r.fechaCierre).getTime() / 1000;
        totalDias += Math.max(0, (fFin - fInicio) / 86400);
      });
      const leadTime = resueltos.length > 0 ? (totalDias / resueltos.length).toFixed(1) : 0;

      let hilosUnicos = 0; let hilosMultiples = 0;
      ticketsDashboard.forEach(t => { if (t.interaccionesTotal === 1) hilosUnicos++; else if (t.interaccionesTotal > 1) hilosMultiples++; });
      const efectividadPrimerContacto = (hilosUnicos + hilosMultiples) > 0 ? Math.round((hilosUnicos / (hilosUnicos + hilosMultiples)) * 100) : 100;

      const pendientesGerencia = ticketsDashboard.filter(r => (getTipoReclamo(r.mensaje).num === "2" || r.tipo === 'APROBACION GERENCIA') && r.estado === 'ABIERTO').length;

      const ticketsTiempoReal = validosTickets.filter(r => {
        const ins = insumos.find(i => i.id === r.insumoId);
        const g = ins?.grupo && ins.grupo.trim() !== "" ? ins.grupo.toUpperCase() : 'SIN CLASIFICAR';
        const comp = extraerComprador(r.cuerpoOriginal);
        return (!operarioEnfoque || r.operario === operarioEnfoque) && (!grupoEnfoque || g === grupoEnfoque) && (!compradorEnfoque || comp === compradorEnfoque) && cumpleDia(r.insumoId);
      });

      const activosBacklog = ticketsTiempoReal.filter(r => r.estado === 'ABIERTO');
      const activosCriticos = activosBacklog.filter(r => {
        const fInicio = r.fechaInicioReal?.seconds ? r.fechaInicioReal.seconds : new Date(r.fechaInicioReal).getTime() / 1000;
        return ((Date.now() / 1000 - fInicio) / 86400) > 7; 
      });

      const interaccionesTiempoReal = validosInteracciones.filter(r => {
        const ins = insumos.find(i => i.id === r.insumoId);
        const g = ins?.grupo && ins.grupo.trim() !== "" ? ins.grupo.toUpperCase() : 'SIN CLASIFICAR';
        const comp = extraerComprador(r.cuerpoOriginal);
        return (!operarioEnfoque || r.operario === operarioEnfoque) && (!grupoEnfoque || g === grupoEnfoque) && (!compradorEnfoque || comp === compradorEnfoque);
      });

      const lista20Dias = [];
      for (let i = 19; i >= 0; i--) {
        const d = new Date(); d.setDate(d.getDate() - i); d.setHours(0,0,0,0);
        const totalAlertasDia = interaccionesTiempoReal.filter(r => {
          const fRec = r.fecha?.seconds ? new Date(r.fecha.seconds * 1000) : new Date(r.fecha);
          return fRec && !isNaN(fRec.getTime()) && new Date(fRec).setHours(0,0,0,0) === d.getTime();
        }).length;
        lista20Dias.push({ label: `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`, cantidad: totalAlertasDia });
      }
      const maxActividadPulso = Math.max(...lista20Dias.map(d => d.cantidad), 1);

      const listaInsumos = ticketsDashboard.map(t => {
          const ins = insumos.find(i => i.id === t.insumoId) || {};
          const comp = extraerComprador(t.cuerpoOriginal);
          const g = ins.grupo && ins.grupo.trim() !== "" ? ins.grupo.toUpperCase() : 'SIN CLASIFICAR';
          return {
              insumoId: t.insumoId,
              nombre: ins.nombre || 'GENERAL',
              codigo: ins.codigo || 'S/C',
              grupo: g,
              comprador: comp,
              estado: t.estado,
              operario: t.operario,
              interacciones: t.interaccionesTotal,
              insumoAsociado: ins
          };
      }).sort((a, b) => b.interacciones - a.interacciones); 

      return {
        tasaResolucion, abiertosEsteMes: abiertosEnElPeriodo.length, cerradosEsteMes: cerradosEnElPeriodo.length,
        leadTime, activosBacklog: activosBacklog.length, activosCriticos: activosCriticos.length, pendientesGerencia,
        efectividadPrimerContacto, listaOperarios, listaGrupos, listaCompradores, listaInsumos,
        pulsoSemanas: lista20Dias, maxActividadPulso
      };
    }, [reclamos, insumos, operarioEnfoque, grupoEnfoque, compradorEnfoque, diaEnfoque, filtroMes, busquedaKpi]);

    const enviarReporteEmail = () => {
      const body = `REPORTE SEMANAL DE KPIs - PLANTA DEVESA\n\n1. EVACUACIÓN MENSUAL: ${kpiData.tasaResolucion}%\n2. BACKLOG ACTIVO: ${kpiData.activosBacklog} tickets\n3. LEAD TIME PROMEDIO: ${kpiData.leadTime} días\n4. EFICIENCIA DE CONTACTO: ${kpiData.efectividadPrimerContacto}%\n\nGenerado desde ERP Planta.`;
      window.open(`mailto:fachaval@devesa.com?subject=Reporte Semanal KPIs - ERP Planta&body=${encodeURIComponent(body)}`, '_blank');
    };

    const exportarKpiPDF = () => {
      const docPdf = new jsPDF();
      docPdf.setFontSize(16); docPdf.setFont("helvetica", "bold"); docPdf.text("TABLERO DE KPIs GERENCIALES", 14, 20);
      docPdf.setFontSize(9); docPdf.setFont("helvetica", "normal"); docPdf.text(`Fecha de emisión: ${new Date().toLocaleString('es-AR')}`, 14, 28); 
      autoTable(docPdf, {
        startY: 35, head: [['Indicador', 'Valor']],
        body: [
          ['Evacuación Mensual', `${kpiData.tasaResolucion}% (${kpiData.cerradosEsteMes} cerrados vs ${kpiData.abiertosEsteMes} nuevos)`],
          ['Lead Time Promedio', `${kpiData.leadTime} Días`],
          ['Eficiencia de Contacto', `${kpiData.efectividadPrimerContacto}%`],
          ['Backlog Activo', `${kpiData.activosBacklog} Tickets (${kpiData.activosCriticos} críticos)`]
        ], theme: 'grid', headStyles: { fillColor: [15, 23, 42] }
      });
      docPdf.save(`Reporte_KPIs_${new Date().toISOString().split('T')[0]}.pdf`);
      setToastMsg("✅ Reporte PDF generado exitosamente."); setTimeout(() => setToastMsg(null), 3000);
    };

    const descargarExcelInsumosKpi = () => {
      let csv = "Codigo,Insumo,Grupo,Comprador,Operario,Estado,Interacciones\n";
      kpiData.listaInsumos.forEach(item => { 
        csv += `"${item.codigo}","${item.nombre}","${item.grupo}","${item.comprador}","${item.operario}","${item.estado}","${item.interacciones}"\n`; 
      });
      const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement("a"); link.href = URL.createObjectURL(blob);
      link.download = `Reporte_Materiales_KPI_${new Date().toLocaleDateString('es-AR')}.csv`; link.click();
      setToastMsg("✅ Excel generado con éxito."); setTimeout(() => setToastMsg(null), 3000);
    };

    const ejecutarCierreMasivoEnBloque = async (insumoId) => {
      try {
        const batch = writeBatch(db);
        const qReclamos = query(collection(db, "reclamos"), where("insumoId", "==", insumoId), where("estado", "==", "ABIERTO"));
        const snapshot = await getDocs(qReclamos);
        snapshot.docs.forEach((docSnap) => {
          batch.update(doc(db, "reclamos", docSnap.id), { estado: 'CERRADO', fechaCierre: serverTimestamp(), motivoCierre: `Cierre unificado por ${currentUser.nombre}` });
        });
        batch.update(doc(db, "insumos", insumoId), { ticketReclamo: null });
        await batch.commit();
        setExpandedRow(null); setToastMsg("✅ Ticket cerrado por completo."); setTimeout(() => setToastMsg(null), 4000);
      } catch (error) {
        setToastMsg("⚠️ Error al intentar cerrar el bloque de datos."); setTimeout(() => setToastMsg(null), 4000);
      }
    };

    const ejecutarEliminacionTicket = async (insumoId) => {
      try {
        const batch = writeBatch(db);
        const qReclamos = query(collection(db, "reclamos"), where("insumoId", "==", insumoId), where("estado", "==", "ABIERTO"));
        const snapshot = await getDocs(qReclamos);
        
        snapshot.docs.forEach((docSnap) => {
          batch.delete(doc(db, "reclamos", docSnap.id)); 
        });
        
        batch.update(doc(db, "insumos", insumoId), { ticketReclamo: null });
        await batch.commit();
        setExpandedRow(null); 
        setToastMsg("🗑️ Ticket eliminado de raíz. Métricas purgadas."); 
        setTimeout(() => setToastMsg(null), 4000);
      } catch (error) {
        setToastMsg("⚠️ Error al intentar eliminar el ticket."); 
        setTimeout(() => setToastMsg(null), 4000);
      }
    };

    const exportarDossierPDF = (hiloActivo) => {
      const docPdf = new jsPDF();
      const insumo = insumos.find(i => i.id === hiloActivo.insumoId) || {};
      const threadItems = hiloActivo.subReclamos ? [...hiloActivo.subReclamos].sort((a,b) => (a.fecha?.seconds||0) - (b.fecha?.seconds||0)) : []; 
      docPdf.setFontSize(16); docPdf.setFont("helvetica", "bold"); docPdf.text("AUDITORÍA", 14, 20);
      docPdf.setFontSize(9); docPdf.setFont("helvetica", "normal"); docPdf.text(`Fecha de emisión: ${new Date().toLocaleString('es-AR')}`, 14, 28); 
      docPdf.setDrawColor(200); docPdf.setFillColor(248, 250, 252); docPdf.rect(14, 35, 182, 25, 'FD'); 
      docPdf.setFontSize(11); docPdf.setFont("helvetica", "bold"); docPdf.text(`CÓDIGO: ${insumo.codigo || 'S/C'}`, 18, 49); docPdf.text(`MATERIAL: ${insumo.nombre || 'GENERAL'}`, 18, 55);
      const tableData = threadItems.map((item) => {
        const tipoReclamoDef = getTipoReclamo(item.mensaje);
        return [formatearFecha(item.fecha), (item.operario || "").replace(/➡️/g, '->'), `[${tipoReclamoDef.num}] ${tipoReclamoDef.label}`, item.mensaje + (item.cuerpoOriginal ? `\n\nDetalle: ${item.cuerpoOriginal}` : "")];
      });
      autoTable(docPdf, { startY: 70, head: [['Fecha / Hora', 'Responsable', 'Acción', 'Registro Oficial']], body: tableData, theme: 'grid', headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255] }, styles: { fontSize: 8 } });
      docPdf.save(`Trazabilidad_${insumo.nombre || 'Auditoria'}.pdf`);
      setToastMsg("Dossier PDF generado."); setTimeout(() => setToastMsg(null), 4000);
    };

    const descargarExcelAuditoria = (filtrados) => {
      let csv = "Fecha,Estado,Tipo,Insumo,Comprador,Mensaje,Operario\n";
      filtrados.forEach(r => { 
        const ins = insumos.find(i => i.id === r.insumoId)?.nombre || 'Eliminado'; 
        const tipoDef = getTipoReclamo(r.mensaje);
        const comp = extraerComprador(r.cuerpoOriginal);
        csv += `"${formatearFecha(r.fecha)}","${r.estado}","[${tipoDef.num}] ${tipoDef.label}","${ins}","${comp}","${r.mensaje}","${r.operario}"\n`; 
      });
      const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement("a"); link.href = URL.createObjectURL(blob);
      link.download = `Auditoria_${new Date().toLocaleDateString('es-AR')}.csv`; link.click();
    };

    // --- FILTRADO DE LA HOJA DE SEGUIMIENTO ---
    let filtrados = reclamos.filter(r => r.insumoId !== "BROADCAST" && r.estado !== "INICIALIZADO");
    
    const operariosUnicos = useMemo(() => [...new Set(filtrados.map(r => r.operario).filter(Boolean))].sort(), [filtrados]);
    const responsablesUnicos = useMemo(() => [...new Set(filtrados.map(r => extraerComprador(r.cuerpoOriginal)).filter(r => r !== 'SIN ASIGNAR'))].sort(), [filtrados]);

    if (currentUser.rol !== 'owner') {
      filtrados = filtrados.filter(r => r.operario === currentUser.nombre || (r.operario && r.operario.includes(currentUser.nombre)));
    } else {
      if (filtroOperario !== "TODOS") filtrados = filtrados.filter(r => r.operario === filtroOperario);
    }
    if (filtroResponsable !== "TODOS") filtrados = filtrados.filter(r => extraerComprador(r.cuerpoOriginal) === filtroResponsable);
    if (filtroMes !== "TODOS") filtrados = filtrados.filter(r => obtenerMesAnio(r.fecha) === filtroMes);
    if (filtroTipo !== "TODOS") {
      if (filtroTipo === "TIPO_1") filtrados = filtrados.filter(r => (r.mensaje || "").toUpperCase().includes("SOLPED"));
      if (filtroTipo === "TIPO_2") filtrados = filtrados.filter(r => (r.mensaje || "").toUpperCase().includes("AUTORIZAR"));
      if (filtroTipo === "TIPO_3") filtrados = filtrados.filter(r => (r.mensaje || "").toUpperCase().includes("APROBADA DEMORADA"));
      if (filtroTipo === "TIPO_4") filtrados = filtrados.filter(r => (r.mensaje || "").toUpperCase().includes("QUIEBRE"));
      if (filtroTipo === "TIPO_5") filtrados = filtrados.filter(r => (r.mensaje || "").toUpperCase().includes("ADELANTAR"));
      if (filtroTipo === "OTRO") filtrados = filtrados.filter(r => !/SOLPED|AUTORIZAR|APROBADA DEMORADA|QUIEBRE|ADELANTAR/.test((r.mensaje || "").toUpperCase()));
    }
    
    if (busquedaAuditoria) { 
      const term = busquedaAuditoria.toLowerCase();
      filtrados = filtrados.filter(r => { 
        const ins = insumos.find(i => i.id === r.insumoId); 
        return r.mensaje.toLowerCase().includes(term) || 
               (ins?.nombre || "").toLowerCase().includes(term) || 
               (ins?.codigo || "").toLowerCase().includes(term) || 
               (ins?.ticketReclamo || "").toLowerCase().includes(term) ||
               extraerComprador(r.cuerpoOriginal).toLowerCase().includes(term); 
      });
    }

    if (auditoriaTab === 'abiertos') filtrados = filtrados.filter(r => r.estado === 'ABIERTO' || r.tipo === "APROBACION GERENCIA");
    else if (auditoriaTab === 'resueltos') filtrados = filtrados.filter(r => r.estado === 'CERRADO' && r.tipo !== "APROBACION GERENCIA");
    
    if (auditoriaFiltroInsumo) filtrados = filtrados.filter(r => r.insumoId === auditoriaFiltroInsumo);

    const hilos = useMemo(() => { 
      const m = {}; 
      filtrados.forEach(r => { 
        if (!m[r.insumoId]) m[r.insumoId] = { ...r, totalReclamos: 1, subReclamos: [r] }; 
        else { m[r.insumoId].totalReclamos += 1; m[r.insumoId].subReclamos.push(r); } 
      }); 
      return Object.values(m).sort((a, b) => {
        if (ordenTabla === 'recientes') return (b.fecha?.seconds || 0) - (a.fecha?.seconds || 0);
        if (ordenTabla === 'criticos') return (a.fecha?.seconds || 0) - (b.fecha?.seconds || 0);
        if (ordenTabla === 'insumo') return (insumos.find(i => i.id === a.insumoId)?.nombre || '').localeCompare(insumos.find(i => i.id === b.insumoId)?.nombre || '');
        return 0;
      });
    }, [filtrados, insumos, ordenTabla]);

    const filtrosActivosText = [operarioEnfoque, grupoEnfoque, compradorEnfoque, diaEnfoque ? `Día: ${diaEnfoque}` : null].filter(Boolean).join(' | ');

    return (
      <div className="p-4 md:p-6 h-full w-full relative flex justify-center">
        <div className="w-full max-w-full">
          
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-200 mb-6 pb-2 gap-4">
            <div className="flex gap-6">
              <button onClick={() => setAuditoriaTab('abiertos')} className={`pb-3 font-black text-xs uppercase tracking-widest transition-all border-b-2 -mb-[2px] ${auditoriaTab === 'abiertos' ? 'border-sky-500 text-sky-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>En Curso</button>
              <button onClick={() => setAuditoriaTab('resueltos')} className={`pb-3 font-black text-xs uppercase tracking-widest transition-all border-b-2 -mb-[2px] ${auditoriaTab === 'resueltos' ? 'border-sky-500 text-sky-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>Resueltos</button>
              {currentUser.rol === 'owner' && <button onClick={() => setAuditoriaTab('kpis')} className={`pb-3 font-black text-xs uppercase tracking-widest transition-all border-b-2 -mb-[2px] ${auditoriaTab === 'kpis' ? 'border-orange-500 text-orange-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>Tablero KPIs</button>}
            </div>

            {/* BARRA SUPERIOR DE ACCIONES - AHORA CON BOTÓN DE DESPACHO */}
            {currentUser.rol === 'owner' && (
              <div className="flex items-center gap-3 mb-2 sm:mb-0">
                <button 
                  onClick={() => setModalDespacho(true)} 
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/30 transition-all shrink-0"
                >
                   <Megaphone size={14} /> Notificar Operarios
                </button>

                {auditoriaTab === 'kpis' && (
                  <>
                    <div className="flex items-center gap-2 bg-slate-900 px-3 py-2.5 rounded-xl shadow-sm border border-slate-800 shrink-0">
                      <Package size={14} className="text-sky-400" />
                      <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Activos:</span>
                      <span className="text-[11px] font-black text-white">{kpiData.listaInsumos.length}</span>
                    </div>

                    <div className="relative">
                      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input 
                        type="text" 
                        placeholder="Buscar..." 
                        value={busquedaKpi} 
                        onChange={e => setBusquedaKpi(e.target.value)} 
                        className="pl-8 pr-3 py-2.5 bg-white border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest outline-none focus:border-sky-500 transition-all shadow-sm w-28 sm:w-36"
                      />
                    </div>
                    <select value={filtroMes} onChange={e => setFiltroMes(e.target.value)} className="py-2.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest outline-none cursor-pointer shadow-sm text-slate-700 hover:bg-slate-100 transition-colors">
                      <option value="TODOS">Mes: Total</option>
                      {mesesDisponibles.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                    <button onClick={exportarKpiPDF} className="bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-800 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-sm transition-all hidden md:flex">
                       <FileText size={14} /> PDF
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

          {(auditoriaTab === 'abiertos' || auditoriaTab === 'resueltos') && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              
              <div className="flex flex-col sm:flex-row flex-wrap gap-3 mb-6">
                
                {/* TARJETA DINÁMICA DE TOTALES (TABLAS PRINCIPALES) */}
                <div className="flex items-center gap-2 bg-slate-900 px-4 py-3 rounded-xl shadow-sm border border-slate-800 shrink-0">
                  <FileText size={16} className={auditoriaTab === 'abiertos' ? "text-sky-400" : "text-emerald-400"} />
                  <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">
                    {auditoriaTab === 'abiertos' ? 'En Curso:' : 'Resueltos:'}
                  </span>
                  <span className="text-[12px] font-black text-white">{hilos.length}</span>
                </div>

                <div className="relative flex-1 min-w-[200px]">
                  <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input type="text" placeholder="Buscar código, ticket o asunto..." value={busquedaAuditoria} onChange={e => setBusquedaAuditoria(e.target.value)} className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-sky-500 transition-all shadow-sm" />
                </div>
       
                <select value={ordenTabla} onChange={e => setOrdenTabla(e.target.value)} className="p-3 bg-white border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest outline-none cursor-pointer shadow-sm text-slate-600">
                  <option value="recientes">Más recientes</option>
                  <option value="criticos">Mayor demora</option>
                  <option value="insumo">A-Z Insumo</option>
                </select>

                <select value={filtroResponsable} onChange={e => setFiltroResponsable(e.target.value)} className="p-3 bg-white border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest outline-none cursor-pointer shadow-sm text-slate-600">
                  <option value="TODOS">Responsable: Todos</option>
                  {responsablesUnicos.map(r => <option key={r} value={r}>{r}</option>)}
                </select>

                {currentUser.rol === 'owner' && (
                  <select value={filtroOperario} onChange={e => setFiltroOperario(e.target.value)} className="p-3 bg-white border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest outline-none cursor-pointer shadow-sm text-slate-600">
                    <option value="TODOS">Operario: Todos</option>
                    {operariosUnicos.map(op => <option key={op} value={op}>{op}</option>)}
                  </select>
                )}

                <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)} className="p-3 bg-white border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest outline-none cursor-pointer shadow-sm text-slate-600">
                  <option value="TODOS">Tipos: Todos</option>
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
                <table className="w-full text-left whitespace-nowrap min-w-[1000px]">
                  <thead className="sticky top-0 z-20 shadow-sm">
                    <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      <th className="py-4 px-4 w-12 text-center bg-white rounded-tl-3xl border-b border-slate-200"></th>
                      <th className="py-4 px-4 bg-white border-b border-slate-200 text-center w-24">Nro. Ticket</th>
                      <th className="py-4 px-4 bg-white border-b border-slate-200">Cód. / Insumo</th>
                      <th className="py-4 px-4 bg-white border-b border-slate-200 text-center">Última Act.</th>
                      <th className="py-4 px-4 text-center bg-white border-b border-slate-200">Tipo</th>
                      <th className="py-4 px-4 bg-white border-b border-slate-200 text-left">Comprador</th>
                      <th className="py-4 px-4 bg-white border-b border-slate-200 text-center">Asunto</th>
                      {currentUser.rol === 'owner' && <th className="py-4 px-4 bg-white border-b border-slate-200">Operario</th>}
                      <th className="py-4 px-4 text-right bg-white rounded-tr-3xl border-b border-slate-200">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {hilos.length === 0 ? (
                      <tr>
                        <td colSpan="9" className="py-10 text-center text-slate-400 text-xs font-bold uppercase tracking-widest">No hay registros en la auditoría.</td>
                      </tr>
                    ) : (
                      hilos.map((h, idx) => {
                        const threadItems = h.subReclamos ? [...h.subReclamos].sort((a,b) => (b.fecha?.seconds||0) - (a.fecha?.seconds||0)) : [];
                        const isExpanded = expandedRow === h.insumoId;
                        const insumoAsociado = insumos.find(i => i.id === h.insumoId) || {};
                        const fInicio = h.fecha?.seconds ? h.fecha.seconds * 1000 : new Date(h.fecha).getTime();
                        const diasActivo = Math.floor((new Date().setHours(0,0,0,0) - new Date(fInicio).setHours(0,0,0,0)) / 86400000);

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
                                    <span className="px-2 py-1 bg-slate-100 rounded-lg text-[10px] font-black text-slate-700 tracking-wide border border-slate-200">{insumoAsociado.ticketReclamo}</span>
                                    <button onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(`[${insumoAsociado.ticketReclamo}]`); setToastMsg(`📋 Copiado`); setTimeout(() => setToastMsg(null), 2000); }} className="p-1 rounded-md text-slate-400 hover:text-cyan-600 hover:bg-slate-100 opacity-0 group-hover/ticket:opacity-100 transition-all"><Copy size={12} /></button>
                                  </div>
                                ) : <span className="text-slate-400">-</span>}
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
                                    <span className={`text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded shadow-sm ${diasActivo >= 7 ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-500'}`}>
                                      {diasActivo === 0 ? 'HOY' : `🕒 ${diasActivo} DÍAS`}
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="py-4 px-4 text-center">
                                {(() => {
                                  const tipo = getTipoReclamo(h.mensaje);
                                  return (
                                    <span className={`text-[9px] font-black border px-2 py-1 rounded flex items-center gap-1.5 mx-auto w-max shadow-sm ${tipo.style}`}>
                                      <span className="bg-white text-current rounded-sm px-1.5 py-0.5 shadow-[0_1px_2px_rgba(0,0,0,0.05)]">{tipo.num}</span> {tipo.label}
                                    </span>
                                  );
                                })()}
                              </td>
                              <td className="py-4 px-4 text-[10px] font-black text-slate-600 uppercase tracking-wider text-left">
                                 {extraerComprador(h.cuerpoOriginal)}
                              </td>
                              <td className="py-4 px-4 text-center">
                                <button onClick={(e) => { e.stopPropagation(); setModalMensaje(h); }} className="group relative inline-flex items-center justify-center bg-slate-50 hover:bg-sky-50 border border-slate-200 hover:border-sky-200 px-3 py-1.5 rounded-lg transition-all" title="Leer Asunto">
                                  <Mail size={14} className="text-slate-400 group-hover:hidden" />
                                  <MessageSquare size={14} className="hidden group-hover:block text-sky-500" />
                                  <span className="ml-2 text-[10px] font-black text-slate-500 group-hover:text-sky-600 uppercase tracking-widest">Leer</span>
                                </button>
                              </td>
                              {currentUser.rol === 'owner' && <td className="py-4 px-4 text-[9px] font-black text-slate-700 uppercase tracking-wide">{h.operario}</td>}
                              <td className="py-4 px-4 text-right">
                                <div className="flex items-center justify-end gap-3">
                                  {h.estado === 'ABIERTO' && (currentUser.rol === 'owner' || h.operario?.trim().toLowerCase() === currentUser.nombre?.trim().toLowerCase() || h.operario?.trim().toLowerCase() === currentUser.aliasMatch?.trim().toLowerCase()) && (
                                    <button onClick={(e) => { e.stopPropagation(); setDialogoConfirmacion({ titulo: "Finalizar Ticket", mensaje: `¿Confirmás el cierre del ticket de "${insumoAsociado?.nombre}"? Se guardará en el histórico.`, textoConfirmar: "Sí, Finalizar", colorBoton: "bg-rose-500 hover:bg-rose-600", onConfirm: () => ejecutarCierreMasivoEnBloque(h.insumoId) }); }} className="px-2 py-1 bg-rose-50 border border-rose-200 text-rose-600 rounded text-[9px] font-black uppercase tracking-widest hover:bg-rose-100 transition-all shadow-sm flex items-center gap-1"><X size={10} /> Finalizar</button>
                                  )}
                                  
                                  {currentUser.rol === 'owner' && (
                                    <>
                                      <button onClick={(e) => { e.stopPropagation(); exportarDossierPDF(h); }} className="p-1.5 text-slate-400 hover:text-sky-600 hover:bg-sky-50 rounded transition-all" title="Exportar Trazabilidad"><FileText size={16} /></button>
                                      {h.estado === 'ABIERTO' && (
                                        <button 
                                          onClick={(e) => { 
                                            e.stopPropagation(); 
                                            setDialogoConfirmacion({ 
                                              titulo: "Eliminar Error", 
                                              mensaje: `¿Vas a ELIMINAR DE RAÍZ el ticket de "${insumoAsociado?.nombre}"? Esto borrará físicamente el registro para no afectar los KPIs.`, 
                                              textoConfirmar: "Sí, Eliminar Físicamente", 
                                              colorBoton: "bg-red-600 hover:bg-red-700", 
                                              onConfirm: () => ejecutarEliminacionTicket(h.insumoId) 
                                            }); 
                                          }} 
                                          className="p-1.5 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded transition-all" 
                                          title="Eliminar por Error (Hard Delete)"
                                        >
                                          <Trash2 size={16} />
                                        </button>
                                      )}
                                    </>
                                  )}
                                </div>
                              </td>
                            </tr>

                            <AnimatePresence>
                              {isExpanded && threadItems.slice(1).map((item, iIdx) => {
                                const tipoSub = getTipoReclamo(item.mensaje);
                                return (
                                  <motion.tr key={item.id || iIdx} onClick={() => setActiveInsumo(insumoAsociado)} initial={{ opacity: 0, backgroundColor: "#f8fafc" }} animate={{ opacity: 1, backgroundColor: "#f8fafc" }} exit={{ opacity: 0 }} className="border-b border-slate-100/50 align-middle cursor-pointer">
                                    <td className="py-3 px-4"></td><td className="py-3 px-4"></td>
                                    <td className="py-3 px-4">
                                      <div className="flex items-center gap-2"><CornerDownRight size={12} className="text-slate-400" /><span className="text-[9px] font-black text-slate-400 uppercase">ITERACIÓN #{threadItems.length - iIdx - 1}</span></div>
                                    </td>
                                    <td className="py-3 px-4 text-center text-[10px] font-bold text-slate-500">{formatearFecha(item.fecha)}</td>
                                    <td className="py-3 px-4 text-center">
                                      <span className={`text-[8px] font-black border px-1.5 py-0.5 rounded flex items-center gap-1 mx-auto w-max shadow-xs ${tipoSub.style}`}><span className="bg-white text-current rounded-sm px-1 py-0.1 shadow-xs">{tipoSub.num}</span> {tipoSub.label}</span>
                                    </td>
                                    <td className="py-3 px-4 text-[9px] font-bold text-slate-400 uppercase tracking-widest text-left">
                                      {extraerComprador(item.cuerpoOriginal)}
                                    </td>
                                    <td className="py-3 px-4 text-center">
                                      <button onClick={(e) => { e.stopPropagation(); setModalMensaje(item); }} className="group relative inline-flex items-center justify-center bg-slate-50 hover:bg-sky-50 border border-slate-200 hover:border-sky-200 px-3 py-1.5 rounded-lg transition-all" title="Leer Asunto">
                                        <Mail size={14} className="text-slate-400 group-hover:hidden" />
                                        <MessageSquare size={14} className="hidden group-hover:block text-sky-500" />
                                        <span className="ml-2 text-[10px] font-black text-slate-500 group-hover:text-sky-600 uppercase tracking-widest">Leer</span>
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

          {/* TABLERO DE KPIs GERENCIALES INTERACTIVOS */}
          {auditoriaTab === 'kpis' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">

              {filtroMes !== "TODOS" && (
                <div className="bg-orange-50 border border-orange-200 text-orange-800 px-4 py-3 rounded-xl flex items-center gap-3">
                  <AlertCircle size={18} />
                  <div>
                    <h4 className="text-xs font-black uppercase">Modo Histórico Activado: {filtroMes}</h4>
                    <p className="text-[10px] font-bold opacity-80 uppercase tracking-widest">Las métricas reflejan exclusivamente este período.</p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Evacuación {filtroMes !== "TODOS" ? 'del Mes' : 'Actual'}</h3>
                      <p className="text-[9px] font-bold text-slate-400 mt-1 uppercase">Clearance Rate</p>
                    </div>
                    <div className="p-2 bg-emerald-50 rounded-xl"><Target size={16} className="text-emerald-500"/></div>
                  </div>
                  <div>
                    <div className="flex items-end gap-2 mb-2"><span className="text-3xl font-black text-slate-800 leading-none">{kpiData.tasaResolucion}%</span></div>
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
                    <div className="flex items-baseline gap-1 mb-2"><span className="text-3xl font-black text-slate-800 leading-none">{kpiData.leadTime}</span><span className="text-sm font-bold text-slate-400 uppercase">Días</span></div>
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
                    <div className="flex items-end gap-2 mb-2"><span className="text-3xl font-black text-slate-800 leading-none">{kpiData.efectividadPrimerContacto}%</span></div>
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
                      <p className="text-[9px] font-bold text-slate-400 mt-1 uppercase">Tickets en Planta Hoy</p>
                    </div>
                    <div className="p-2 bg-rose-50 rounded-xl"><AlertCircle size={16} className="text-rose-500"/></div>
                  </div>
                  <div>
                    <div className="flex items-end gap-2 mb-2"><span className="text-3xl font-black text-slate-800 leading-none">{kpiData.activosBacklog}</span></div>
                    <p className={`text-[9px] font-black mt-2 uppercase tracking-widest ${kpiData.activosCriticos > 0 ? 'text-rose-500' : 'text-slate-400'}`}>{kpiData.activosCriticos > 0 ? `⚠️ ${kpiData.activosCriticos} CON DEMORA CRÍTICA (>7 DÍAS)` : '0 TICKETS VENCIDOS'}</p>
                  </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Firmas Gerencia</h3>
                      <p className="text-[9px] font-bold text-slate-400 mt-1 uppercase">O/C por Autorizar</p>
                    </div>
                    <div className="p-2 bg-indigo-50 rounded-xl"><CheckSquare size={16} className="text-indigo-500"/></div>
                  </div>
                  <div>
                    <div className="flex items-end gap-2 mb-2"><span className="text-3xl font-black text-slate-800 leading-none">{kpiData.pendientesGerencia}</span></div>
                    <p className={`text-[9px] font-black mt-2 uppercase tracking-widest ${kpiData.pendientesGerencia > 0 ? 'text-indigo-600' : 'text-slate-400'}`}>
                      {kpiData.pendientesGerencia > 0 ? 'TICKETS ESPERANDO FIRMA' : 'TODO AL DÍA'}
                    </p>
                  </div>
                </div>
              </div>

              {/* GRILLAS Y TABLAS INFERIORES... */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm w-full">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
                  <div className="flex items-center gap-2">
                    <History size={20} className="text-slate-800"/>
                    <div>
                      <h3 className="text-sm font-black uppercase tracking-tight text-slate-800">Pulso de Actividad Reciente <span className="text-sky-600 font-bold ml-2 text-xs">{filtrosActivosText && `(Filtros: ${filtrosActivosText})`}</span></h3>
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Volumen en los últimos 20 días (Clickeá una barra para aislar la actividad de ese día)</p>
                    </div>
                  </div>
                  {(operarioEnfoque || grupoEnfoque || compradorEnfoque || diaEnfoque) && (
                    <button onClick={() => { setOperarioEnfoque(null); setGrupoEnfoque(null); setCompradorEnfoque(null); setDiaEnfoque(null); }} className="text-[9px] font-black uppercase tracking-widest text-sky-600 bg-sky-50 px-3 py-1.5 rounded-lg hover:bg-sky-100 transition-colors">Limpiar Filtros</button>
                  )}
                </div>
                
                <div className="flex items-end gap-2 sm:gap-4 h-48 pt-6 overflow-x-auto scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent w-full border-b border-slate-100 px-2 pb-2">
                  {kpiData.pulsoSemanas.map((dia, idx) => {
                    const pctAltura = Math.max(8, Math.round((dia.cantidad / kpiData.maxActividadPulso) * 100));
                    return (
                      <div 
                        key={idx} 
                        onClick={() => setDiaEnfoque(diaEnfoque === dia.label ? null : dia.label)}
                        className={`flex-1 min-w-[40px] max-w-[60px] flex flex-col items-center group relative h-full justify-end shrink-0 cursor-pointer transition-all ${diaEnfoque === dia.label ? 'bg-sky-50 ring-1 ring-sky-200 rounded-lg' : 'hover:bg-slate-50'}`}
                      >
                        <div className="absolute -top-3 opacity-0 group-hover:opacity-100 bg-slate-900 text-white font-black text-[9px] px-1.5 py-0.5 rounded transition-all shadow-md z-30 pointer-events-none">{dia.cantidad}</div>
                        <span className={`text-[10px] font-black mb-1 leading-none ${diaEnfoque === dia.label ? 'text-sky-700' : 'text-slate-700'}`}>{dia.cantidad}</span>
                        <div style={{ height: `${pctAltura}%` }} className={`w-full rounded-t-lg transition-all duration-300 shadow-xs ${dia.cantidad > 0 ? (diaEnfoque === dia.label ? 'bg-sky-500' : 'bg-gradient-to-t from-indigo-500 to-indigo-400 group-hover:from-indigo-600') : 'bg-slate-100'}`}></div>
                        <span className={`text-[8px] font-black uppercase mt-2 tracking-tighter whitespace-nowrap ${diaEnfoque === dia.label ? 'text-sky-600' : 'text-slate-400'}`}>{dia.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col">
                  <div className="flex items-center gap-2 mb-6">
                    <Package size={20} className="text-slate-800"/>
                    <div>
                      <h3 className="text-sm font-black uppercase tracking-tight text-slate-800">Ranking de Grupos</h3>
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Clickeá un grupo para filtrar</p>
                    </div>
                  </div>
                  
                  {kpiData.listaGrupos.length === 0 ? (
                    <div className="text-center py-10 text-slate-400 text-xs font-bold uppercase tracking-widest">Sin datos</div>
                  ) : (
                    <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-200 flex-1">
                      {kpiData.listaGrupos.map((item, idx) => {
                        const maximo = kpiData.listaGrupos[0].cantidad;
                        const porcentaje = Math.round((item.cantidad / maximo) * 100);
                        const isSelected = grupoEnfoque === item.nombre;
                        return (
                          <div key={item.nombre} onClick={() => setGrupoEnfoque(isSelected ? null : item.nombre)} className={`flex items-center gap-4 cursor-pointer p-2 rounded-xl transition-all ${isSelected ? 'bg-sky-50 border border-sky-200 shadow-sm' : 'hover:bg-slate-50 border border-transparent'}`}>
                            <div className="w-6 text-center font-black text-slate-300 text-sm">#{idx + 1}</div>
                            <div className="flex-1">
                              <div className="flex justify-between items-end mb-1">
                                <span className="text-xs font-bold text-slate-700 uppercase flex items-center gap-2">{item.nombre}{isSelected && <span className="text-[8px] bg-sky-500 text-white px-1.5 py-0.5 rounded shadow-sm">ACTIVO</span>}</span>
                                <span className="text-xs font-black text-rose-500">{item.cantidad} R.</span>
                              </div>
                              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-rose-400 rounded-full" style={{width: `${porcentaje}%`}}></div></div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col">
                  <div className="flex items-center gap-2 mb-6">
                    <ShoppingCart size={20} className="text-slate-800"/>
                    <div>
                      <h3 className="text-sm font-black uppercase tracking-tight text-slate-800">Abastecimiento</h3>
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Tickets (Excluye Gerencia)</p>
                    </div>
                  </div>
                  
                  {kpiData.listaCompradores.length === 0 ? (
                    <div className="text-center py-10 text-slate-400 text-xs font-bold uppercase tracking-widest">Sin registros</div>
                  ) : (
                    <div className="overflow-x-auto max-h-[300px] shrink-0 scrollbar-thin scrollbar-thumb-slate-200 flex-1">
                      <table className="w-full text-left whitespace-nowrap text-xs font-bold">
                        <thead className="sticky top-0 bg-white z-10">
                          <tr className="border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            <th className="pb-3 px-3">Comprador</th>
                            <th className="pb-3 px-3 text-center">Netos</th>
                            <th className="pb-3 px-3 text-right">% Resolución</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {kpiData.listaCompradores.map((comp) => {
                            const isSelected = compradorEnfoque === comp.nombre;
                            return (
                            <tr key={comp.nombre} onClick={() => setCompradorEnfoque(isSelected ? null : comp.nombre)} className={`text-slate-700 cursor-pointer transition-colors ${isSelected ? 'bg-sky-50/80 border-l-4 border-sky-500' : 'hover:bg-slate-50 border-l-4 border-transparent'}`}>
                              <td className="py-3 px-3 uppercase text-slate-800 font-black flex items-center gap-2">{comp.nombre}{isSelected && <span className="text-[8px] bg-sky-500 text-white px-1.5 py-0.5 rounded shadow-sm">ACTIVO</span>}</td>
                              <td className="py-3 px-3 text-center text-slate-600">{comp.total}</td>
                              <td className="py-3 px-3 text-right"><span className={`px-2 py-0.5 rounded text-[10px] font-black ${comp.efectividad >= 80 ? 'bg-emerald-50 text-emerald-700' : comp.efectividad >= 40 ? 'bg-amber-50 text-amber-700' : 'bg-rose-50 text-rose-700'}`}>{comp.efectividad}%</span></td>
                            </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col">
                  <div className="flex items-center gap-2 mb-6">
                    <Users size={20} className="text-slate-800"/>
                    <div>
                      <h3 className="text-sm font-black uppercase tracking-tight text-slate-800">Alertas por Operario</h3>
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Catálogo filtrado por la selección</p>
                    </div>
                  </div>
                  
                  {kpiData.listaOperarios.length === 0 ? (
                    <div className="text-center py-10 text-slate-400 text-xs font-bold uppercase tracking-widest">Sin registros bajo estos filtros</div>
                  ) : (
                    <div className="overflow-x-auto max-h-[300px] scrollbar-thin scrollbar-thumb-slate-200 flex-1">
                      <table className="w-full text-left whitespace-nowrap text-xs font-bold">
                        <thead className="sticky top-0 bg-white z-10">
                          <tr className="border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            <th className="pb-3 px-3">Operario</th>
                            <th className="pb-3 px-3 text-center">Emitidas</th>
                            <th className="pb-3 px-3 text-right">% Cierre</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {kpiData.listaOperarios.map((op) => (
                            <tr key={op.nombre} onClick={() => setOperarioEnfoque(operarioEnfoque === op.nombre ? null : op.nombre)} className={`text-slate-700 cursor-pointer transition-colors ${operarioEnfoque === op.nombre ? 'bg-sky-50/80 border-l-4 border-sky-500' : 'hover:bg-slate-50 border-l-4 border-transparent'}`}>
                              <td className="py-3 px-3 uppercase text-slate-800 font-black flex items-center gap-2">{op.nombre}{operarioEnfoque === op.nombre && <span className="text-[8px] bg-sky-500 text-white px-1.5 py-0.5 rounded shadow-sm">ACTIVO</span>}</td>
                              <td className="py-3 px-3 text-center text-slate-600">{op.total}</td>
                              <td className="py-3 px-3 text-right"><span className={`px-2 py-0.5 rounded text-[10px] font-black ${op.efectividad >= 80 ? 'bg-emerald-50 text-emerald-700' : op.efectividad >= 40 ? 'bg-amber-50 text-amber-700' : 'bg-rose-50 text-rose-700'}`}>{op.efectividad}%</span></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm w-full mt-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                  <div className="flex items-center gap-2">
                    <FileText size={20} className="text-slate-800"/>
                    <div>
                      <h3 className="text-sm font-black uppercase tracking-tight text-slate-800">Detalle de Materiales Activos en las Métricas</h3>
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Hacé clic en un insumo para desplegar su ficha técnica en el panel lateral derecho</p>
                    </div>
                  </div>
                  
                  {kpiData.listaInsumos.length > 0 && (
                    <button onClick={descargarExcelInsumosKpi} className="bg-emerald-50 text-emerald-600 hover:bg-emerald-100 hover:text-emerald-700 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all shadow-sm">
                      <Download size={14} /> Descargar Reporte Excel
                    </button>
                  )}
                </div>

                {kpiData.listaInsumos.length === 0 ? (
                  <div className="text-center py-10 text-slate-400 text-xs font-bold uppercase tracking-widest">Sin registros activos con los filtros actuales</div>
                ) : (
                  <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-slate-200 max-h-[400px]">
                    <table className="w-full text-left whitespace-nowrap text-xs font-bold">
                      <thead className="sticky top-0 bg-white z-10 shadow-sm">
                        <tr className="border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                          <th className="py-4 px-4 bg-white">Código / Insumo</th>
                          <th className="py-4 px-4 bg-white text-center">Grupo</th>
                          <th className="py-4 px-4 bg-white text-left">Abastecimiento</th>
                          <th className="py-4 px-4 bg-white text-center">Operario</th>
                          <th className="py-4 px-4 bg-white text-center">Estado</th>
                          <th className="py-4 px-4 bg-white text-right">Interacciones</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {kpiData.listaInsumos.map((item) => (
                          <tr 
                            key={item.insumoId} 
                            onClick={() => setActiveInsumo(item.insumoAsociado)}
                            className="text-slate-700 hover:bg-sky-50/50 cursor-pointer transition-colors"
                          >
                            <td className="py-3 px-4">
                               <div className="flex flex-col">
                                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">CÓDIGO: {item.codigo}</span>
                                  <span className="text-xs font-black text-slate-800 uppercase">{item.nombre}</span>
                                </div>
                            </td>
                            <td className="py-3 px-4 text-center text-[10px] font-black uppercase tracking-widest text-slate-500">{item.grupo}</td>
                            <td className="py-3 px-4 text-[10px] font-black uppercase text-slate-600">{item.comprador}</td>
                            <td className="py-3 px-4 text-center text-[10px] font-black uppercase text-slate-600">{item.operario}</td>
                            <td className="py-3 px-4 text-center">
                               <span className={`px-2 py-0.5 rounded text-[9px] font-black tracking-widest uppercase ${item.estado === 'ABIERTO' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                 {item.estado}
                               </span>
                            </td>
                            <td className="py-3 px-4 text-right">
                               <span className="bg-slate-100 text-slate-600 px-2.5 py-1 rounded-md text-[10px] font-black shadow-sm">
                                 {item.interacciones} MSJS
                               </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </motion.div>
          )}
          
          {/* LECTOR DE CORREOS MODAL */}
          <AnimatePresence>
            {modalMensaje && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4">
                <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col">
                  <div className="p-6 bg-slate-900 text-white flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      {modalMensaje.tipo?.includes('GERENCIA') ? <CheckSquare size={18} className="text-indigo-400"/> : <Mail size={18} className="text-sky-400"/>} 
                      <h3 className="font-black uppercase text-sm tracking-widest">{modalMensaje.tipo?.includes('GERENCIA') ? 'Registro de Auditoría' : 'Inspección de Correo'}</h3>
                    </div>
                    <button onClick={() => setModalMensaje(null)} className="text-slate-400 hover:text-white transition-colors"><X/></button>
                  </div>
        
                  <div className="p-8 space-y-4 max-h-[70vh] overflow-auto bg-slate-50">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm"><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Fecha / Hora</p><p className="font-bold text-sm text-slate-800">{formatearFecha(modalMensaje.fecha)}</p></div>
                      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm"><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Responsable</p><p className="font-bold text-sm text-slate-800">{modalMensaje.operario}</p></div>
                    </div>
                    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">{modalMensaje.tipo?.includes('GERENCIA') ? 'Detalle de la Operación' : 'Asunto Oficial'}</p>
                      <p className="font-black text-slate-800 mb-4 pb-4 border-b border-slate-100">{modalMensaje.mensaje}</p>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">{modalMensaje.tipo?.includes('GERENCIA') ? 'Motivo / Anotación' : 'Cuerpo del Mensaje'}</p>
                      <div className="bg-slate-50 p-4 rounded-lg text-xs font-mono whitespace-pre-wrap border border-slate-100 text-slate-600 leading-relaxed">{modalMensaje.cuerpoOriginal || "Sin detalle."}</div>
                    </div>
                  </div>
                  <div className="p-5 bg-white border-t border-slate-100 flex justify-end"><button onClick={() => setModalMensaje(null)} className="px-8 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest bg-slate-900 text-white hover:bg-slate-800 transition-all active:scale-95 shadow-lg">Cerrar Detalle</button></div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ========================================================================= */}
          {/* PANEL MAGNO DE DESPACHO MANUAL (ALTA DENSIDAD) */}
          {/* ========================================================================= */}
          <AnimatePresence>
            {modalDespacho && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 md:p-8">
                <motion.div initial={{ scale: 0.95, y: 10 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-white rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col border border-slate-200">
                  
                  {/* Header */}
                  <div className="p-6 bg-indigo-900 text-white flex justify-between items-center shrink-0">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-indigo-800 rounded-full flex items-center justify-center border border-indigo-700 shadow-inner">
                        <Megaphone size={20} className="text-indigo-400" />
                      </div>
                      <div>
                        <h2 className="text-lg font-black uppercase tracking-widest">Despacho de Reportes a Planta</h2>
                        <p className="text-[10px] font-bold text-indigo-300 uppercase tracking-widest">Seleccioná a qué operarios notificar hoy.</p>
                      </div>
                    </div>
                    <button onClick={() => setModalDespacho(false)} className="text-indigo-400 hover:text-white transition-colors p-2"><X size={24} /></button>
                  </div>

                  {/* Botonera Selección Rápida */}
                  <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center shrink-0">
                    <span className="text-xs font-black text-slate-500 uppercase tracking-widest">
                      {operariosSeleccionados.length} Seleccionados de {resumenOperarios.length}
                    </span>
                    <div className="flex gap-3">
                      <button 
                        onClick={() => setOperariosSeleccionados([])} 
                        className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-[10px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-100 transition-colors"
                      >
                        Limpiar Selección
                      </button>
                      <button 
                        onClick={() => setOperariosSeleccionados(resumenOperarios.map(op => op.nombre))} 
                        className="px-4 py-2 bg-indigo-50 border border-indigo-200 rounded-lg text-[10px] font-black uppercase tracking-widest text-indigo-600 hover:bg-indigo-100 transition-colors"
                      >
                        Seleccionar Todos
                      </button>
                    </div>
                  </div>

                  {/* Grilla Alta Densidad */}
                  <div className="flex-1 overflow-y-auto p-6 bg-[#F8FAFC]">
                    {resumenOperarios.length === 0 ? (
                      <div className="text-center py-20">
                        <CheckSquare size={48} className="mx-auto text-emerald-300 mb-4" />
                        <h3 className="text-slate-800 font-black text-lg uppercase tracking-widest">Planta al día</h3>
                        <p className="text-slate-500 text-xs font-bold uppercase mt-2">Nadie tiene insumos huérfanos ni tickets abiertos hoy.</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {resumenOperarios.map(op => {
                          const isChecked = operariosSeleccionados.includes(op.nombre);
                          return (
                            <div 
                              key={op.nombre}
                              onClick={() => {
                                setOperariosSeleccionados(prev => prev.includes(op.nombre) ? prev.filter(n => n !== op.nombre) : [...prev, op.nombre]);
                              }}
                              className={`flex items-center gap-4 p-4 rounded-2xl border cursor-pointer transition-all ${isChecked ? 'bg-indigo-50 border-indigo-300 shadow-md ring-2 ring-indigo-500/20' : 'bg-white border-slate-200 hover:border-indigo-300 shadow-sm hover:shadow-md'}`}
                            >
                              <div className={`${isChecked ? 'text-indigo-600' : 'text-slate-300'}`}>
                                {isChecked ? <CheckIcon size={24} /> : <Square size={24} />}
                              </div>
                              <div className="flex-1">
                                <h4 className="text-sm font-black text-slate-800 uppercase tracking-wider mb-2">{op.nombre}</h4>
                                <div className="flex gap-2">
                                  <span className={`px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 ${op.huerfanos > 0 ? 'bg-rose-100 text-rose-700 border border-rose-200' : 'bg-slate-100 text-slate-500 border border-slate-200'}`}>
                                    <AlertCircle size={10} /> {op.huerfanos} Huérfanos
                                  </span>
                                  <span className={`px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 ${op.activos > 0 ? 'bg-sky-100 text-sky-700 border border-sky-200' : 'bg-slate-100 text-slate-500 border border-slate-200'}`}>
                                    <FileText size={10} /> {op.activos} En Curso
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Pie del Modal */}
                  <div className="p-6 bg-white border-t border-slate-200 flex justify-end gap-4 shrink-0">
                    <button 
                      onClick={() => setModalDespacho(false)} 
                      className="px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-widest text-slate-500 hover:bg-slate-100 transition-all"
                    >
                      Cancelar
                    </button>
                    
                    <button 
                      onClick={ejecutarDespachoManual}
                      disabled={operariosSeleccionados.length === 0 || enviandoMails}
                      className={`px-8 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all flex items-center gap-2 shadow-lg ${operariosSeleccionados.length === 0 || enviandoMails ? 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none' : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-500/30'}`}
                    >
                      {enviandoMails ? (
                        <>⏳ Procesando envíos...</>
                      ) : (
                        <>🚀 Despachar a {operariosSeleccionados.length} operarios</>
                      )}
                    </button>
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
