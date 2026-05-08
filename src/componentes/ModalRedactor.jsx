import React from 'react';
import { Send, X, ChevronRight, Activity, Mail } from 'lucide-react';
import { motion } from 'framer-motion';

const ModalRedactor = ({
  reclamoDraft,
  setReclamoDraft,
  config,
  currentUser,
  getPlantillasDinamicas,
  aplicarPlantilla,
  confirmarYGuardarReclamo,
  solicitarAlertaPlanta
}) => {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[9998] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 md:p-8">
      <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl h-[85vh] overflow-hidden flex flex-col border border-slate-200">
        
        {/* CABECERA DEL REDACTOR */}
        <div className="bg-slate-900 p-5 flex justify-between items-center border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-orange-500/20 flex items-center justify-center"><Send size={16} className="text-orange-500" /></div>
            <h3 className="text-white font-black uppercase tracking-widest text-sm">Centro de Comunicaciones Tácticas</h3>
          </div>
          <button onClick={() => setReclamoDraft(null)} className="text-slate-400 hover:text-white transition-colors"><X size={20}/></button>
        </div>
        
        {/* CUERPO DEL REDACTOR */}
        <div className="p-6 bg-slate-50 flex-1 overflow-hidden flex flex-col min-h-0 gap-5">
          <div className="grid grid-cols-2 gap-6 shrink-0">
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Plantilla de Comunicación</label>
              <div className="relative">
                <select 
                  value={reclamoDraft.tipoPlantilla} 
                  onChange={(e) => { 
                    const val = e.target.value;
                    const p = aplicarPlantilla(reclamoDraft.insumo, val); 
                    
                    // Magia: Si cambia de plantilla, le volvemos a inyectar el ticket al final
                    const asuntoConTicket = p.destino === 'equipo' || p.destino === 'planta' ? p.asunto : `${p.asunto} [${reclamoDraft.ticketBorrador}]`;
                    
                    setReclamoDraft(prev => ({...prev, tipoPlantilla: val, asunto: asuntoConTicket, cuerpo: p.cuerpo, tipoDestino: p.destino, destinatarios: []}));
                  }} 
                  className="w-full px-4 py-3 bg-white border-2 border-orange-500 text-orange-600 font-black uppercase tracking-widest text-xs rounded-xl outline-none focus:ring-2 focus:ring-orange-500/50 appearance-none cursor-pointer shadow-sm"
                >
                  {getPlantillasDinamicas().map(p => (
                    <option key={p.id} value={p.id}>{p.nombre}</option>
                  ))}
                </select>
                <ChevronRight size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-orange-500 rotate-90 pointer-events-none" />
              </div>
            </div>

            <div className="relative">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Destinatarios</label>
              <button 
                onClick={() => setReclamoDraft({...reclamoDraft, showDestinatarios: !reclamoDraft.showDestinatarios})} 
                className={`w-full px-4 py-3 border-2 rounded-xl text-xs font-black uppercase tracking-widest flex justify-between items-center transition-all shadow-sm ${reclamoDraft.destinatarios.length > 0 ? 'border-orange-500 text-orange-600 bg-orange-50/50' : 'border-slate-200 text-slate-500 hover:border-slate-300 bg-white'}`}
              >
                <span>{reclamoDraft.destinatarios.length > 0 ? `Seleccionados (${reclamoDraft.destinatarios.length})` : 'Elegir Contactos...'}</span>
                <ChevronRight size={16} className={`transition-transform duration-200 ${reclamoDraft.showDestinatarios ? '-rotate-90' : 'rotate-90'}`} />
              </button>

              {reclamoDraft.showDestinatarios && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setReclamoDraft({...reclamoDraft, showDestinatarios: false})}></div>
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-2xl z-50 max-h-48 overflow-y-auto p-1.5">
                    {(config.contactos||[]).filter(c=>c.tipo === reclamoDraft.tipoDestino).map(c => (
                      <label key={c.id} className="flex items-center gap-3 px-3 py-2.5 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors group">
                        <input type="checkbox" checked={reclamoDraft.destinatarios.includes(c.id)} onChange={() => { const d = reclamoDraft.destinatarios.includes(c.id) ? reclamoDraft.destinatarios.filter(id=>id!==c.id) : [...reclamoDraft.destinatarios, c.id]; setReclamoDraft({...reclamoDraft, destinatarios: d}); }} className="w-4 h-4 rounded border-slate-300 text-orange-500 focus:ring-orange-500 cursor-pointer" />
                        <div className="min-w-0"><p className={`text-[11px] font-black uppercase truncate transition-colors ${reclamoDraft.destinatarios.includes(c.id) ? 'text-orange-600' : 'text-slate-700 group-hover:text-slate-900'}`}>{c.label}</p><p className="text-[9px] text-slate-400 truncate">{c.email}</p></div>
                      </label>
                    ))}
                    {(config.contactos||[]).filter(c=>c.tipo === reclamoDraft.tipoDestino).length === 0 && <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest text-center py-4">Sin contactos configurados</p>}
                  </div>
                </>
              )}
            </div>
          </div>
          
          <div className="shrink-0">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Asunto Oficial</label>
            <input type="text" value={reclamoDraft.asunto} onChange={(e) => setReclamoDraft({...reclamoDraft, asunto: e.target.value})} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 transition-all shadow-sm"/>
          </div>

          <div className="flex-1 flex flex-col min-h-0">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 shrink-0">Cuerpo del Mensaje</label>
            <textarea value={reclamoDraft.cuerpo} onChange={(e) => setReclamoDraft({...reclamoDraft, cuerpo: e.target.value})} className="w-full flex-1 p-4 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 font-mono outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 transition-all leading-relaxed resize-none shadow-inner" />
          </div>

        </div>
        
        <div className="px-5 pb-5">
        <div className="pt-4 border-t border-slate-100">
          <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-1.5 mb-2">
            <Mail size={12} /> Destinatario Adicional (Opcional)
          </label>
          <input 
            type="email" 
            placeholder="ejemplo@correo.com, otro@correo.com" 
            value={reclamoDraft.correoManual || ""}
            onChange={(e) => setReclamoDraft({ ...reclamoDraft, correoManual: e.target.value })}
            className="w-full p-2.5 text-xs font-bold text-slate-700 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-orange-500/20 bg-slate-50 transition-all"
          />
          <p className="text-[9px] text-slate-400 font-bold mt-1.5">
            Podés escribir un correo si la persona no está en el directorio. (Separá con comas si son varios).
          </p>
        </div>
      </div>

        {/* FOOTER: BOTONERA DE ENVÍO */}
        <div className="p-5 bg-white border-t border-slate-100 flex justify-end gap-3 shrink-0">
          <button onClick={() => setReclamoDraft(null)} className="px-6 py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest text-slate-500 hover:bg-slate-100 transition-all">Cancelar</button>
          
          {(() => {
            const isOwner = currentUser.rol === 'owner';
            const isAlertaInterna = reclamoDraft.tipoDestino === 'equipo' || reclamoDraft.tipoDestino === 'planta';
            const { alertaPendiente, alertaAprobada } = reclamoDraft.insumo;

            // OPERARIO
            if (!isOwner && isAlertaInterna) {
              if (alertaAprobada) {
                return (
                  <button onClick={confirmarYGuardarReclamo} className="px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest bg-emerald-500 text-white hover:bg-emerald-600 shadow-lg shadow-emerald-500/30 transition-all flex items-center gap-2 active:scale-95 animate-pulse">
                    <Send size={16} /> Enviar Alerta Aprobada
                  </button>
                );
              } else if (alertaPendiente) {
                return (
                  <button disabled className="px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest bg-amber-100 text-amber-500 cursor-not-allowed flex items-center gap-2">
                    <Activity size={16} /> En Revisión por Gerencia
                  </button>
                );
              } else {
                return (
                  <button onClick={() => { solicitarAlertaPlanta(reclamoDraft.insumo); setReclamoDraft(null); }} className="px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest bg-purple-600 text-white hover:bg-purple-700 shadow-lg shadow-purple-600/30 transition-all flex items-center gap-2 active:scale-95">
                    <Activity size={16} /> Solicitar Permiso a Planta
                  </button>
                );
              }
            }

            // ADMIN o PROVEEDORES (Nuevos botones duales)
            return (
              <div className="flex gap-2">
                {/* Botón A: Opción 2 - Buscador Asistido (El Ticket Mágico) */}
                {!isAlertaInterna && (
                  <button onClick={() => confirmarYGuardarReclamo('HILO')} className="px-5 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest bg-slate-800 text-white hover:bg-slate-900 shadow-md transition-all flex items-center gap-2 active:scale-95 border border-slate-700" title="Copia el texto y busca el ticket en tu Gmail para que respondas en el hilo correcto">
                    <Mail size={14} /> Continuar Hilo
                  </button>
                )}
                
                {/* Botón B: Nuevo Correo (Genera Ticket Nuevo) */}
                <button onClick={() => confirmarYGuardarReclamo('NUEVO')} className={`px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest text-white shadow-lg transition-all flex items-center gap-2 active:scale-95 ${isAlertaInterna ? 'bg-orange-500 hover:bg-orange-600 shadow-orange-500/30' : 'bg-orange-600 hover:bg-orange-700 shadow-orange-600/30'}`}>
                  <Send size={16} /> {isAlertaInterna ? 'Disparar y Guardar' : 'Enviar Reclamo Nuevo'}
                </button>
              </div>
            );
          })()}
        </div>

      </motion.div>
    </motion.div>
  );
};

export default ModalRedactor;
