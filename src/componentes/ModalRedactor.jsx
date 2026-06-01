import React, { useState, useEffect } from 'react';
import { X, Send, Search, Info } from 'lucide-react';
import { motion } from 'framer-motion';

const ModalRedactor = ({
  reclamoDraft,
  setReclamoDraft,
  config,
  currentUser,
  getPlantillasDinamicas,
  aplicarPlantilla,
  confirmarYGuardarReclamo
}) => {
  const [procesadoInicial, setProcesadoInicial] = useState(false);
  if (!reclamoDraft) return null;

  const plantillas = getPlantillasDinamicas();
  const contactos = config?.contactos || [];

  const plantillasOrdenadas = React.useMemo(() => {
    return [...plantillas].sort((a, b) => {
      const nombreA = (a.nombre || "").trim();
      const nombreB = (b.nombre || "").trim();
      
      const numA = parseInt(nombreA.charAt(0), 10);
      const numB = parseInt(nombreB.charAt(0), 10);
      
      if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
      if (!isNaN(numA)) return -1;
      if (!isNaN(numB)) return 1;
      return nombreA.localeCompare(nombreB);
    });
  }, [plantillas]);

  const procesarTextoAvanzado = (txtOriginal, insumo, lote = [], docContext = null) => {
    let txt = txtOriginal || "";
    const hoy = new Date();
    const hace10Dias = new Date();
    hace10Dias.setDate(hoy.getDate() - 10);
    const fmt = (n) => Number(n).toLocaleString('es-AR');

    const parsearFecha = (fRaw) => {
      if (!fRaw) return new Date(2100, 1, 1);
      if (fRaw.seconds) return new Date(fRaw.seconds * 1000);
      if (typeof fRaw === 'string' && fRaw.includes('/')) {
        const p = fRaw.split('/');
        if (p.length === 3) return new Date(p[2], p[1]-1, p[0]);
      }
      return new Date(fRaw);
    };

    const formatearFechaCorta = (fRaw) => {
      if (!fRaw || fRaw === "-") return "Sin fecha";
      try {
        const f = parsearFecha(fRaw);
        if (f.getFullYear() === 2100) return "Sin fecha";
        const dia = String(f.getDate()).padStart(2, '0');
        const mes = String(f.getMonth() + 1).padStart(2, '0');
        const anio = String(f.getFullYear()).slice(-2);
        return `${dia}/${mes}/${anio}`;
      } catch(e) { return String(fRaw); }
    };

    const calcularDemora = (fRaw) => {
      if (!fRaw || fRaw === "-") return 0;
      try {
        const f = parsearFecha(fRaw);
        if (f.getFullYear() === 2100) return 0;
        const fechaHoy = new Date();
        fechaHoy.setHours(0,0,0,0);
        f.setHours(0,0,0,0);
        const diffTime = fechaHoy.getTime() - f.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays > 0 ? diffDays : 0;
      } catch(e) { return 0; }
    };

    const formatearComprador = (rawName) => {
      if (!rawName || rawName === "SIN ASIGNAR" || rawName === "NO_ASIGNADA") return "Sin Asignar";
      const cleanName = String(rawName).trim().toLowerCase();
      const contactoMatch = contactos.find(c => {
        const aliasC = String(c.alias || "").trim().toLowerCase();
        const labelC = String(c.label || "").trim().toLowerCase();
        if (aliasC && cleanName.includes(aliasC)) return true;
        if (labelC && cleanName.includes(labelC)) return true;
        return false;
      });
      return contactoMatch && contactoMatch.label ? contactoMatch.label : rawName;
    };

    // --- MAGIA DE LOTES CON CABECERA LIMPIA Y FILTRO A FUTURO ---
    if (lote.length > 1 && (txt.includes('{ocs}') || txt.includes('{ocs_aprobadas}') || txt.includes('{ocs_pendientes}'))) {
        const subTemplate = config.plantillaItemLote || "[{codigo}] {nombre}\n{repartos_sap}\n  TOTAL ADEUDADO: {total} un.";
        let cabeceraLote = "";
        let cuerpoLote = "";
        let itemsValidos = 0;

        // INYECCIÓN DE CABECERA (Cero Emojis)
        if (docContext) {
            let respGlobal = "SIN ASIGNAR";
            if (docContext.tipo.includes('OC')) {
                const ocF = lote[0].detalleOCs?.find(o => String(o.numero) === String(docContext.numero));
                if (ocF && ocF.comprador) respGlobal = formatearComprador(ocF.comprador);
            } else if (docContext.tipo.includes('SOLPED')) {
                const spF = lote[0].detalleSolpeds?.find(s => String(s.numero) === String(docContext.numero));
                if (spF && spF.comprador) respGlobal = formatearComprador(spF.comprador);
            }
            const prov = docContext.proveedor || lote[0].proveedor || "S/P";
            
            cabeceraLote += `DOCUMENTO: ${docContext.tipo} #${docContext.numero}\n`;
            cabeceraLote += `RESPONSABLE: ${respGlobal.toUpperCase()} | PROVEEDOR: ${prov}\n`;
            cabeceraLote += `--------------------------------------------------\n\n`;
        }

        // ARMADO DE CADA INSUMO
        lote.forEach(item => {
            let itemTxt = subTemplate.replace(/🔸 |↳ /g, ''); // Limpieza estricta de iconos
            itemTxt = itemTxt.replace(/{codigo}/g, item.codigo || "");
            itemTxt = itemTxt.replace(/{nombre}/g, item.nombre || "");
            itemTxt = itemTxt.replace(/{dias}/g, Math.round(item.supervivencia));

            let repartosTxt = "";
            let total = 0;
            let maxDemora = 0;

            if (docContext && docContext.tipo.includes('OC') && item.detalleOCs) {
                const ocsMatch = item.detalleOCs.filter(o => String(o.numero) === String(docContext.numero));
                ocsMatch.forEach(oc => {
                    const demora = calcularDemora(oc.fecha);
                    if (demora > 0) { 
                        const cant = Number(oc.cantidad) || 0;
                        total += cant;
                        if (demora > maxDemora) maxDemora = demora;
                        repartosTxt += `  - ${fmt(cant)} un. | SAP: ${formatearFechaCorta(oc.fecha)} | Demora: ${demora} Días\n`;
                    }
                });
            } else if (docContext && docContext.tipo.includes('SOLPED') && item.detalleSolpeds) {
                const spsMatch = item.detalleSolpeds.filter(s => String(s.numero) === String(docContext.numero));
                spsMatch.forEach(sp => {
                    const fBase = sp.fechaCreacion || sp.fechaSolicitud || sp.fecha;
                    const demora = calcularDemora(fBase);
                    if (demora > 0) { 
                        const cant = Number(sp.cantidad) || 0;
                        total += cant;
                        if (demora > maxDemora) maxDemora = demora;
                        repartosTxt += `  - ${fmt(cant)} un. | SAP: ${formatearFechaCorta(fBase)} | Demora: ${demora} Días\n`;
                    }
                });
            }

            // 🚀 PURIFICADOR DE RUIDO: Si el insumo tiene 0 entregas demoradas, SE ELIMINA DEL CORREO
            if (repartosTxt === "" || total === 0) {
                return; // Corta la ejecución de este ítem y pasa al siguiente, ignorándolo.
            }

            itemsValidos++;
            itemTxt = itemTxt.replace(/{repartos_sap}/g, repartosTxt.trimEnd());
            itemTxt = itemTxt.replace(/{total}/g, fmt(total));
            itemTxt = itemTxt.replace(/{dias_demora}/g, maxDemora);

            cuerpoLote += itemTxt + "\n\n";
        });

        // ENSAMBLAJE FINAL
        let bloqueFinal = "";
        if (itemsValidos > 0) {
            bloqueFinal = cabeceraLote + cuerpoLote;
        } else {
            bloqueFinal = "⚠️ ALERTA DE SISTEMA: LOS INSUMOS SELECCIONADOS FUERON OMITIDOS PORQUE NINGUNO REGISTRA ENTREGAS DEMORADAS EN SAP PARA ESTA ORDEN DE COMPRA. NO ES NECESARIO RECLAMAR.";
        }

        txt = txt.replace(/{ocs}/g, bloqueFinal.trimEnd());
        txt = txt.replace(/{ocs_aprobadas}/g, bloqueFinal.trimEnd());
        txt = txt.replace(/{ocs_pendientes}/g, bloqueFinal.trimEnd());
    }

    const isAprobada = (estado) => {
      const e = (estado || "").toUpperCase();
      if (e.includes('PENDIENTE') || e.includes('PROCESO') || e.includes('AUTORIZAC') || e === 'SIN ESTADO' || e.trim() === '') return false;
      return true;
    };

    if (txt.includes('{ocs_aprobadas}')) {
      const ocsAprob = (insumo.detalleOCs || []).filter(oc => isAprobada(oc.estado) && calcularDemora(oc.fecha) > 0);
      const str = ocsAprob.length > 0 
        ? ocsAprob.map(oc => `- OC ${oc.numero} (${fmt(oc.cantidad)} un.) | Ingreso planificado: ${formatearFechaCorta(oc.fecha)} | Días demorados: ${calcularDemora(oc.fecha)} | Resp: ${formatearComprador(oc.comprador)}`).join('\n')
        : "Sin Órdenes de Compra aprobadas/demoradas registradas.";
      txt = txt.replace(/{ocs_aprobadas}/g, str);
    }

    if (txt.includes('{ocs_pendientes}')) {
      const ocsPend = (insumo.detalleOCs || []).filter(oc => !isAprobada(oc.estado));
      const str = ocsPend.length > 0 
        ? ocsPend.map(oc => `- OC ${oc.numero} (${fmt(oc.cantidad)} un.) | Ingreso planificado: ${formatearFechaCorta(oc.fecha)} | Resp: ${formatearComprador(oc.comprador)}`).join('\n')
        : "Sin Órdenes de Compra pendientes de aprobación.";
      txt = txt.replace(/{ocs_pendientes}/g, str);
    }

    if (txt.includes('{ocs_todas_etiquetadas}')) {
      const ocsDemoradasRE = (insumo.detalleOCs || []).filter(oc => calcularDemora(oc.fecha) > 0);
      const str = ocsDemoradasRE.length > 0
        ? ocsDemoradasRE.map(oc => `- OC ${oc.numero} [${isAprobada(oc.estado) ? '✅ APROBADA' : '⏳ PENDIENTE'}] (${fmt(oc.cantidad)} un.) | Ingreso planificado: ${formatearFechaCorta(oc.fecha)} | Días demorados: ${calcularDemora(oc.fecha)} | Resp: ${formatearComprador(oc.comprador)}`).join('\n')
        : "Sin Órdenes de Compra demoradas registradas.";
      txt = txt.replace(/{ocs_todas_etiquetadas}/g, str);
    }

    if (txt.includes('{solpeds_viejas}')) {
      const solpedsViejas = (insumo.detalleSolpeds || []).filter(sp => {
        const fechaBase = sp.fechaCreacion || sp.fechaSolicitud || sp.fecha;
        return parsearFecha(fechaBase) < hace10Dias;
      });
      const str = solpedsViejas.length > 0
        ? solpedsViejas.map(sp => {
            const fechaBase = sp.fechaCreacion || sp.fechaSolicitud || sp.fecha;
            return `- S/P ${sp.numero} (${fmt(sp.cantidad)} un.) | Emitida: ${formatearFechaCorta(fechaBase)} | Días en espera: ${calcularDemora(fechaBase)} | Resp: ${formatearComprador(sp.comprador)}`;
          }).join('\n')
        : "No hay Solicitudes de Pedido con más de 10 días de antigüedad.";
      txt = txt.replace(/{solpeds_viejas}/g, str);
    }

    return txt;
  };

  const autoSeleccionarDestinatarios = (textoTemplateCrudo, insumo, plantillaId) => {
    if (plantillaId !== 'comprasGrave' && plantillaId !== 'comprasLeve' && (String(plantillaId).toUpperCase().includes('AUTORIZAR') || String(textoTemplateCrudo).toUpperCase().includes('AUTORIZAR'))) {
      return contactos.filter(c => c.tipo === 'planta').map(c => c.id);
    }

    let matchNames = [];
    const originalTextUpper = String(textoTemplateCrudo || "").toUpperCase();
    if (originalTextUpper.includes('{SOLPEDS_VIEJAS}') || originalTextUpper.includes('{SOLPEDS}')) {
      (insumo.detalleSolpeds || []).forEach(sp => matchNames.push(sp.comprador));
    } 
    if (originalTextUpper.includes('{OCS_APROBADAS}') || originalTextUpper.includes('{OCS_TODAS_ETIQUETADAS}') || originalTextUpper.includes('{OCS_PENDIENTES}') || originalTextUpper.includes('{OCS_A_ADELANTAR}') || originalTextUpper.includes('{OCS}')) {
      (insumo.detalleOCs || []).forEach(oc => matchNames.push(oc.comprador));
    }

    if (matchNames.length === 0 && insumo.owner) {
      matchNames.push(insumo.owner);
    }

    const responsablesFiltrados = matchNames
      .filter(Boolean)
      .map(r => String(r).trim().toLowerCase())
      .filter(r => r !== "sin asignar" && r !== "no_asignada" && r !== "" && r !== "-");
    let matchedIds = [];
    
    const limpiarAcentos = (str) => String(str).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    const responsablesLimpios = responsablesFiltrados.map(r => limpiarAcentos(r));

    contactos.forEach(c => {
      const terminos = [c.alias, c.label, c.email?.split('@')[0]].filter(Boolean).map(t => limpiarAcentos(t));
      const coincidencia = terminos.some(t => responsablesLimpios.some(r => r.includes(t) || t.includes(r)));
      if (coincidencia && c.tipo === 'compras') matchedIds.push(c.id);
    });
    return [...new Set(matchedIds)];
  };

  useEffect(() => {
    if (reclamoDraft && !procesadoInicial) {
      const template = plantillas.find(p => p.id === reclamoDraft.tipoPlantilla) || plantillas[0];
      const cuerpoCrudoTemplate = template.cuerpo || "";

      const nuevoCuerpo = procesarTextoAvanzado(reclamoDraft.cuerpo, reclamoDraft.insumo, reclamoDraft.lote, reclamoDraft.docContext);
      const nuevosDestinos = autoSeleccionarDestinatarios(cuerpoCrudoTemplate, reclamoDraft.insumo, reclamoDraft.tipoPlantilla);

      setReclamoDraft(prev => ({
        ...prev,
        cuerpo: nuevoCuerpo,
        destinatarios: nuevosDestinos
      }));
      setProcesadoInicial(true);
    }
  }, [reclamoDraft, procesadoInicial, plantillas]);

  const handlePlantillaChange = (e) => {
    const newTemplateId = e.target.value;
    const templateObj = plantillas.find(p => p.id === newTemplateId) || plantillas[0];
    
    const isLote = reclamoDraft.lote && reclamoDraft.lote.length > 1;
    const insumoMock = isLote 
      ? { ...reclamoDraft.insumo, codigo: "MULTIPLES", nombre: `LOTE DE ${reclamoDraft.lote.length} INSUMOS` } 
      : reclamoDraft.insumo;

    const { asunto, cuerpo, destino } = aplicarPlantilla(insumoMock, newTemplateId, reclamoDraft.docContext);
    
    const cuerpoAvanzado = procesarTextoAvanzado(cuerpo, reclamoDraft.insumo, reclamoDraft.lote, reclamoDraft.docContext);
    const destinosInteligentes = autoSeleccionarDestinatarios(templateObj.cuerpo, reclamoDraft.insumo, newTemplateId);
    
    const ticketActual = reclamoDraft.ticketBorrador;
    const asuntoConTicket = `${asunto} [${ticketActual}]`;
    const destinoEfectivo = (newTemplateId.toUpperCase().includes('AUTORIZAR') || templateObj.nombre.toUpperCase().includes('AUTORIZAR')) ? 'planta' : destino;
    
    setReclamoDraft({
      ...reclamoDraft,
      tipoPlantilla: newTemplateId,
      tipoDestino: destinoEfectivo,
      asunto: asuntoConTicket,
      cuerpo: cuerpoAvanzado,
      destinatarios: destinosInteligentes
    });
  };

  const toggleDestinatario = (id) => {
    const actuales = reclamoDraft.destinatarios || [];
    if (actuales.includes(id)) {
      setReclamoDraft({ ...reclamoDraft, destinatarios: actuales.filter(d => d !== id) });
    } else {
      setReclamoDraft({ ...reclamoDraft, destinatarios: [...actuales, id] });
    }
  };

  const tipoFiltroContacto = (reclamoDraft.tipoPlantilla?.toUpperCase().includes('AUTORIZAR') || reclamoDraft.tipoDestino === 'planta') ? 'planta' : 'compras';

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      exit={{ opacity: 0 }} 
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 sm:p-6"
    >
      <motion.div 
        initial={{ scale: 0.96, y: 8 }} 
        animate={{ scale: 1, y: 0 }} 
        exit={{ scale: 0.96, opacity: 0 }} 
        className="bg-white rounded-3xl w-full max-w-5xl flex flex-col shadow-2xl overflow-hidden max-h-[90vh] border border-slate-200"
      >
        <div className="flex justify-between items-center px-8 py-4 border-b border-slate-100 bg-white">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-base font-black text-slate-800 tracking-tight uppercase">
              <Send size={16} className="text-orange-500" /> 
              <span>Emisión de Reclamo</span>
            </div>
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 bg-purple-50 rounded-full border border-purple-100 text-[10px] font-black text-purple-700 tracking-wider uppercase">
              <span className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-pulse"></span>
              Interacción {tipoFiltroContacto === 'planta' ? '--> ADMINISTRACIÓN' : '--> SECTOR COMPRAS'}
            </div>
          </div>
          <button onClick={() => setReclamoDraft(null)} className="p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 rounded-full transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-8 py-5 flex flex-col gap-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 shrink-0">
            <div>
              <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Plantilla Operativa</label>
              <select value={reclamoDraft.tipoPlantilla} onChange={handlePlantillaChange} className="w-full bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl px-4 py-3 outline-none focus:border-orange-500 transition-all cursor-pointer">
                {plantillasOrdenadas.map(p => (
                  <option key={p.id} value={p.id}>{p.nombre.toUpperCase()}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Destinatarios ({reclamoDraft.destinatarios?.length || 0})</label>
              <div className="relative">
                <div onClick={() => setReclamoDraft({...reclamoDraft, showDestinatarios: !reclamoDraft.showDestinatarios})} className="w-full bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl px-4 py-3 flex justify-between items-center cursor-pointer hover:bg-slate-100 transition-all shadow-sm min-h-[42px]">
                  <span className="truncate uppercase font-black text-slate-700 max-w-[90%]">
                    {reclamoDraft.destinatarios?.length > 0 
                      ? reclamoDraft.destinatarios.map(id => {
                          const c = contactos.find(x => x.id === id);
                          return c ? (c.alias || c.label) : '';
                        }).filter(Boolean).join(', ')
                      : 'SELECCIONAR DESTINATARIO'
                    }
                  </span>
                  <span className="text-[9px] text-slate-400 select-none">▼</span>
                </div>  
                
                {reclamoDraft.showDestinatarios && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-50 max-h-48 overflow-y-auto p-2">
                    {contactos.filter(c => c.tipo === tipoFiltroContacto).map(c => (
                      <label key={c.id} className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors">
                        <input type="checkbox" checked={(reclamoDraft.destinatarios || []).includes(c.id)} onChange={() => toggleDestinatario(c.id)} className="w-4 h-4 text-orange-500 rounded border-slate-300 focus:ring-orange-500" />
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-slate-700">{c.label || c.alias}</span>
                          <span className="text-[10px] text-slate-400">{c.email}</span>
                        </div>
                      </label>
                    ))}
                    {contactos.filter(c => c.tipo === tipoFiltroContacto).length === 0 && (
                      <div className="p-2 text-xs text-slate-500 text-center">No hay contactos configurados para este sector.</div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="shrink-0">
            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Asunto Oficial</label>
            <input type="text" value={reclamoDraft.asunto} onChange={(e) => setReclamoDraft({...reclamoDraft, asunto: e.target.value})} className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs font-bold rounded-xl px-4 py-3 outline-none focus:border-orange-500 transition-all" />
          </div>

          <div className="flex flex-col flex-1 h-full min-h-[350px]">
            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Cuerpo del Mensaje</label>
            <textarea value={reclamoDraft.cuerpo} onChange={(e) => setReclamoDraft({...reclamoDraft, cuerpo: e.target.value})} className="w-full h-80 bg-white border-2 border-slate-200 text-lg font-medium text-slate-700 rounded-2xl px-6 py-5 outline-none focus:border-orange-500 transition-all resize-none shadow-sm font-sans leading-relaxed" />
          </div>
        </div>

        <div className="px-8 py-5 bg-white border-t border-slate-100 flex justify-between items-center shrink-0">
          <button onClick={() => setReclamoDraft(null)} className="px-6 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors">
            Cancelar
          </button>
          
          <div className="flex items-center gap-3">
            {/* 🛡️ BOTÓN INTELIGENTE: Solo se muestra si el insumo ya tiene un ticket asignado */}
            {reclamoDraft.insumo.ticketReclamo && (
              <button onClick={() => confirmarYGuardarReclamo('HILO')} className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest bg-white border-2 border-orange-200 text-orange-600 hover:bg-orange-50 hover:border-orange-400 shadow-sm transition-all active:scale-95">
                <Search size={14} /> Continuar Hilo
              </button>
            )}

            <button onClick={() => confirmarYGuardarReclamo('NUEVO')} className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest bg-orange-500 text-white hover:bg-orange-600 shadow-md transition-all active:scale-95">
              <Send size={14} /> Abrir Gmail
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default ModalRedactor;
