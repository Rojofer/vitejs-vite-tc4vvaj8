import React, { useState } from 'react';
import { Megaphone, Search, CheckSquare, Send, Info, Eye, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase'; // Importamos tu base de datos

const VistaMensajeria = ({ currentUser, config, reclamos, formatearFecha }) => {
  const [msjDestinos, setMsjDestinos] = useState([]); 
  const [msjAsunto, setMsjAsunto] = useState(""); 
  const [msjCuerpo, setMsjCuerpo] = useState(""); 
  const [msjTab, setMsjTab] = useState('redactar'); 
  const [filtroDifusion, setFiltroDifusion] = useState(""); 
  const [msjModal, setMsjModal] = useState(null);

  const toggleDestino = (id) => { 
    if (id === 'todos') { setMsjDestinos(['todos']); return; } 
    const list = msjDestinos.includes('todos') ? [] : [...msjDestinos]; 
    if(list.includes(id)) setMsjDestinos(list.filter(x=>x!==id)); 
    else setMsjDestinos([...list, id]); 
  };

  const enviarBroadcast = async () => {
    if(!msjAsunto || !msjCuerpo || msjDestinos.length === 0) return alert("Completar destino, asunto y cuerpo");
    const isTodos = msjDestinos.includes('todos'); 
    const dText = isTodos ? "TODO EL EQUIPO" : msjDestinos.map(id => (config.contactos || []).find(c=>c.id===id)?.label).join(", "); 
    const correos = isTodos ? (config.contactos || []).filter(c=>c.tipo==='equipo').map(c=>c.email).join(",") : msjDestinos.map(id => (config.contactos || []).find(c=>c.id===id)?.email).filter(e=>e).join(",");
    const difId = isTodos ? 'todos' : msjDestinos.join(",");
    
    // Guardamos el registro en Firebase
    await addDoc(collection(db, "reclamos"), { 
        insumoId: "BROADCAST", 
        operario: currentUser.nombre, 
        mensaje: `[COMUNICADO A ${dText}] ${msjAsunto}`, 
        cuerpoOriginal: msjCuerpo, 
        fecha: serverTimestamp(), 
        estado: "CERRADO", 
        tipo: 'equipo', 
        destinatarioId: difId, 
        leidoPor: [] 
    });
    
    // Abrimos el correo (CON EL CC CORREGIDO)
    window.open(`mailto:${correos}?cc=fernandocomex1@gmail.com&subject=${encodeURIComponent(msjAsunto)}&body=${encodeURIComponent(msjCuerpo)}`, '_blank'); 
    setMsjAsunto(""); setMsjCuerpo(""); setMsjDestinos([]);
  };

  const difusiones = reclamos.filter(r => r.insumoId === "BROADCAST" && r.mensaje.toLowerCase().includes(filtroDifusion.toLowerCase()));

  return (
    <div className="p-4 md:p-6 h-full w-full relative flex justify-center"><div className="w-full max-w-full"><div className="flex items-center gap-4 mb-6"><div className="w-12 h-12 bg-slate-800 rounded-2xl flex items-center justify-center shadow-lg"><Megaphone size={24} className="text-emerald-400" /></div><div><h1 className="text-2xl font-black uppercase text-slate-800 tracking-tight leading-none">Centro de Difusión</h1><p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Avisos a Planta</p></div></div>
    <div className="flex justify-between border-b border-slate-200 mb-6"><div className="flex gap-6"><button onClick={() => setMsjTab('redactar')} className={`pb-3 font-black text-xs uppercase tracking-widest transition-all border-b-2 ${msjTab === 'redactar' ? 'border-emerald-500 text-emerald-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>Redactar Aviso</button><button onClick={() => setMsjTab('historial')} className={`pb-3 font-black text-xs uppercase tracking-widest transition-all border-b-2 ${msjTab === 'historial' ? 'border-emerald-500 text-emerald-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>Registro de Enviados</button></div>{msjTab === 'historial' && (<div className="relative w-64 md:w-72 -mt-2"><Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16}/><input type="text" placeholder="Buscar difusiones..." value={filtroDifusion} onChange={e=>setFiltroDifusion(e.target.value)} className="w-full pl-12 pr-4 py-2.5 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-emerald-500 shadow-sm"/></div>)}</div>
    {msjTab === 'redactar' && (<div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200"><div className="mb-6"><label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Destinatarios</label><div className="flex flex-wrap gap-3"><label className={`flex items-center gap-2 px-4 py-2 rounded-xl border cursor-pointer transition-all ${msjDestinos.includes('todos') ? 'bg-emerald-50 border-emerald-500 text-emerald-800' : 'bg-slate-50 border-slate-200 hover:bg-slate-100'}`}><input type="checkbox" checked={msjDestinos.includes('todos')} onChange={()=>toggleDestino('todos')} className="hidden"/><div className={`w-4 h-4 rounded border flex items-center justify-center ${msjDestinos.includes('todos') ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300'}`}>{msjDestinos.includes('todos') && <CheckSquare size={12}/>}</div><span className="text-xs font-black uppercase">📣 Todos</span></label>{(config.contactos || []).filter(c=>c.tipo==='equipo').map(c=>(<label key={c.id} className={`flex items-center gap-2 px-4 py-2 rounded-xl border cursor-pointer transition-all ${msjDestinos.includes(c.id) && !msjDestinos.includes('todos') ? 'bg-emerald-50 border-emerald-500 text-emerald-800' : 'bg-slate-50 border-slate-200 hover:bg-slate-100'} ${msjDestinos.includes('todos') ? 'opacity-50 pointer-events-none' : ''}`}><input type="checkbox" checked={msjDestinos.includes(c.id) || msjDestinos.includes('todos')} onChange={()=>toggleDestino(c.id)} className="hidden" disabled={msjDestinos.includes('todos')}/><div className={`w-4 h-4 rounded border flex items-center justify-center ${(msjDestinos.includes(c.id) || msjDestinos.includes('todos')) ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300'}`}>{(msjDestinos.includes(c.id) || msjDestinos.includes('todos')) && <CheckSquare size={12}/>}</div><span className="text-xs font-bold">{c.label}</span></label>))}</div></div><div className="mb-5"><label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Asunto</label><input type="text" value={msjAsunto} onChange={e=>setMsjAsunto(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-emerald-500 transition-all" /></div><div className="mb-8"><label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Mensaje</label><textarea rows={6} value={msjCuerpo} onChange={e=>setMsjCuerpo(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-emerald-500 transition-all resize-none" /></div><button onClick={enviarBroadcast} className="w-full p-4 rounded-xl font-black text-xs uppercase tracking-widest bg-emerald-500 text-white flex items-center justify-center gap-2 shadow-lg hover:bg-emerald-600 transition-all active:scale-95"><Send size={18}/> Difundir Comunicado</button></div>)}
    {msjTab === 'historial' && (<div className="space-y-4">{difusiones.map(d => (<div key={d.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col"><div className="flex justify-between items-start mb-3"><p className="text-sm font-black text-slate-800 flex items-center gap-2 cursor-pointer hover:text-emerald-600" onClick={()=>setMsjModal(d)}><Info size={16} className="text-emerald-500"/> {d.mensaje}</p><p className="text-[10px] font-bold text-slate-400 uppercase">{formatearFecha(d.fecha)}</p></div><p className="text-xs font-mono text-slate-600 mb-4 bg-slate-50 p-3 rounded-lg border border-slate-100 line-clamp-2">{d.cuerpoOriginal}</p><div className="flex items-center gap-2 mt-auto border-t border-slate-100 pt-3"><Eye size={14} className="text-emerald-500"/><span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Leído por:</span><span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">{d.leidoPor && d.leidoPor.length > 0 ? d.leidoPor.join(', ') : 'Nadie aún'}</span></div></div>))}{difusiones.length === 0 && <p className="text-center text-slate-400 font-bold uppercase text-xs py-10">Sin comunicados enviados</p>}</div>)}
    <AnimatePresence>{msjModal && (<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4"><motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col"><div className="p-6 bg-slate-900 text-white flex justify-between items-center"><div className="flex items-center gap-3"><Megaphone size={18} className="text-emerald-400"/> <h3 className="font-black uppercase text-sm tracking-widest">Detalle del Comunicado</h3></div><button onClick={() => setMsjModal(null)} className="text-slate-400 hover:text-white transition-colors"><X/></button></div><div className="p-8 space-y-4 max-h-[70vh] overflow-auto bg-slate-50"><p className="font-black text-slate-800 text-lg border-b border-slate-200 pb-4">{msjModal.mensaje}</p><div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm text-xs font-mono whitespace-pre-wrap leading-relaxed text-slate-700">{msjModal.cuerpoOriginal}</div></div></motion.div></motion.div>)}</AnimatePresence>
  </div></div>
  );
};

export default VistaMensajeria;