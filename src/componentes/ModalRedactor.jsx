import React from 'react';
import { X, Send, Search } from 'lucide-react';
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

  const plantillas = getPlantillasDinamicas();
  const contactos = config?.contactos || [];

  // Función táctica: Cambia la plantilla y recalcula el texto sin romper nada
  const handlePlantillaChange = (e) => {
    const newTemplateId = e.target.value;
    const { asunto, cuerpo, destino } = aplicarPlantilla(reclamoDraft.insumo, newTemplateId);
    
    let destinatariosMatch = [];
    if (reclamoDraft.insumo.owner && reclamoDraft.insumo.owner !== "Sin asignar") {
        const txtOwner = String(reclamoDraft.insumo.owner).trim().toLowerCase();
        const contacto = contactos.find(c => (c.alias && String(c.alias).trim().toLowerCase() === txtOwner) || (c.label && String(c.label).trim().toLowerCase() === txtOwner));
        if (contacto && contacto.tipo === destino) destinatariosMatch.push(contacto.id);
    }

    const ticketActual = reclamoDraft.ticketBorrador;
    const asuntoConTicket = `${asunto} [${ticketActual}]`;

    setReclamoDraft({
      ...reclamoDraft,
      tipoPlantilla: newTemplateId,
      tipoDestino: destino,
      asunto: asuntoConTicket,
      cuerpo: cuerpo,
      destinatarios: destinatariosMatch
    });
  };

  // Función táctica: Seleccionar/Deseleccionar destinatarios
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
            <Send size={18} className="text-orange-500" /> Nuevo Reclamo a Compras
          </h2>
          <button 
            onClick={() => setReclamoDraft(null)} 
            className="p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
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
