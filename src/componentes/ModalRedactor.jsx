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

  // --- MOTOR 1: PROCESADOR MATEMÁTICO DE ETIQUETAS MÁGICAS ---
  const procesarTextoAvanzado = (txtOriginal, insumo) => {
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

    const isAprobada = (estado) => {
      const e = (estado || "").toUpperCase();
      return e.includes('APROBADO') || e.includes('APROBADA') || e.includes('DOCUM.SUBSIGUIENTES');
    };

    // 1. OCs Aprobadas
    if (txt.includes('{ocs_aprobadas}')) {
      const ocsAprob = (insumo.detalleOCs || []).filter(oc => isAprobada(oc.estado));
      const str = ocsAprob.length > 0 
        ? ocsAprob.map(oc => `- OC ${oc.numero} (${fmt(oc.cantidad)} un.) | Resp: ${oc.comprador}`).join('\n')
        : "Sin Órdenes de Compra aprobadas/demoradas registradas.";
      txt = txt.replace(/{ocs_aprobadas}/g, str);
    }

    // 2. OCs Pendientes
    if (txt.includes('{ocs_pendientes}')) {
      const ocsPend = (insumo.detalleOCs || []).filter(oc => !isAprobada(oc.estado));
      const str = ocsPend.length > 0 
        ? ocsPend.map(oc => `- OC ${oc.numero} (${fmt(oc.cantidad)} un.) | Resp: ${oc.comprador}`).join('\n')
        : "Sin Órdenes de Compra pendientes de aprobación.";
      txt = txt.replace(/{ocs_pendientes}/g, str);
    }

    // 3. Todas Etiquetadas (URGENCIAS)
    if (txt.includes('{ocs_todas_etiquetadas}')) {
      const str = (insumo.detalleOCs || []).length > 0
        ? (insumo.detalleOCs || []).map(oc => `- OC ${oc.numero} [${isAprobada(oc.estado) ? '✅ APROBADA' : '⏳ PENDIENTE'}] (${fmt(oc.cantidad)} un.) | Resp: ${oc.comprador}`).join('\n')
        : "Sin Órdenes de Compra registradas.";
      txt = txt.replace(/{ocs_todas_etiquetadas}/g, str);
    }

    // 4. Solpeds Viejas (7/10 Días)
    if (txt.includes('{solpeds_viejas}')) {
      const solpedsViejas = (insumo.detalleSolpeds || []).filter(sp => parsearFecha(sp.fecha) < hace10Dias);
      const str = solpedsViejas.length > 0
        ? solpedsViejas.map(sp => `- S/P ${sp.numero} (${fmt(sp.cantidad)} un.) | Resp: ${sp.comprador}`).join('\n')
        : "No hay Solicitudes de Pedido con más de 10 días de antigüedad.";
      txt = txt.replace(/{solpeds_viejas}/g, str);
    }

    return txt;
  };

  // --- MOTOR 2: MATCH AUTOMÁTICO DE COMPRADORES (FRANCOTIRADOR) ---
  const autoSeleccionarDestinatarios = (textoTemplateCrudo, insumo) => {
    let matchNames = [];
    let sendToAllCompras = false;

    const originalText = textoTemplateCrudo || ""; 

    if (originalText.includes('{solpeds_viejas}')) {
      (insumo.detalleSolpeds || []).forEach(sp => matchNames.push(sp.comprador));
    } 
    if (originalText.includes('{ocs_aprobadas}') || originalText.includes('{ocs_todas_etiquetadas}') || originalText.includes('{ocs_pendientes}')) {
      (insumo.detalleOCs || []).forEach(oc => matchNames.push(oc.comprador));
    }

    // Fallback: Si no hay etiquetas mágicas, probamos con el owner general
    if (matchNames.length === 0 && insumo.owner) {
      matchNames.push(insumo.owner);
    }

    let matchedIds = [];
    matchNames.forEach(rawName => {
      if (!rawName) return;
      const cleanName = String(rawName).trim().toLowerCase();
      
      if (cleanName === "sin asignar" || cleanName === "no_asignada") {
        sendToAllCompras = true;
      } else {
        // MATCH TÁCTICO: Busca si el texto contiene el alias o el label
        const contactoEncontrado = contactos.find(c => {
          const aliasC = String(c.alias || "").trim().toLowerCase();
          const labelC = String(c.label || "").trim().toLowerCase();
          if (aliasC && cleanName.includes(aliasC)) return true;
          if (labelC && cleanName.includes(labelC)) return true;
          return false;
        });
        if (contactoEncontrado) {
          matchedIds.push(contactoEncontrado.id);
        }
      }
    });

    if (sendToAllCompras) {
      contactos.filter(c => c.tipo === 'compras').forEach(c => matchedIds.push(c.id));
    }

    return [...new Set(matchedIds)]; // Elimina duplicados
  };

  // --- AUTO-EVALUACIÓN AL ABRIR EL MODAL ---
  useEffect(() => {
    if (reclamoDraft && !procesadoInicial) {
      const template = plantillas.find(p => p.id === reclamoDraft.tipoPlantilla) || plantillas[0];
      const cuerpoCrudoTemplate = template.cuerpo || "";

      const nuevoCuerpo = procesarTextoAvanzado(reclamoDraft.cuerpo, reclamoDraft.insumo);
      const nuevosDestinos = autoSeleccionarDestinatarios(cuerpoCrudoTemplate, reclamoDraft.insumo);

      setReclamoDraft(prev => ({
        ...prev,
        cuerpo: nuevoCuerpo,
        destinatarios: nuevosDestinos.length > 0 ? nuevosDestinos : prev.destinatarios
      }));
      setProcesadoInicial(true);
    }
  }, [reclamoDraft, procesadoInicial, plantillas]);

  // --- AL CAMBIAR DE PLANTILLA EN EL DESPLEGABLE ---
  const handlePlantillaChange = (e) => {
    const newTemplateId = e.target.value;
    // 1. Aplicamos las reglas estándar (App.jsx)
    const { asunto, cuerpo, destino } = aplicarPlantilla(reclamoDraft.insumo, newTemplateId);
    
    // 2. Extraemos el template crudo para saber qué magia requiere
    const templateObj = plantillas.find(p => p.id === newTemplateId) || plantillas[0];
    
    // 3. Pasamos por nuestros motores
    const cuerpoAvanzado = procesarTextoAvanzado(cuerpo, reclamoDraft.insumo);
    const destinosInteligentes = autoSeleccionarDestinatarios(templateObj.cuerpo, reclamoDraft.insumo);

    const ticketActual = reclamoDraft.ticketBorrador;
    const asuntoConTicket = `${asunto} [${ticketActual}]`;

    setReclamoDraft({
      ...reclamoDraft,
      tipoPlantilla: newTemplateId,
      tipoDestino: destino,
      asunto: asuntoConTicket,
      cuerpo: cuerpoAvanzado,
      destinatarios: destinosInteligentes.length > 0 ? destinosInteligentes : []
    });
  };

  // Función manual para tildar/destildar
  const toggleDestinatario = (id) => {
    const actuales = reclamoDraft.destinatarios || [];
    if (actuales.includes(id)) {
      setReclamoDraft({ ...reclamoDraft, destinatarios: actuales.filter(d => d !== id) });
    } else {
      setReclamoDraft({ ...reclamoDraft, destinatarios: [...actuales, id] });
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      exit={{ opacity: 0 }} 
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 sm:p-6"
    >
      <motion.div 
        initial={{ scale: 0.95, y: 10 }} 
        animate={{ scale: 1, y: 0 }} 
        exit={{ scale: 0.95, opacity: 0 }} 
        className="bg-white rounded-2xl w-full max-w-4xl flex flex-col shadow-2xl overflow-hidden max-h-[95vh]"
      >
        {/* CABECERA INVISIBLE Y MINIMALISTA */}
        <div className="flex justify-between items-center px-8 pt-6 pb-2 border-b border-transparent">
          <h2 className="text-lg font-black text-slate-800 tracking-tight flex items-center gap-2">
            <Send size={18} className="text-orange-500" /> Emisión de Reclamo
          </h2>
          <button 
            onClick={() => setReclamoDraft(null)} 
            className="p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* INFOBOX DE ETIQUETAS DETECTADAS */}
        <div className="px-8 mt-2">
          <div className="bg-sky-50 text-sky-700 text-[10px] font-bold px-4 py-2 rounded-lg flex items-center gap-2 border border-sky-100">
            <Info size={14} className="shrink-0"/>
            El sistema seleccionará automáticamente a los destinatarios según la plantilla que elijas. Verificá los tildes antes de disparar.
          </div>
        </div>

        {/* CUERPO DEL MODAL (Prioridad al área de texto) */}
        <div className="flex-1 overflow-y-auto px-8 py-4 flex flex-col gap-5">
          
          {/* SELECTORES EN UNA SOLA FILA */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 shrink-0">
            <div>
              <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Plantilla Operativa</label>
              <select 
                value={reclamoDraft.tipoPlantilla} 
                onChange={handlePlantillaChange}
                className="w-full bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl px-4 py-3 outline-none focus:border-orange-500 transition-all cursor-pointer"
              >
                {plantillas.map(p => (
                  <option key={p.id} value={p.id}>{p.nombre.toUpperCase()}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Destinatarios ({reclamoDraft.destinatarios?.length || 0})</label>
              <div className="relative">
                <div 
                  onClick={() => setReclamoDraft({...reclamoDraft, showDestinatarios: !reclamoDraft.showDestinatarios})}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl px-4 py-3 flex justify-between items-center cursor-pointer hover:bg-slate-100 transition-colors"
                >
                  <span>{reclamoDraft.destinatarios?.length > 0 ? `${reclamoDraft.destinatarios.length} SELECCIONADOS` : 'SELECCIONAR DESTINATARIO'}</span>
                  <span className="text-[10px] text-slate-400">▼</span>
                </div>
                
                {reclamoDraft.showDestinatarios && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-50 max-h-48 overflow-y-auto p-2">
                    {contactos.filter(c => c.tipo === reclamoDraft.tipoDestino).map(c => (
                      <label key={c.id} className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors">
                        <input 
                          type="checkbox" 
                          checked={(reclamoDraft.destinatarios || []).includes(c.id)}
                          onChange={() => toggleDestinatario(c.id)}
                          className="w-4 h-4 text-orange-500 rounded border-slate-300 focus:ring-orange-500"
                        />
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-slate-700">{c.label || c.alias}</span>
                          <span className="text-[10px] text-slate-400">{c.email}</span>
                        </div>
                      </label>
                    ))}
                    {contactos.filter(c => c.tipo === reclamoDraft.tipoDestino).length === 0 && (
                      <div className="p-2 text-xs text-slate-500 text-center">No hay contactos configurados para este sector.</div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ASUNTO */}
          <div className="shrink-0">
            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Asunto Oficial</label>
            <input 
              type="text" 
              value={reclamoDraft.asunto} 
              onChange={(e) => setReclamoDraft({...reclamoDraft, asunto: e.target.value})}
              className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs font-bold rounded-xl px-4 py-3 outline-none focus:border-orange-500 transition-all"
            />
          </div>

          {/* CUERPO DEL MENSAJE (Espacio Maximizado) */}
          <div className="flex flex-col flex-1 h-full min-h-[350px]">
            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Cuerpo del Mensaje</label>
            <textarea 
              value={reclamoDraft.cuerpo} 
              onChange={(e) => setReclamoDraft({...reclamoDraft, cuerpo: e.target.value})}
              className="w-full h-full min-h-[350px] bg-slate-50/50 border border-slate-200 text-slate-700 text-xs font-mono rounded-xl px-5 py-4 outline-none focus:border-orange-500 focus:bg-white transition-all resize-none shadow-inner"
            />
          </div>
        </div>

        {/* PIE DEL MODAL */}
        <div className="px-8 py-5 bg-white border-t border-slate-100 flex justify-between items-center shrink-0">
          <button 
            onClick={() => setReclamoDraft(null)} 
            className="px-6 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors"
          >
            Cancelar
          </button>
          
          <div className="flex items-center gap-3">
            <button 
              onClick={() => confirmarYGuardarReclamo('HILO')} 
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest bg-white border-2 border-orange-200 text-orange-600 hover:bg-orange-50 hover:border-orange-400 shadow-sm transition-all active:scale-95"
            >
              <Search size={14} /> Continuar Hilo
            </button>

            <button 
              onClick={() => confirmarYGuardarReclamo('NUEVO')} 
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest bg-orange-500 text-white hover:bg-orange-600 shadow-md transition-all active:scale-95"
            >
              <Send size={14} /> Abrir Gmail
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default ModalRedactor;
