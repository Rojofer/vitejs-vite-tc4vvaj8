import React, { useState, useRef, useEffect } from 'react';
import { Settings, Users, Activity, Mail, TrendingUp, Calendar, Database, X, Plus, Trash2, Download, Upload, Save, Star, Clock, Factory, Eye, CheckCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const PanelAjustes = ({ configInicial, onClose, onGuardar, onExportar, onImportar }) => {
  const [settingsTab, setSettingsTab] = useState('compras');
  const [localConfig, setLocalConfig] = useState(configInicial || {});
  const [nuevoFeriado, setNuevoFeriado] = useState("");
  const fileInputRef = useRef(null);
  const [expandedTemplates, setExpandedTemplates] = useState([]);

  useEffect(() => {
    setLocalConfig(configInicial || {});
  }, [configInicial]);

  const getPlantillas = () => localConfig.plantillasDinamicas || [];

  return (
    <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} className="bg-white rounded-2xl shadow-2xl w-full max-w-7xl h-[90vh] overflow-hidden flex flex-col border border-slate-200">
      
      <div className="bg-slate-900 p-5 flex justify-between items-center border-b border-slate-800 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center shadow-inner border border-slate-700"><Settings size={16} className="text-slate-300" /></div>
          <div>
            <h2 className="text-lg font-black text-white uppercase tracking-tight">Centro de Control</h2>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Configuración Global del ERP</p>
          </div>
        </div>
        <button onClick={onClose} className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all"><X size={20} /></button>
      </div>

      <div className="flex flex-1 overflow-hidden bg-[#F8FAFC]">
        
        {/* SIDEBAR DE NAVEGACIÓN */}
        <div className="w-64 bg-white border-r border-slate-200 flex flex-col py-6 shrink-0 overflow-y-auto hidden md:flex">
          <p className="px-6 text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">Módulos de Sistema</p>
          <nav className="flex flex-col px-3 space-y-1">
            <button onClick={() => setSettingsTab('compras')} className={`flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${settingsTab === 'compras' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'}`}>
              <Mail size={16} /> Plantillas Correos
            </button>
            <button onClick={() => setSettingsTab('equipo')} className={`flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${settingsTab === 'equipo' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'}`}>
              <Users size={16} /> Directorio Equipo
            </button>
            <button onClick={() => setSettingsTab('parametros')} className={`flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${settingsTab === 'parametros' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'}`}>
              <Activity size={16} /> Parámetros
            </button>
            <button onClick={() => setSettingsTab('feriados')} className={`flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${settingsTab === 'feriados' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'}`}>
              <Calendar size={16} /> Feriados
            </button>
            <button onClick={() => setSettingsTab('bd')} className={`flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all mt-4 border ${settingsTab === 'bd' ? 'bg-slate-900 text-white border-slate-800 shadow-md' : 'border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'}`}>
              <Database size={16} /> Base de Datos
            </button>
          </nav>
        </div>

        {/* CONTENIDO PRINCIPAL */}
        <div className="flex-1 overflow-y-auto relative scroll-smooth">
          
          {/* PESTAÑA: PLANTILLAS (Dinámicas) */}
          {settingsTab === 'compras' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-6 md:p-8 space-y-8 max-w-5xl mx-auto">
              <div className="border-b border-slate-200 pb-4 mb-6 flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Plantillas Dinámicas de Redacción</h3>
                  <p className="text-xs text-slate-500 font-bold mt-1">Configurá múltiples formatos de correo con variables autocompletables.</p>
                </div>
                <button 
                  onClick={() => {
                    const idNuevo = `tpl_${Date.now()}`;
                    setLocalConfig({
                      ...localConfig,
                      plantillasDinamicas: [...getPlantillas(), { id: idNuevo, nombre: "Nueva Plantilla", isNormal: false, isUrgente: false, isSolped: false, asunto: "", cuerpo: "", destino: "compras" }]
                    });
                    setExpandedTemplates([...expandedTemplates, idNuevo]);
                  }}
                  className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-emerald-500/30 transition-all"
                >
                  <Plus size={14}/> Crear Plantilla
                </button>
              </div>

              {/* NUEVO BLOQUE: SUB-PLANTILLA PARA LOTES (GLOBAL) */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 shadow-inner mb-8">
                <div className="mb-4">
                  <h4 className="text-sm font-black text-slate-800 uppercase tracking-tight flex items-center gap-2"><Mail size={16} className="text-orange-500"/> Estructura Base para Lotes (Sub-Plantilla)</h4>
                  <p className="text-[10px] text-slate-500 font-bold mt-1">Definí cómo se verá cada insumo cuando selecciones varios a la vez. Este bloque se repetirá por cada material y reemplazará a las etiquetas {'{ocs}'} o {'{solpeds}'}.</p>
                </div>
                <div className="flex gap-1.5 flex-wrap mb-2">
                   <span className="text-[8px] font-mono bg-orange-100 text-orange-800 px-1.5 py-0.5 rounded cursor-help">{"{codigo}"}</span>
                   <span className="text-[8px] font-mono bg-orange-100 text-orange-800 px-1.5 py-0.5 rounded cursor-help">{"{nombre}"}</span>
                   <span className="text-[8px] font-mono bg-red-100 text-red-800 px-1.5 py-0.5 rounded cursor-help">{"{dias}"}</span>
                   <span className="text-[8px] font-mono bg-sky-100 text-sky-800 px-1.5 py-0.5 rounded cursor-help" title="Inyecta el listado de fechas de SAP">{"{repartos_sap}"}</span>
                   <span className="text-[8px] font-mono bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded cursor-help" title="Suma total matemática">{"{total}"}</span>
                </div>
                <textarea 
                  value={localConfig.plantillaItemLote !== undefined ? localConfig.plantillaItemLote : "🔸 [{codigo}] {nombre}\n     ↳ Cobertura actual: {dias} Días\n{repartos_sap}\n     ↳ TOTAL ADEUDADO: {total} un."}
                  onChange={(e) => setLocalConfig({...localConfig, plantillaItemLote: e.target.value})}
                  className="w-full p-4 bg-white border border-slate-200 rounded-xl text-xs font-mono text-slate-700 outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-50 transition-all h-32 resize-y shadow-sm leading-relaxed" 
                  placeholder="Armá la estructura acá..." 
                />
              </div>

              <div className="grid grid-cols-1 gap-6">
                <AnimatePresence>
                {getPlantillas().map((tpl, index) => (
                  <motion.div key={tpl.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm group">
                    <div className={`flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 ${expandedTemplates.includes(tpl.id) ? 'border-b border-slate-100 pb-4 mb-4' : ''}`}>
                      <div className="flex-1 flex gap-3 w-full xl:w-auto items-center">
                        <button 
                           onClick={() => expandedTemplates.includes(tpl.id) ? setExpandedTemplates(expandedTemplates.filter(id => id !== tpl.id)) : setExpandedTemplates([...expandedTemplates, tpl.id])} 
                           className="p-1.5 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200 text-slate-400 hover:text-slate-700 shrink-0"
                        >
                          {expandedTemplates.includes(tpl.id) ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                        </button>
                        <div className="bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200 flex items-center shrink-0 hidden sm:flex">
                           <span className="text-[10px] font-black text-slate-500">ID: {tpl.id.slice(-4)}</span>
                        </div>
                        <input 
                           type="text" 
                           value={tpl.nombre}
                           onChange={(e) => {
                             const nuevas = [...getPlantillas()];
                             nuevas[index].nombre = e.target.value;
                             setLocalConfig({...localConfig, plantillasDinamicas: nuevas});
                           }}
                           className="font-black text-lg text-slate-800 uppercase bg-transparent outline-none focus:border-b-2 focus:border-orange-500 transition-all w-full placeholder:text-slate-300"
                           placeholder="Nombre de Plantilla (Ej: Reclamo Urgente)"
                        />
                      </div>
                      
                      <div className="flex gap-2 shrink-0 flex-wrap">
                        <button onClick={() => { const nuevas = [...getPlantillas()]; nuevas[index].isNormal = !nuevas[index].isNormal; setLocalConfig({...localConfig, plantillasDinamicas: nuevas}); }} className={`px-3 py-1.5 rounded text-[9px] font-black uppercase tracking-widest transition-all border ${tpl.isNormal ? 'bg-slate-800 text-white border-slate-900' : 'bg-white text-slate-400 border-slate-200 hover:bg-slate-50'}`} title="Usar por defecto para Seguimientos Normales"> Default Normal </button>
                        <button onClick={() => { const nuevas = [...getPlantillas()]; nuevas[index].isUrgente = !nuevas[index].isUrgente; setLocalConfig({...localConfig, plantillasDinamicas: nuevas}); }} className={`px-3 py-1.5 rounded text-[9px] font-black uppercase tracking-widest transition-all border ${tpl.isUrgente ? 'bg-red-500 text-white border-red-600' : 'bg-white text-slate-400 border-slate-200 hover:bg-red-50 hover:text-red-500'}`} title="Usar por defecto para Insumos en Quiebre"> Default Urgente </button>
                        <button onClick={() => { const nuevas = [...getPlantillas()]; nuevas[index].isSolped = !nuevas[index].isSolped; setLocalConfig({...localConfig, plantillasDinamicas: nuevas}); }} className={`px-3 py-1.5 rounded text-[9px] font-black uppercase tracking-widest transition-all border ${tpl.isSolped ? 'bg-indigo-500 text-white border-indigo-600' : 'bg-white text-slate-400 border-slate-200 hover:bg-indigo-50 hover:text-indigo-500'}`} title="Usar por defecto para Solpeds sin OC"> Default Solped </button>
                        <button onClick={() => { if(window.confirm(`¿Eliminar plantilla ${tpl.nombre}?`)) { const nuevas = getPlantillas().filter((_, i) => i !== index); setLocalConfig({...localConfig, plantillasDinamicas: nuevas}); } }} className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded border border-transparent hover:border-red-100 transition-colors"> <Trash2 size={16}/> </button>
                      </div>
                    </div>

                    <AnimatePresence>
                      {expandedTemplates.includes(tpl.id) && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                          <div className="space-y-4 pt-2">
                            <div className="flex flex-col md:flex-row gap-4 items-center">
                               <div className="flex-1 w-full">
                                 <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Estructura del Asunto</label>
                                 <input type="text" value={tpl.asunto} onChange={(e) => { const nuevas = [...getPlantillas()]; nuevas[index].asunto = e.target.value; setLocalConfig({...localConfig, plantillasDinamicas: nuevas}); }} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:bg-white focus:border-orange-500 focus:ring-4 focus:ring-orange-50 transition-all placeholder:text-slate-300 shadow-inner" placeholder="Ej: URGENTE: {nombre} - {codigo}" />
                               </div>
                               <div className="w-full md:w-48 shrink-0">
                                 <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Bandeja Destino</label>
                                 <select value={tpl.destino || 'compras'} onChange={(e) => { const nuevas = [...getPlantillas()]; nuevas[index].destino = e.target.value; setLocalConfig({...localConfig, plantillasDinamicas: nuevas}); }} className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs font-black uppercase text-slate-700 outline-none focus:border-sky-500 transition-all shadow-sm">
                                   <option value="compras">Sector Compras</option>
                                   <option value="planta">Interno Planta</option>
                                 </select>
                               </div>
                            </div>
                            
                            <div>
                               <div className="flex justify-between items-end mb-1.5">
                                 <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest">Cuerpo del Correo</label>
                                 <div className="flex gap-1.5 flex-wrap justify-end">
                                   <span className="text-[8px] font-mono bg-orange-100 text-orange-800 px-1.5 py-0.5 rounded cursor-help" title="Nombre del insumo">{"{nombre}"}</span>
                                   <span className="text-[8px] font-mono bg-orange-100 text-orange-800 px-1.5 py-0.5 rounded cursor-help" title="Código SAP">{"{codigo}"}</span>
                                   <span className="text-[8px] font-mono bg-red-100 text-red-800 px-1.5 py-0.5 rounded cursor-help" title="Días para quiebre">{"{dias}"}</span>
                                   <span className="text-[8px] font-mono bg-sky-100 text-sky-800 px-1.5 py-0.5 rounded cursor-help" title="Listado OC demoradas">{"{ocs}"}</span>
                                   <span className="text-[8px] font-mono bg-teal-100 text-teal-800 px-1.5 py-0.5 rounded cursor-help" title="Listado OC a futuro">{"{ocs_a_adelantar}"}</span>
                                   <span className="text-[8px] font-mono bg-indigo-100 text-indigo-800 px-1.5 py-0.5 rounded cursor-help" title="Listado S/P sin OC">{"{solpeds}"}</span>
                                 </div>
                              </div>
                              <textarea value={tpl.cuerpo} onChange={(e) => { const nuevas = [...getPlantillas()]; nuevas[index].cuerpo = e.target.value; setLocalConfig({...localConfig, plantillasDinamicas: nuevas}); }} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-700 outline-none focus:bg-white focus:border-orange-500 focus:ring-4 focus:ring-orange-50 transition-all h-40 resize-y shadow-inner leading-relaxed" placeholder="Escribí acá el cuerpo del mensaje..." />
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                ))}
                </AnimatePresence>
                {getPlantillas().length === 0 && (
                  <div className="text-center py-16 bg-white border border-slate-200 border-dashed rounded-2xl">
                    <Mail size={32} className="mx-auto text-slate-300 mb-3"/>
                    <p className="text-slate-500 font-bold text-sm uppercase tracking-wider">No hay plantillas creadas</p>
                    <p className="text-slate-400 text-xs mt-1">Hacé clic en "Crear Plantilla" para empezar a automatizar la redacción.</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* PESTAÑA: DIRECTORIO DE EQUIPO */}
          {settingsTab === 'equipo' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-6 md:p-8 space-y-6 max-w-5xl mx-auto">
              <div className="flex justify-between items-end border-b border-slate-200 pb-4 mb-6">
                <div>
                  <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Directorio Operativo</h3>
                  <p className="text-xs text-slate-500 font-bold mt-1">Contactos vinculados al Auto-Redactor y a las etiquetas de colores.</p>
                </div>
                <button onClick={() => {
                  const nuevos = [...(localConfig.contactos || []), { id: Date.now().toString(), label: "Nuevo Contacto", alias: "", email: "", tipo: "compras", color: "slate" }];
                  setLocalConfig({ ...localConfig, contactos: nuevos });
                }} className="flex items-center gap-2 bg-sky-500 hover:bg-sky-600 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-sky-500/30 transition-all"><Plus size={14}/> Agregar Contacto</button>
              </div>

              {(() => {
                const contactosConIndice = (localConfig.contactos || []).map((c, i) => ({ ...c, idxReal: i }));
                
                const gruposContactos = [
                  { id: 'equipo', titulo: 'ERP / Operarios de Planta', items: contactosConIndice.filter(c => c.tipo === 'equipo'), icon: <Activity size={16} className="text-orange-500"/>, color: 'text-orange-800', bg: 'bg-orange-50', border: 'border-orange-200', bar: 'bg-orange-500' },
                  { id: 'compras', titulo: 'Sector Compras', items: contactosConIndice.filter(c => c.tipo === 'compras'), icon: <Mail size={16} className="text-sky-500"/>, color: 'text-sky-800', bg: 'bg-sky-50', border: 'border-sky-200', bar: 'bg-sky-500' },
                  { id: 'planta', titulo: 'Directorio General Planta', items: contactosConIndice.filter(c => c.tipo === 'planta'), icon: <Factory size={16} className="text-purple-500"/>, color: 'text-purple-800', bg: 'bg-purple-50', border: 'border-purple-200', bar: 'bg-purple-500' }
                ];
                
                const otrosContactos = contactosConIndice.filter(c => !['equipo', 'compras', 'planta'].includes(c.tipo));
                if (otrosContactos.length > 0) gruposContactos.push({ id: 'otros', titulo: 'Otros / Sin Clasificar', items: otrosContactos, icon: <Users size={16} className="text-slate-500"/>, color: 'text-slate-800', bg: 'bg-slate-50', border: 'border-slate-200', bar: 'bg-slate-500' });

                return (
                  <div className="flex flex-col gap-8">
                    {gruposContactos.map(grupo => {
                      if (grupo.items.length === 0) return null;
                      return (
                        <div key={grupo.id} className="space-y-4">
                          <h4 className={`text-[10px] font-black uppercase tracking-widest flex items-center gap-2 px-4 py-2.5 rounded-xl ${grupo.bg} ${grupo.color} ${grupo.border} border shadow-sm`}>
                            {grupo.icon} {grupo.titulo} <span className="bg-white/50 px-2 py-0.5 rounded-full text-slate-800">{grupo.items.length}</span>
                          </h4>
                          <div className="grid gap-4 pl-1 md:pl-3 border-l-2 border-slate-100">
                            {grupo.items.map((contacto) => {
                              const idx = contacto.idxReal;
                              return (
                                <motion.div key={contacto.id || idx} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col md:flex-row gap-4 p-4 bg-white border border-slate-200 rounded-2xl items-start md:items-center shadow-sm relative group overflow-hidden">
                                  
                                  <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${grupo.bar}`}></div>
                                 
                                  <div className="w-full md:w-48 pl-2 shrink-0">
                                    <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Nombre / Cargo</label>
                                    <input type="text" value={contacto.label} onChange={(e) => { const nuevos = [...localConfig.contactos]; nuevos[idx].label = e.target.value; setLocalConfig({ ...localConfig, contactos: nuevos }); }} className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg text-xs font-bold text-slate-800 outline-none focus:bg-white focus:border-sky-500 transition-all shadow-inner" placeholder="Ej: Juan Pérez" />
                                  </div>
                                  
                                  <div className="w-full md:w-32 shrink-0">
                                    <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1">Alias SAP <span className="text-slate-300" title="Nombre exacto que figura en el Excel de SAP">ⓘ</span></label>
                                    <input type="text" value={contacto.alias} onChange={(e) => { const nuevos = [...localConfig.contactos]; nuevos[idx].alias = e.target.value; setLocalConfig({ ...localConfig, contactos: nuevos }); }} className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg text-xs font-bold text-slate-800 outline-none focus:bg-white focus:border-sky-500 transition-all uppercase shadow-inner" placeholder="Ej: JPEREZ" />
                                  </div>
                                  
                                  <div className="flex-1 w-full">
                                    <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Correo Electrónico</label>
                                    <input type="email" value={contacto.email} onChange={(e) => { const nuevos = [...localConfig.contactos]; nuevos[idx].email = e.target.value; setLocalConfig({ ...localConfig, contactos: nuevos }); }} className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg text-xs font-bold text-slate-800 outline-none focus:bg-white focus:border-sky-500 transition-all shadow-inner" placeholder="ejemplo@empresa.com" />
                                  </div>
                                  
                                  <div className="w-full md:w-28 shrink-0">
                                    <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Sector</label>
                                    <select value={contacto.tipo} onChange={(e) => { const nuevos = [...localConfig.contactos]; nuevos[idx].tipo = e.target.value; setLocalConfig({ ...localConfig, contactos: nuevos }); }} className={`w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg text-xs font-black uppercase outline-none focus:bg-white focus:border-sky-500 transition-all shadow-inner ${contacto.tipo === 'equipo' ? 'text-orange-600' : contacto.tipo === 'planta' ? 'text-purple-600' : 'text-sky-600'}`}>
                                      <option value="compras">Compras</option>
                                      <option value="equipo">ERP / Operario</option>
                                      <option value="planta">Directorio Planta</option>
                                    </select>
                                  </div>
                                  
                                  {contacto.tipo === 'equipo' && (
                                     <div className="w-full md:w-auto shrink-0 flex flex-col gap-1.5 border-l border-slate-100 pl-3">
                                       <label className="flex items-center gap-2 cursor-pointer">
                                          <input type="checkbox" checked={contacto.editorFavoritos || false} onChange={(e) => { const n = [...localConfig.contactos]; n[idx].editorFavoritos = e.target.checked; setLocalConfig({...localConfig, contactos: n}); }} className="w-3.5 h-3.5 text-orange-500 rounded border-slate-300 focus:ring-orange-500" />
                                          <span className="text-[9px] font-black uppercase text-slate-500 flex items-center gap-1"><Star size={10} className="text-yellow-500"/> Editar Favs</span>
                                       </label>
                                       <label className="flex items-center gap-2 cursor-pointer">
                                          <input type="checkbox" checked={contacto.visionGlobal || false} onChange={(e) => { const n = [...localConfig.contactos]; n[idx].visionGlobal = e.target.checked; setLocalConfig({...localConfig, contactos: n}); }} className="w-3.5 h-3.5 text-sky-500 rounded border-slate-300 focus:ring-sky-500" />
                                          <span className="text-[9px] font-black uppercase text-slate-500 flex items-center gap-1"><Eye size={10} className="text-sky-500"/> Visión Global</span>
                                       </label>
                                     </div>
                                  )}
                                  
                                  <div className="w-full md:w-20 shrink-0">
                                    <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Color</label>
                                    <select value={contacto.color || 'slate'} onChange={(e) => { const nuevos = [...localConfig.contactos]; nuevos[idx].color = e.target.value; setLocalConfig({ ...localConfig, contactos: nuevos }); }} className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg text-xs font-bold text-slate-800 outline-none focus:bg-white focus:border-sky-500 transition-all shadow-inner">
                                      <option value="slate">Gris</option>
                                      <option value="emerald">Verde</option>
                                      <option value="purple">Violeta</option>
                                      <option value="blue">Azul</option>
                                      <option value="pink">Rosa</option>
                                      <option value="amber">Ámbar</option>
                                      <option value="indigo">Índigo</option>
                                    </select>
                                  </div>

                                  <button onClick={() => { const nuevos = localConfig.contactos.filter((_, i) => i !== idx); setLocalConfig({ ...localConfig, contactos: nuevos }); }} className="mt-4 md:mt-0 p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors shrink-0">
                                    <Trash2 size={18} />
                                  </button>
                                </motion.div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </motion.div>
          )}

          {/* PESTAÑA: PARÁMETROS GENERALES (Renovada SaaS) */}
          {settingsTab === 'parametros' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-6 md:p-8 space-y-8 overflow-y-auto h-full max-w-5xl mx-auto">
              
              {/* BLOQUE 1: UMBRALES Y CIERRE DE TICKETS */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                 {/* Umbrales Logísticos */}
                 <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm">
                    <h5 className="font-black text-slate-800 text-sm uppercase tracking-tight flex items-center gap-2 mb-4"><Activity size={16} className="text-orange-500"/> Sensibilidad del Radar</h5>
                    <div className="space-y-5">
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Umbral Crítico (Quiebre)</label>
                          <span className="text-xs font-black text-red-600 bg-red-50 px-2 py-0.5 rounded border border-red-100">{localConfig.umbralCritico !== undefined ? localConfig.umbralCritico : 0} d</span>
                        </div>
                        <input type="range" min="0" max="10" value={localConfig.umbralCritico !== undefined ? localConfig.umbralCritico : 0} onChange={(e) => setLocalConfig({...localConfig, umbralCritico: Number(e.target.value)})} className="w-full accent-red-500 h-2 bg-slate-100 rounded-lg appearance-none mt-2" />
                      </div>
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Umbral de Urgencia (Riesgo)</label>
                          <span className="text-xs font-black text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-100">{localConfig.umbralUrgencia !== undefined ? localConfig.umbralUrgencia : 15} d</span>
                        </div>
                        <input type="range" min="1" max="45" value={localConfig.umbralUrgencia !== undefined ? localConfig.umbralUrgencia : 15} onChange={(e) => setLocalConfig({...localConfig, umbralUrgencia: Number(e.target.value)})} className="w-full accent-amber-500 h-2 bg-slate-100 rounded-lg appearance-none mt-2" />
                      </div>
                    </div>
                 </div>

                 {/* Cierre de Tickets */}
                 <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm flex flex-col">
                    <h5 className="font-black text-slate-800 text-sm uppercase tracking-tight flex items-center gap-2 mb-4"><CheckCircle size={16} className="text-purple-500"/> Resolución de Tickets</h5>
                    <p className="text-[10px] font-bold text-slate-500 mb-4 leading-relaxed">Definí cómo el sistema limpia la pizarra de auditoría cuando un insumo recupera su nivel de stock o sale de la zona de riesgo.</p>
                    <div className="flex gap-3 mt-auto">
                      <button type="button" onClick={() => setLocalConfig({...localConfig, modoCierreReclamos: 'manual'})} className={`flex-1 py-3 px-4 rounded-xl border text-left transition-all ${localConfig.modoCierreReclamos !== 'auto' ? 'bg-purple-50 border-purple-300 shadow-sm' : 'bg-white border-slate-200 hover:border-purple-200'}`}>
                        <span className={`block text-[10px] font-black uppercase tracking-widest mb-0.5 ${localConfig.modoCierreReclamos !== 'auto' ? 'text-purple-700' : 'text-slate-600'}`}>Manual</span>
                        <span className="text-[9px] font-bold text-slate-400">El operario cierra el hilo</span>
                      </button>
                      <button type="button" onClick={() => setLocalConfig({...localConfig, modoCierreReclamos: 'auto'})} className={`flex-1 py-3 px-4 rounded-xl border text-left transition-all ${localConfig.modoCierreReclamos === 'auto' ? 'bg-purple-50 border-purple-300 shadow-sm' : 'bg-white border-slate-200 hover:border-purple-200'}`}>
                        <span className={`block text-[10px] font-black uppercase tracking-widest mb-0.5 ${localConfig.modoCierreReclamos === 'auto' ? 'text-purple-700' : 'text-slate-600'}`}>Automático</span>
                        <span className="text-[9px] font-bold text-slate-400">Si el stock sube, se cierra</span>
                      </button>
                    </div>
                 </div>
               </div>

              {/* BLOQUE 2: MOTOR DE ALERTAS AUTOMÁTICAS */}
              <div className="bg-white border border-indigo-100 p-6 rounded-2xl shadow-sm">
                <div className="border-b border-slate-100 pb-4 mb-6">
                  <h5 className="font-black text-indigo-900 text-sm uppercase tracking-tight flex items-center gap-2"><Mail size={16} className="text-indigo-500"/> Motor de Alertas Diarias (08:00 AM)</h5>
                  <p className="text-[10px] font-bold text-slate-500 mt-1">Configuración del reporte automático enviado a cada operario con sus materiales críticos.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                  <div>
                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Email Administrador (Reply-To)</label>
                    <input 
                      type="email" 
                      value={localConfig.emailAdminAlertas || ""} 
                      onChange={(e) => setLocalConfig({...localConfig, emailAdminAlertas: e.target.value})} 
                      placeholder="admin@empresa.com" 
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-indigo-500 focus:bg-white transition-all shadow-inner" 
                    />
                    <p className="text-[8px] text-slate-400 mt-1.5 font-bold">Recibe los "Sin Asignar" y respuestas.</p>
                  </div>
                  <div>
                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Días Antigüedad SOLPEDs</label>
                    <div className="relative">
                      <input 
                        type="number" 
                        min="1" 
                        value={localConfig.diasUmbralSolped !== undefined ? localConfig.diasUmbralSolped : 10} 
                        onChange={(e) => setLocalConfig({...localConfig, diasUmbralSolped: Number(e.target.value)})} 
                        className="w-full pl-4 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black text-slate-700 outline-none focus:border-indigo-500 focus:bg-white transition-all shadow-inner" 
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[9px] font-black text-slate-400 uppercase">Días</span>
                    </div>
                    <p className="text-[8px] text-slate-400 mt-1.5 font-bold">Desde fecha de creación.</p>
                  </div>
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Umbral de Riesgo (Email)</label>
                      <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">{localConfig.umbralMailRiesgo !== undefined ? localConfig.umbralMailRiesgo : 15} d</span>
                    </div>
                    <input 
                      type="range" 
                      min="1" max="60" 
                      value={localConfig.umbralMailRiesgo !== undefined ? localConfig.umbralMailRiesgo : 15} 
                      onChange={(e) => setLocalConfig({...localConfig, umbralMailRiesgo: Number(e.target.value)})} 
                      className="w-full accent-indigo-500 h-2 bg-slate-100 rounded-lg appearance-none mt-2" 
                    />
                    <p className="text-[8px] text-slate-400 mt-2 font-bold">Independiente del radar de pantalla.</p>
                  </div>
                </div>

                <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Plantilla del Mensaje (Texto Plano)</label>
                  <textarea 
                    value={localConfig.plantillaMailAlertas !== undefined ? localConfig.plantillaMailAlertas : "COMPAÑERO: {operario},\n\nTenés {cantidad_items} materiales en zona crítica que requieren tu acción inmediata en la planta.\nPor favor, gestioná su S/P o reclamá la O/C hoy mismo:\n\n{listado_materiales}\n\nAccedé al ERP para iniciar las gestiones o cargar los hilos correspondientes.\nReporte emitido de forma automática por Almacén Predictivo."}
                    onChange={(e) => setLocalConfig({...localConfig, plantillaMailAlertas: e.target.value})}
                    className="w-full h-32 bg-slate-50 border border-slate-200 text-slate-700 text-xs font-mono rounded-xl px-4 py-3 outline-none focus:border-indigo-500 focus:bg-white transition-all resize-none shadow-inner"
                  />
                  <div className="flex gap-2 mt-2">
                    <span className="text-[9px] font-black bg-slate-100 text-slate-500 px-2 py-1 rounded border border-slate-200">{"{operario}"}</span>
                    <span className="text-[9px] font-black bg-slate-100 text-slate-500 px-2 py-1 rounded border border-slate-200">{"{cantidad_items}"}</span>
                    <span className="text-[9px] font-black bg-slate-100 text-slate-500 px-2 py-1 rounded border border-slate-200">{"{listado_materiales}"}</span>
                  </div>
                </div>

              </div>

            </motion.div>
          )}

          {/* PESTAÑA: FERIADOS */}
          {settingsTab === 'feriados' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-6 md:p-8 space-y-6 max-w-2xl mx-auto">
              <div className="bg-orange-50 border border-orange-200 text-orange-800 p-4 rounded-xl text-xs font-bold flex gap-3 shadow-sm mb-6">
                <Calendar className="shrink-0 text-orange-500" size={18} />
                <p>Cargá los feriados o días no laborables de la planta. El sistema los saltará al calcular la fecha exacta en la que ocurrirá un quiebre de stock.</p>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <form onSubmit={(e) => {
                  e.preventDefault();
                  if (!nuevoFeriado) return;
                  const fechaFormat = nuevoFeriado;
                  if (!(localConfig.feriados || []).includes(fechaFormat)) {
                    setLocalConfig({ ...localConfig, feriados: [...(localConfig.feriados || []), fechaFormat].sort() });
                  }
                  setNuevoFeriado("");
                }} className="flex gap-3 mb-6">
                  <input type="date" value={nuevoFeriado} onChange={(e) => setNuevoFeriado(e.target.value)} className="flex-1 bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-xl text-sm font-bold text-slate-700 outline-none focus:bg-white focus:border-orange-500 transition-all shadow-inner" />
                  <button type="submit" className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest shadow-lg shadow-orange-500/30 transition-all flex items-center gap-2"><Plus size={16} /> Sumar Día</button>
                </form>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {(localConfig.feriados || []).map((fecha) => {
                    const [y, m, d] = fecha.split('-');
                    return (
                      <div key={fecha} className="flex justify-between items-center bg-slate-50 border border-slate-200 px-4 py-3 rounded-xl group shadow-sm">
                        <span className="text-sm font-black text-slate-700 tracking-tight">{`${d}/${m}/${y}`}</span>
                        <button onClick={() => {
                          const nuevos = localConfig.feriados.filter(f => f !== fecha);
                          setLocalConfig({ ...localConfig, feriados: nuevos });
                        }} className="text-slate-300 hover:text-red-500 transition-colors p-1"><Trash2 size={14} /></button>
                      </div>
                    );
                  })}
                  {(localConfig.feriados || []).length === 0 && (
                    <div className="col-span-full text-center py-10 text-slate-400 text-xs font-bold uppercase tracking-widest border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                      No hay feriados cargados
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* PESTAÑA: BASE DE DATOS */}
          {settingsTab === 'bd' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-6 md:p-8 space-y-6 max-w-2xl mx-auto">
              <div className="bg-slate-900 text-white p-8 rounded-2xl shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-10"><Database size={100} /></div>
                <h3 className="text-xl font-black uppercase tracking-tight mb-2 relative z-10">Respaldo Local</h3>
                <p className="text-slate-400 text-xs font-bold mb-8 relative z-10 max-w-md leading-relaxed">Descargá una foto completa de Firebase (Insumos, Reclamos y Ajustes) a tu disco duro, o restaurá la plataforma desde un backup anterior.</p>
                <div className="flex flex-col sm:flex-row gap-4 relative z-10">
                  <div className="flex-1 bg-white/10 p-5 rounded-xl border border-white/20 backdrop-blur-sm">
                    <p className="text-[10px] font-black uppercase tracking-widest text-sky-400 mb-4">Exportación Segura</p>
                    <button onClick={onExportar} className="w-full bg-sky-500 hover:bg-sky-600 text-white font-black uppercase text-xs tracking-widest py-3 rounded-xl shadow-lg shadow-sky-500/30 transition-all flex justify-center gap-2 items-center"><Download size={16}/> Descargar JSON</button>
                  </div>
                  <div className="flex-1 bg-white/5 p-5 rounded-xl border border-white/10">
                    <p className="text-[10px] font-black uppercase tracking-widest text-rose-400 mb-2">Restauración Crítica</p>
                    <p className="text-[9px] text-slate-400 mb-4 leading-tight">⚠️ Esta acción va a sobreescribir la base de datos actual.</p>
                    <input type="file" accept=".json" ref={fileInputRef} onChange={onImportar} className="hidden" />
                    <button onClick={() => fileInputRef.current?.click()} className="w-full bg-rose-500 hover:bg-rose-600 text-white font-black uppercase text-xs tracking-widest py-3 rounded-xl shadow-lg shadow-rose-500/30 transition-all flex justify-center gap-2 items-center"><Upload size={16}/> Importar JSON</button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>
      
      {/* FOOTER MAGICO: EL BOTON DE GUARDAR */}
      <div className="p-5 bg-white border-t border-slate-100 flex justify-between items-center shrink-0">
        <p className="text-[10px] text-slate-400 font-mono tracking-widest uppercase">* Los cambios locales no aplican hasta confirmar.</p>
      
        <div className="flex gap-3">
          <button onClick={onClose} className="px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-widest text-slate-500 hover:bg-slate-100 transition-all">Cancelar</button>
          <button onClick={() => {
            onGuardar(localConfig);
            onClose(); 
          }} className="px-8 py-3 rounded-xl font-black text-xs uppercase tracking-widest bg-emerald-500 text-white hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/30 flex items-center gap-2"><Save size={16}/> Confirmar y Guardar</button>
        </div>
      </div>
    </motion.div>
  );
};

export default PanelAjustes;
