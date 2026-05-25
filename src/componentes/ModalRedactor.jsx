import React, { useMemo } from 'react';
import { Send, X, Mail, ChevronDown } from 'lucide-react';
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
  if (!reclamoDraft) return null;

  // Traer y ordenar las plantillas disponibles
  const plantillas = getPlantillasDinamicas() || [];
  const plantillasOrdenadas = useMemo(() => {
    return [...plantillas].sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''));
  }, [plantillas]);

  const contactos = config?.contactos || [];
  const tipoFiltroContacto = reclamoDraft.tipoDestino || 'compras';

  // Manejador de cambio de plantilla
  const handlePlantillaChange = (e) => {
    const tplId = e.target.value;
    const { asunto, cuerpo, destino } = aplicarPlantilla(reclamoDraft.insumo, tplId);
    
    // Mantener o regenerar el ticket de seguimiento
    const ticketActual = reclamoDraft.insumo.ticketReclamo || reclamoDraft.ticketBorrador;
    const asuntoConTicket = asunto.includes(ticketActual) ? asunto : `${asunto} [${ticketActual}]`;

    // Autoseleccionar destinatarios por defecto según el nuevo destino
    let destinatariosMatch = [];
    if (reclamoDraft.insumo.owner && reclamoDraft.insumo.owner !== "Sin asignar") {
      const txtOwner = String(reclamoDraft.insumo.owner).trim().toLowerCase();
      const contacto = contactos.find(c => 
        (c.alias && String(c.alias).trim().toLowerCase() === txtOwner) || 
        (c.label && String(c.label).trim().toLowerCase() === txtOwner)
      );
      if (contacto && contacto.tipo === destino) {
        destinatariosMatch.push(contacto.id);
      }
    }

    setReclamoDraft({
      ...reclamoDraft,
      tipoPlantilla: tplId,
      tipoDestino: destino,
      asunto: asuntoConTicket,
      cuerpo: cuerpo,
      destinatarios: destinatariosMatch,
      showDestinatarios: false
    });
  };

  // Alternar selección de destinatarios checkeados
  const toggleDestinatario = (id) => {
    const actuales = reclamoDraft.destinatarios || [];
    if (actuales.includes(id)) {
      setReclamoDraft({ ...reclamoDraft, destinatarios: actuales.filter(x => x !== id) });
    } else {
      setReclamoDraft({ ...reclamoDraft, destinatarios: [...actuales, id] });
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      exit={{ opacity: 0 }} 
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4"
    >
      <motion.div 
        initial={{ scale: 0.97, y: 15 }} 
        animate={{ scale: 1, y: 0 }} 
        exit={{ scale: 0.97, opacity: 0 }} 
        className="bg-white rounded-3xl w-full max-w-6xl flex flex-col shadow-2xl overflow-hidden h-[88vh] border border-slate-200"
      >
        
        {/* CABECERA MINIMALISTA */}
        <div className="flex justify-between items-center px-8 py-5 border-b border-slate-100 shrink-0 bg-white">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-50 rounded-xl border border-orange-100">
              <Send size={18} className="text-orange-500" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight">Emisión de Reclamo Logístico</h2>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Revisión y despacho oficial vía Gmail</p>
            </div>
          </div>
          <button 
            onClick={() => setReclamoDraft(null)} 
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-all"
          >
            <X size={20} />
          </button>
        </div>

        {/* INFO CANAL ACTIVO */}
        <div className="bg-purple-50/60 px-8 py-2.5 border-b border-purple-100 text-[10px] font-black text-purple-700 uppercase tracking-widest shrink-0 flex items-center gap-2">
          <span className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-pulse"></span>
          Canal Activo: Dirección e Interacción con $\rightarrow$ Sector {tipoFiltroContacto.toUpperCase()}
        </div>

        {/* CUERPO CENTRAL DE TRABAJO */}
        <div className="flex-1 overflow-y-auto px-8 py-6 space-y-6 bg-white">
          
          {/* FILA SUPERIOR: SELECTORES */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 shrink-0">
            <div>
              <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Plantilla Operativa</label>
              <div className="relative">
                <select 
                  value={reclamoDraft.tipoPlantilla} 
                  onChange={handlePlantillaChange} 
                  className="w-full bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 rounded-xl pl-4 pr-10 py-3.5 outline-none focus:border-orange-500 focus:bg-white appearance-none cursor-pointer transition-all shadow-sm"
                >
                  {plantillasOrdenadas.map(p => (
                    <option key={p.id} value={p.id}>{p.nombre.toUpperCase()}</option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </div>
            
            <div>
              <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Destinatarios ({reclamoDraft.destinatarios?.length || 0})</label>
              <div className="relative">
                <div 
                  onClick={() => setReclamoDraft({ ...reclamoDraft, showDestinatarios: !reclamoDraft.showDestinatarios })} 
                  className="w-full bg-white border border-slate-200 text-slate-700 text-xs font-black rounded-xl px-4 py-3.5 flex justify-between items-center cursor-pointer hover:border-orange-500 hover:bg-slate-50/50 transition-all shadow-sm"
                >
                  <span>{reclamoDraft.destinatarios?.length > 0 ? `${reclamoDraft.destinatarios.length} SELECCIONADOS` : 'SELECCIONAR DESTINATARIO'}</span>
                  <ChevronDown size={14} className="text-slate-400" />
                </div>
                
                {reclamoDraft.showDestinatarios && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-2xl z-50 max-h-52 overflow-y-auto p-1.5 space-y-0.5">
                    {contactos.filter(c => c.tipo === tipoFiltroContacto).map(c => (
                      <label key={c.id} className="flex items-center gap-3 p-2.5 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors">
                        <input 
                          type="checkbox" 
                          checked={(reclamoDraft.destinatarios || []).includes(c.id)} 
                          onChange={() => toggleDestinatario(c.id)} 
                          className="w-4 h-4 text-orange-500 rounded border-slate-300 focus:ring-orange-500"
                        />
                        <div className="flex flex-col">
                          <span className="text-xs font-black text-slate-800 uppercase tracking-tight">{c.label || c.alias}</span>
                          <span className="text-[10px] font-bold text-slate-400">{c.email}</span>
                        </div>
                      </label>
                    ))}
                    {contactos.filter(c => c.tipo === tipoFiltroContacto).length === 0 && (
                      <p className="p-3 text-[10px] font-bold text-slate-400 uppercase text-center">Sin contactos en este sector</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* CAMPO: ASUNTO */}
          <div className="shrink-0">
            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Asunto Oficial</label>
            <input 
              type="text" 
              value={reclamoDraft.asunto} 
              onChange={(e) => setReclamoDraft({ ...reclamoDraft, asunto: e.target.value })} 
              className="w-full bg-slate-50 border border-slate-200 text-xs font-black text-slate-800 rounded-xl px-4 py-3.5 outline-none focus:border-orange-500 focus:bg-white transition-all shadow-inner uppercase tracking-tight" 
            />
          </div>

          {/* CAMPO EXTRA-GRANDE Y SANS-SERIF: CUERPO DEL MENSAJE */}
          <div className="flex-1 flex flex-col min-h-0">
            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Cuerpo del Mensaje</label>
            <textarea 
              value={reclamoDraft.cuerpo} 
              onChange={(e) => setReclamoDraft({ ...reclamoDraft, cuerpo: e.target.value })} 
              className="w-full flex-1 min-h-[38vh] bg-slate-50/30 border border-slate-200 text-lg font-medium text-slate-700 rounded-2xl px-6 py-5 outline-none focus:border-orange-500 focus:bg-white transition-all resize-none shadow-inner font-sans leading-relaxed"
              placeholder="Redacte el cuerpo aquí..."
            />
          </div>
        </div>

        {/* PIE DE ACCIONES SAAS */}
        <div className="px-8 py-4 bg-slate-50 border-t border-slate-100 flex justify-between items-center shrink-0">
          <button 
            onClick={() => setReclamoDraft(null)} 
            className="px-5 py-2 rounded-xl text-xs font-bold uppercase tracking-widest text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 transition-all"
          >
            Cancelar
          </button>
          
          <div className="flex gap-3">
            <button 
              onClick={() => confirmarYGuardarReclamo('HILO')} 
              className="px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest bg-white border border-orange-200 text-orange-600 hover:bg-orange-50 hover:border-orange-300 shadow-sm transition-all flex items-center gap-2"
            >
              Continuar Hilo
            </button>
            <button 
              onClick={() => confirmarYGuardarReclamo('NUEVO')} 
              className="px-8 py-3 rounded-xl font-black text-xs uppercase tracking-widest bg-orange-500 text-white hover:bg-orange-600 shadow-lg shadow-orange-500/20 transition-all flex items-center gap-2"
            >
              <Mail size={14} /> Abrir Gmail
            </button>
          </div>
        </div>

      </motion.div>
    </motion.div>
  );
};

export default ModalRedactor;
