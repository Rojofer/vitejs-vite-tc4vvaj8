import React, { useState, useRef, useEffect } from 'react';
import { Settings, Users, Activity, Mail, TrendingUp, Calendar, Database, X, Plus, Trash2, Download, Upload, Save, Star, Clock, Factory } from 'lucide-react';
import { motion } from 'framer-motion';

const PanelAjustes = ({ configInicial, onClose, onGuardar, onExportar, onImportar }) => {
  const [settingsTab, setSettingsTab] = useState('compras');
  const [localConfig, setLocalConfig] = useState(configInicial || {});
  const [nuevoFeriado, setNuevoFeriado] = useState("");
  const fileInputRef = useRef(null);

  // Sincronizamos si la config global cambia
  useEffect(() => {
    setLocalConfig(configInicial || {});
  }, [configInicial]);

  const getPlantillas = () => localConfig.plantillasDinamicas || [];

  return (
    <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} className="bg-white rounded-2xl shadow-2xl w-full max-w-7xl h-[90vh] overflow-hidden flex flex-col border border-slate-200">
      
      <div className="bg-slate-900 p-5 flex justify-between items-center border-b border-slate-800 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center shadow-inner"><Settings size={16} className="text-slate-400" /></div>
          <h3 className="text-white font-black uppercase tracking-widest text-sm">Configuración Global del ERP</h3>
        </div>
        <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors p-1 hover:bg-slate-800 rounded-full"><X size={20}/></button>
      </div>
      
      <div className="flex flex-1 overflow-hidden">
        {/* MENÚ LATERAL */}
        <div className="w-64 bg-slate-50 border-r border-slate-200 p-6 flex flex-col gap-2 shrink-0 overflow-y-auto shadow-inner">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 mt-2">Directorios</p>
          <button onClick={() => setSettingsTab('compras')} className={`w-full flex items-center gap-3 text-left px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${settingsTab === 'compras' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:bg-slate-200'}`}><Users size={16} /> Compras</button>
          <button onClick={() => setSettingsTab('planta')} className={`w-full flex items-center gap-3 text-left px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${settingsTab === 'planta' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:bg-slate-200'}`}><Factory size={16} /> Planta</button>
          <button onClick={() => setSettingsTab('equipo')} className={`w-full flex items-center gap-3 text-left px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${settingsTab === 'equipo' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:bg-slate-200'}`}><Activity size={16} /> Equipo</button>
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 mt-4">Comunicaciones</p>
          <button onClick={() => setSettingsTab('plantillas')} className={`w-full flex items-center gap-3 text-left px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${settingsTab === 'plantillas' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:bg-slate-200'}`}><Mail size={16} /> Textos Auto</button>
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 mt-4">Módulos</p>
          <button onClick={() => setSettingsTab('parametros')} className={`w-full flex items-center gap-3 text-left px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${settingsTab === 'parametros' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:bg-slate-200'}`}><TrendingUp size={16} /> Parámetros</button>
          <button onClick={() => setSettingsTab('feriados')} className={`w-full flex items-center gap-3 text-left px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${settingsTab === 'feriados' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:bg-slate-200'}`}><Calendar size={16} /> Feriados</button>
          <button onClick={() => setSettingsTab('backup')} className={`w-full flex items-center gap-3 text-left px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${settingsTab === 'backup' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:bg-slate-200'}`}><Database size={16} /> Base de Datos</button>
        </div>
        
        {/* ÁREA DE CONFIGURACIÓN */}
        <div className="flex-1 p-8 bg-white overflow-auto relative">
          
          {/* DIRECTORIO DE COMPRAS */}
          {settingsTab === 'compras' && (<motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}><h4 className="text-lg font-black text-slate-800 uppercase tracking-tight mb-6">Directorio de Compras (Externo)</h4><div className="space-y-3 mb-6">{(localConfig.contactos||[]).filter(c => c.tipo === 'compras').map(c => (<div key={c.id} className="flex gap-3 items-center group"><input type="text" value={c.label} onChange={(e) => { const newC = [...localConfig.contactos]; const i = newC.findIndex(x=>x.id===c.id); newC[i].label = e.target.value; setLocalConfig({...localConfig, contactos: newC});}} className="flex-1 px-4 py-3 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:ring-1 focus:ring-orange-500 transition-all bg-slate-50" placeholder="Nombre" /><input type="text" value={c.alias || ""} onChange={(e) => { const newC = [...localConfig.contactos]; const i = newC.findIndex(x=>x.id===c.id); newC[i].alias = e.target.value; setLocalConfig({...localConfig, contactos: newC});}} className="flex-1 px-4 py-3 border border-slate-200 rounded-xl text-xs font-black text-orange-600 outline-none focus:ring-1 focus:ring-orange-500 transition-all bg-orange-50/50" placeholder="Match en Sheets (Ej: JUAN)" title="Exactamente como se escribe en la columna Responsable" /><input type="email" value={c.email} onChange={(e) => { const newC = [...localConfig.contactos]; const i = newC.findIndex(x=>x.id===c.id); newC[i].email = e.target.value; setLocalConfig({...localConfig, contactos: newC});}} className="flex-[1.5] px-4 py-3 border border-slate-200 rounded-xl text-xs text-slate-600 outline-none focus:ring-1 focus:ring-orange-500 transition-all bg-slate-50" placeholder="Correo" /><select value={c.tipo} onChange={(e) => { const newC = [...localConfig.contactos]; const i = newC.findIndex(x=>x.id===c.id); newC[i].tipo = e.target.value; setLocalConfig({...localConfig, contactos: newC});}} className="flex-[0.8] px-4 py-3 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none bg-slate-50 cursor-pointer"><option value="compras">Rol: Compras</option><option value="equipo">Rol: Equipo</option><option value="planta">Rol: Planta</option></select><button onClick={() => {const nc = localConfig.contactos.filter(x=>x.id!==c.id); setLocalConfig({...localConfig, contactos: nc});}} className="w-10 h-10 flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"><Trash2 size={16} /></button></div>))}</div><button onClick={() => {setLocalConfig({...localConfig, contactos: [...(localConfig.contactos||[]), {id: Date.now(), label:"", email:"", tipo:"compras", alias:""}]});}} className="flex items-center gap-2 text-xs font-bold text-orange-500 uppercase hover:bg-orange-50 px-4 py-2.5 rounded-lg transition-all border border-transparent hover:border-orange-200"><Plus size={16}/> Agregar Contacto</button></motion.div>)}

          {/* DIRECTORIO DE PLANTA */}
          {settingsTab === 'planta' && (<motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}><h4 className="text-lg font-black text-slate-800 uppercase tracking-tight mb-6">Directorio de Planta (Destinatarios)</h4><div className="space-y-3 mb-6">{(localConfig.contactos||[]).filter(c => c.tipo === 'planta').map(c => (<div key={c.id} className="flex gap-3 items-center group"><input type="text" value={c.label} onChange={(e) => { const newC = [...localConfig.contactos]; const i = newC.findIndex(x=>x.id===c.id); newC[i].label = e.target.value; setLocalConfig({...localConfig, contactos: newC});}} className="flex-1 px-4 py-3 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:ring-1 focus:ring-emerald-500 transition-all bg-slate-50" placeholder="Nombre / Sector" /><input type="email" value={c.email} onChange={(e) => { const newC = [...localConfig.contactos]; const i = newC.findIndex(x=>x.id===c.id); newC[i].email = e.target.value; setLocalConfig({...localConfig, contactos: newC});}} className="flex-[1.5] px-4 py-3 border border-slate-200 rounded-xl text-xs text-slate-600 outline-none focus:ring-1 focus:ring-emerald-500 transition-all bg-slate-50" placeholder="Correo de contacto" /><button onClick={() => {const nc = localConfig.contactos.filter(x=>x.id!==c.id); setLocalConfig({...localConfig, contactos: nc});}} className="w-10 h-10 flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"><Trash2 size={16} /></button></div>))}</div><button onClick={() => {setLocalConfig({...localConfig, contactos: [...(localConfig.contactos||[]), {id: Date.now(), label:"", email:"", tipo:"planta"}]});}} className="flex items-center gap-2 text-xs font-bold text-emerald-600 uppercase hover:bg-emerald-50 px-4 py-2.5 rounded-lg transition-all border border-transparent hover:border-emerald-200"><Plus size={16}/> Agregar Contacto de Planta</button></motion.div>)}
          
          {/* EQUIPO INTERNO */}
          {settingsTab === 'equipo' && (<motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}><h4 className="text-lg font-black text-slate-800 uppercase tracking-tight mb-6">Miembros del Equipo</h4><div className="space-y-4 mb-6">{(localConfig.contactos||[]).filter(c => c.tipo === 'equipo').map(c => (<div key={c.id} className="flex flex-col gap-2 p-4 bg-slate-50 border border-slate-200 rounded-2xl group relative shadow-sm">
            <div className="flex gap-3 items-center">
              <input type="text" value={c.label} onChange={(e) => { const newC = [...localConfig.contactos]; const i = newC.findIndex(x=>x.id===c.id); newC[i].label = e.target.value; setLocalConfig({...localConfig, contactos: newC});}} className="flex-[0.8] px-4 py-3 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:ring-1 focus:ring-purple-500 transition-all bg-white" placeholder="Nombre" />
              <input type="text" value={c.alias || ""} onChange={(e) => { const newC = [...localConfig.contactos]; const i = newC.findIndex(x=>x.id===c.id); newC[i].alias = e.target.value; setLocalConfig({...localConfig, contactos: newC});}} className="flex-[0.8] px-4 py-3 border border-slate-200 rounded-xl text-xs font-black text-purple-600 outline-none focus:ring-1 focus:ring-purple-500 transition-all bg-purple-50/50" placeholder="Match en Sheets" />
              <input type="email" value={c.email} onChange={(e) => { const newC = [...localConfig.contactos]; const i = newC.findIndex(x=>x.id===c.id); newC[i].email = e.target.value; setLocalConfig({...localConfig, contactos: newC});}} className="flex-[1.5] px-4 py-3 border border-slate-200 rounded-xl text-xs text-slate-600 outline-none focus:ring-1 focus:ring-purple-500 transition-all bg-white" placeholder="Correo" />
            </div>
            <div className="flex items-center justify-between border-t border-slate-200 pt-3 mt-1">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Color:</span>
                    <div className="flex gap-1.5">
                      {['emerald', 'purple', 'blue', 'pink', 'amber', 'indigo'].map(color => (
                        <button key={color} onClick={() => { const newC = [...localConfig.contactos]; const i = newC.findIndex(x=>x.id===c.id); newC[i].color = color; setLocalConfig({...localConfig, contactos: newC}); }} className={`w-5 h-5 rounded-full transition-all border-2 ${c.color === color || (!c.color && color === 'emerald') ? 'border-slate-800 scale-125 shadow-md' : 'border-transparent hover:scale-110 opacity-50'} ${color==='emerald'?'bg-emerald-500':color==='purple'?'bg-purple-500':color==='blue'?'bg-blue-500':color==='pink'?'bg-pink-500':color==='amber'?'bg-amber-500':'bg-indigo-500'}`} title={`Color ${color}`}></button>
                      ))}
                    </div>
                  </div>
                  <div className="h-4 w-px bg-slate-200 mx-1"></div>
                  <label className={`flex items-center gap-1.5 cursor-pointer transition-colors ${c.editorFavoritos ? 'text-orange-500' : 'text-slate-400 hover:text-slate-600'}`}>
                    <input type="checkbox" checked={c.editorFavoritos || false} onChange={(e) => { const newC = [...localConfig.contactos]; const i = newC.findIndex(x=>x.id===c.id); newC[i].editorFavoritos = e.target.checked; setLocalConfig({...localConfig, contactos: newC}); }} className="hidden" />
                    <Star size={14} fill={c.editorFavoritos ? "currentColor" : "none"} />
                    <span className="text-[9px] font-black uppercase tracking-widest">Editor Favs</span>
                  </label>
                </div>
                <button onClick={() => {const nc = localConfig.contactos.filter(x=>x.id!==c.id); setLocalConfig({...localConfig, contactos: nc});}} className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-red-500 transition-all"><Trash2 size={14} /> Eliminar</button>
              </div>
          </div>))}</div><button onClick={() => {setLocalConfig({...localConfig, contactos: [...(localConfig.contactos||[]), {id: Date.now(), label:"", email:"", tipo:"equipo", alias:"", color:"emerald"}]});}} className="flex items-center gap-2 text-xs font-bold text-purple-600 uppercase hover:bg-purple-50 px-4 py-2.5 rounded-lg transition-all border border-transparent hover:border-purple-200"><Plus size={16}/> Agregar Miembro</button></motion.div>)}
          
          {/* PLANTILLAS DINÁMICAS */}
          {settingsTab === 'plantillas' && (
            <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}>
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h4 className="text-lg font-black text-slate-800 uppercase tracking-tight">Plantillas Dinámicas</h4>
                  <p className="text-[10px] text-slate-500 font-bold uppercase mt-1">Crea formatos ilimitados para diferentes situaciones</p>
                </div>
                <button onClick={() => {
                  const idNuevo = 'plantilla_' + Date.now();
                  const current = getPlantillas();
                  setLocalConfig({ ...localConfig, plantillasDinamicas: [...current, { id: idNuevo, nombre: "Nueva Plantilla", destino: "compras", isNormal: false, isUrgente: false, isSolped: false, asunto: "", cuerpo: "" }] });
                }} className="flex items-center gap-2 text-xs font-bold text-orange-500 uppercase hover:bg-orange-50 px-4 py-2.5 rounded-lg transition-all border border-transparent hover:border-orange-200"><Plus size={16}/> Nueva Plantilla</button>
              </div>
              
              <div className="space-y-6">
                {getPlantillas().map(p => (
                  <div key={p.id} className="bg-slate-50 p-6 rounded-2xl border border-slate-200 relative group transition-all hover:border-slate-300 hover:shadow-sm">
                    <div className="flex gap-4 mb-5">
                      <div className="flex-[2]">
                        <label className="block text-[9px] font-bold text-slate-500 mb-1.5 uppercase tracking-widest">Nombre (Visible en Menú)</label>
                        <input type="text" value={p.nombre} onChange={(e) => {
                          const nuevas = getPlantillas().map(x => x.id === p.id ? { ...x, nombre: e.target.value } : x);
                          setLocalConfig({ ...localConfig, plantillasDinamicas: nuevas });
                        }} className="w-full p-2.5 text-xs font-black text-slate-700 border border-slate-200 rounded-lg outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 bg-white transition-all" />
                      </div>
                      <div className="flex-1">
                        <label className="block text-[9px] font-bold text-slate-500 mb-1.5 uppercase tracking-widest">Público Destino</label>
                        <select value={p.destino} onChange={(e) => {
                          const nuevas = getPlantillas().map(x => x.id === p.id ? { ...x, destino: e.target.value } : x);
                          setLocalConfig({ ...localConfig, plantillasDinamicas: nuevas });
                        }} className="w-full p-2.5 text-xs font-bold text-slate-700 border border-slate-200 rounded-lg outline-none focus:border-orange-500 bg-white cursor-pointer transition-all">
                          <option value="compras">Directorio Compras</option>
                          <option value="equipo">Directorio Planta</option>
                          <option value="planta">Directorio Planta (Destinatarios)</option>
                        </select>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-4 mb-5">
                       <label className={`flex items-center gap-2 px-3 py-1.5 rounded-md border cursor-pointer transition-colors ${p.isNormal ? 'bg-sky-100 border-sky-300 text-sky-700' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-100'}`}>
                         <input type="checkbox" checked={p.isNormal} onChange={() => {
                           const nuevas = getPlantillas().map(x => { if (x.id === p.id) return { ...x, isNormal: true }; return { ...x, isNormal: false }; });
                           setLocalConfig({ ...localConfig, plantillasDinamicas: nuevas });
                         }} className="hidden" />
                         <div className={`w-3 h-3 rounded-full border flex items-center justify-center ${p.isNormal ? 'border-sky-500 bg-sky-500' : 'border-slate-300'}`}></div>
                         <span className="text-[10px] font-black uppercase tracking-widest">Seguimiento Normal</span>
                       </label>
                       
                       <label className={`flex items-center gap-2 px-3 py-1.5 rounded-md border cursor-pointer transition-colors ${p.isUrgente ? 'bg-orange-100 border-orange-300 text-orange-700' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-100'}`}>
                         <input type="checkbox" checked={p.isUrgente} onChange={() => {
                           const nuevas = getPlantillas().map(x => { if (x.id === p.id) return { ...x, isUrgente: true }; return { ...x, isUrgente: false }; });
                           setLocalConfig({ ...localConfig, plantillasDinamicas: nuevas });
                         }} className="hidden" />
                         <div className={`w-3 h-3 rounded-full border flex items-center justify-center ${p.isUrgente ? 'border-orange-500 bg-orange-500' : 'border-slate-300'}`}></div>
                         <span className="text-[10px] font-black uppercase tracking-widest">Reclamos Críticos</span>
                       </label>
                    </div>

                    <div className="mb-3">
                      <label className="block text-[9px] font-bold text-slate-500 mb-1.5 uppercase tracking-widest">Asunto del Correo</label>
                      <input type="text" value={p.asunto} onChange={(e) => {
                        const nuevas = getPlantillas().map(x => x.id === p.id ? { ...x, asunto: e.target.value } : x);
                        setLocalConfig({ ...localConfig, plantillasDinamicas: nuevas });
                      }} className="w-full p-2.5 text-xs font-bold border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-slate-200 bg-white" />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-slate-500 mb-1.5 uppercase tracking-widest">Cuerpo del Correo</label>
                      <textarea rows={4} value={p.cuerpo} onChange={(e) => {
                        const nuevas = getPlantillas().map(x => x.id === p.id ? { ...x, cuerpo: e.target.value } : x);
                        setLocalConfig({ ...localConfig, plantillasDinamicas: nuevas });
                      }} className="w-full p-4 text-xs font-mono text-slate-700 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-slate-200 bg-white resize-none" />
                    </div>

                    <button onClick={() => {
                      if(window.confirm(`¿Seguro que querés eliminar la plantilla "${p.nombre}"?`)) {
                        const nuevas = getPlantillas().filter(x => x.id !== p.id);
                        setLocalConfig({ ...localConfig, plantillasDinamicas: nuevas });
                      }
                    }} className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100" title="Eliminar Plantilla">
                      <Trash2 size={16} />
                    </button>

                  </div>
                ))}
              </div>
            </motion.div>
          )}
          
          {/* PARÁMETROS: UMBRALES DE RIESGO */}
          {settingsTab === 'parametros' && (
            <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}>
              <h4 className="text-lg font-black text-slate-800 uppercase tracking-tight mb-2">Parámetros del Sistema</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                
                <div className="bg-red-50 border border-red-200 p-6 rounded-2xl shadow-sm">
                  <div className="flex justify-between items-center mb-6">
                    <div>
                      <h5 className="font-black text-red-800 text-sm uppercase">Alerta Roja (Quiebre)</h5>
                      <p className="text-[9px] font-bold text-red-500 uppercase mt-1">Días de supervivencia</p>
                    </div>
                    <div className="bg-red-100 text-red-600 px-3 py-1.5 rounded-xl font-black text-2xl border border-red-200">
                      {localConfig.umbralCritico !== undefined ? localConfig.umbralCritico : 0}
                    </div>
                  </div>
                  <input type="range" min="0" max="10" value={localConfig.umbralCritico !== undefined ? localConfig.umbralCritico : 0} onChange={(e) => { setLocalConfig({ ...localConfig, umbralCritico: Number(e.target.value) }); }} className="w-full accent-red-500 cursor-pointer h-2 bg-red-200 rounded-lg appearance-none" />
                </div>

                <div className="bg-orange-50 border border-orange-200 p-6 rounded-2xl shadow-sm">
                  <div className="flex justify-between items-center mb-6">
                    <div>
                      <h5 className="font-black text-orange-800 text-sm uppercase">Robot Limpiador & Riesgo</h5>
                      <p className="text-[9px] font-bold text-orange-500 uppercase mt-1">Días de stock para Auto-Cierre</p>
                    </div>
                    <div className="bg-orange-100 text-orange-600 px-3 py-1.5 rounded-xl font-black text-2xl border border-orange-200">
                      {localConfig.umbralUrgencia !== undefined ? localConfig.umbralUrgencia : 20}
                    </div>
                  </div>
                  <input type="range" min="1" max="60" value={localConfig.umbralUrgencia !== undefined ? localConfig.umbralUrgencia : 20} onChange={(e) => { setLocalConfig({ ...localConfig, umbralUrgencia: Number(e.target.value) }); }} className="w-full accent-orange-500 cursor-pointer h-2 bg-orange-200 rounded-lg appearance-none" />
                </div>
               
                {/* NUEVO MÓDULO: MODO DE CIERRE DE RECLAMOS */}
                <div className="bg-purple-50 border border-purple-200 p-6 rounded-2xl shadow-sm md:col-span-2 mt-2">
                  <div className="flex justify-between items-center mb-6">
                    <div>
                      <h5 className="font-black text-purple-800 text-sm uppercase">Modo de Cierre de Reclamos</h5>
                      <p className="text-[9px] font-bold text-purple-500 uppercase mt-1">¿Cómo finalizan los reclamos a proveedores?</p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <button 
                      onClick={() => setLocalConfig({ ...localConfig, modoCierreReclamos: 'manual' })}
                      className={`flex-1 p-4 rounded-xl border-2 transition-all flex flex-col items-center justify-center gap-2 ${(!localConfig.modoCierreReclamos || localConfig.modoCierreReclamos === 'manual') ? 'bg-white border-purple-500 shadow-md text-purple-700' : 'bg-purple-100/50 border-transparent text-purple-400 hover:bg-white'}`}
                    >
                      <span className="font-black uppercase text-xs tracking-widest">Cierre Manual (Preventivo)</span>
                      <span className="text-[9px] font-bold text-center px-4">El operario debe cerrarlo a mano confirmando el ingreso físico o estratégico.</span>
                    </button>
                    
                    <button 
                      onClick={() => setLocalConfig({ ...localConfig, modoCierreReclamos: 'auto' })}
                      className={`flex-1 p-4 rounded-xl border-2 transition-all flex flex-col items-center justify-center gap-2 ${localConfig.modoCierreReclamos === 'auto' ? 'bg-white border-purple-500 shadow-md text-purple-700' : 'bg-purple-100/50 border-transparent text-purple-400 hover:bg-white'}`}
                    >
                      <span className="font-black uppercase text-xs tracking-widest">Cierre Automático</span>
                      <span className="text-[9px] font-bold text-center px-4">El sistema lo cierra solo al detectar un salto de stock (cobertura segura).</span>
                    </button>
                  </div>
                </div>
                
              </div>
            </motion.div>
          )}

          {settingsTab === 'feriados' && (<motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}><h4 className="text-lg font-black text-slate-800 uppercase tracking-tight mb-2">Gestor de Feriados</h4><div className="flex items-center gap-4 mb-6 bg-white p-4 rounded-xl border border-slate-200 shadow-sm"><input type="date" value={nuevoFeriado} onChange={(e) => setNuevoFeriado(e.target.value)} className="p-2 border border-slate-300 rounded-lg text-sm outline-none" /><button onClick={() => {if(!nuevoFeriado) return; setLocalConfig({ ...localConfig, feriados: [...(localConfig.feriados || []), nuevoFeriado].sort() }); setNuevoFeriado("");}} className="px-4 py-2 bg-slate-800 text-white rounded-lg text-xs font-black uppercase flex items-center gap-2 hover:bg-slate-700"><Plus size={16}/> Cargar Feriado</button></div><div className="grid grid-cols-4 gap-4">{(localConfig.feriados||[]).map((f, idx) => { const fecha = new Date(f + "T12:00:00"); return (<div key={idx} className="bg-slate-50 border border-slate-200 p-3 rounded-xl flex justify-between items-center"><div><p className="text-[10px] font-black text-slate-400 uppercase">Feriado</p><p className="text-sm font-bold text-slate-800">{fecha.toLocaleDateString('es-AR')}</p></div><button onClick={() => { setLocalConfig({ ...localConfig, feriados: (localConfig.feriados || []).filter(x => x !== f) }); }} className="text-slate-300 hover:text-red-500"><Trash2 size={16}/></button></div>);})}</div></motion.div>)}
          
          {settingsTab === 'backup' && (<motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}><h4 className="text-lg font-black text-slate-800 uppercase tracking-tight mb-2">Respaldo y Restauración</h4><div className="grid grid-cols-2 gap-8 mt-8"><div className="bg-sky-50 border border-sky-200 p-6 rounded-2xl flex flex-col items-center text-center"><Download size={40} className="text-sky-500 mb-4"/><h5 className="font-black text-sky-800 uppercase mb-2">Generar Backup</h5><p className="text-xs text-sky-600 mb-6">Descarga una copia exacta de toda la información al día de hoy.</p><button onClick={onExportar} className="w-full bg-sky-500 hover:bg-sky-600 text-white font-black uppercase text-xs tracking-widest py-3 rounded-xl shadow-lg transition-all flex justify-center gap-2 items-center"><Download size={16}/> Exportar JSON</button></div><div className="bg-rose-50 border border-rose-200 p-6 rounded-2xl flex flex-col items-center text-center"><Upload size={40} className="text-rose-500 mb-4"/><h5 className="font-black text-rose-800 uppercase mb-2">Restaurar Sistema</h5><p className="text-xs text-rose-600 mb-6">Carga un archivo JSON previo para sobreescribir la base de datos actual.</p><input type="file" accept=".json" ref={fileInputRef} onChange={onImportar} className="hidden"/><button onClick={()=>fileInputRef.current?.click()} className="w-full bg-rose-500 hover:bg-rose-600 text-white font-black uppercase text-xs tracking-widest py-3 rounded-xl shadow-lg transition-all flex justify-center gap-2 items-center"><Upload size={16}/> Importar JSON</button></div></div></motion.div>)}
        </div>
      </div>
      
      {/* FOOTER MAGICO: EL BOTON DE GUARDAR */}
      <div className="p-5 bg-white border-t border-slate-100 flex justify-between items-center shrink-0">
        <p className="text-[10px] text-slate-400 font-mono tracking-widest uppercase">* Los cambios locales no aplican hasta confirmar.</p>
        <div className="flex gap-3">
          <button onClick={onClose} className="px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-widest text-slate-500 hover:bg-slate-100 transition-all">Cancelar</button>
          <button onClick={() => {
            onGuardar(localConfig);
            onClose(); // Cerramos el panel automáticamente al guardar
          }} className="px-8 py-3 rounded-xl font-black text-xs uppercase tracking-widest bg-emerald-500 text-white hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/30 flex items-center gap-2">
            <Save size={16}/> Guardar Cambios
          </button>
        </div>
      </div>

    </motion.div>
  );
};

export default PanelAjustes;
