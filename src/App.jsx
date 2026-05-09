import React, { useState, useEffect, useMemo, useRef } from 'react';
import { db } from './firebase';
import TablaInsumos from './componentes/TablaInsumos';
import VistaProduccion from './vistas/VistaProduccion';
import VistaAuditoria from './vistas/VistaAuditoria';
import VistaMensajeria from './vistas/VistaMensajeria';
import VistaNotificaciones from './vistas/VistaNotificaciones';
import PanelAjustes from './componentes/PanelAjustes';
import PanelDetalle from './componentes/PanelDetalle';
import ModalRedactor from './componentes/ModalRedactor';
import VistaGestion from './vistas/VistaGestion';
import VistaLogin from './vistas/VistaLogin';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from './firebase';

import { collection, onSnapshot, query, addDoc, serverTimestamp, orderBy, doc, updateDoc, setDoc } from 'firebase/firestore';
import { 
  LayoutDashboard, Mail, Settings, Search, AlertTriangle, Folder, ArrowLeft, X, ChevronRight, CheckCircle, Clock, 
  Users, Send, Activity, History, TrendingUp, Calendar, Trash2, Plus, Megaphone, CheckSquare, Filter, Copy, Info, 
  Bell, Eye, EyeOff, FileSpreadsheet, Download, Upload, ArrowUpDown, Database, Star, Package, CornerDownRight, AlertCircle, FileText, StarOff 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const formatearFecha = (fecha) => {
  if (!fecha || fecha === "-") return "-";
  try {
    let f = (fecha && typeof fecha.toDate === 'function') ? fecha.toDate() : (fecha && fecha.seconds ? new Date(fecha.seconds * 1000) : new Date(fecha));
    if (isNaN(f.getTime())) return String(fecha);
    const dia = String(f.getDate()).padStart(2, '0'); const mes = String(f.getMonth() + 1).padStart(2, '0'); const anio = String(f.getFullYear()).slice(-2);
    return `${dia}/${mes}/${anio} ${String(f.getHours()).padStart(2, '0')}:${String(f.getMinutes()).padStart(2, '0')}`;
  } catch (e) { return String(fecha); }
};

const obtenerMesAnio = (fecha) => {
  if (!fecha) return "Sin Fecha";
  try {
    let f = (fecha && typeof fecha.toDate === 'function') ? fecha.toDate() : (fecha && fecha.seconds ? new Date(fecha.seconds * 1000) : new Date(fecha));
    if (isNaN(f.getTime())) return "Sin Fecha";
    const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    return `${meses[f.getMonth()]} ${f.getFullYear()}`;
  } catch (e) { return "Sin Fecha"; }
};

const formatoNum = (num) => Number(num).toLocaleString('es-AR');

const App = () => {
  const [usuarioLogueado, setUsuarioLogueado] = useState(null);
  const [cargandoAuth, setCargandoAuth] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (usuario) => {
      setUsuarioLogueado(usuario);
      setCargandoAuth(false);
    });
    return () => unsubscribe();
  }, []);
  
  const [insumosRaw, setInsumosRaw] = useState([]);
  const [reclamosRaw, setReclamosRaw] = useState([]);
  const [loading, setLoading] = useState(true);
  const [ultimaAct, setUltimaAct] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [activeInsumo, setActiveInsumo] = useState(null);
  const [filtroAlerta, setFiltroAlerta] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [vistaActiva, setVistaActiva] = useState('gestion'); 
  const [notiTabActiva, setNotiTabActiva] = useState('avisos');
  const [auditoriaFiltroInsumo, setAuditoriaFiltroInsumo] = useState(null);
  const [reclamoDraft, setReclamoDraft] = useState(null); 
  const [toastMsg, setToastMsg] = useState(null);
  const [alertaHilo, setAlertaHilo] = useState(null);
  const [filtroResponsable, setFiltroResponsable] = useState("TODOS"); 
  const [filtroRiesgoGrupo, setFiltroRiesgoGrupo] = useState(false);
  const [filtroVistaLista, setFiltroVistaLista] = useState('todos');

  const obtenerColorOwner = (ownerString) => {
    if (!ownerString || ownerString === "Sin asignar" || ownerString === "SIN ASIGNAR") return { bg: 'bg-slate-50', text: 'text-slate-400', border: 'border-slate-200', dot: 'bg-slate-300' };
    const txt = String(ownerString).trim().toUpperCase();
    const contacto = (config?.contactos || []).find(c => c.alias && String(c.alias).trim().toUpperCase() === txt);
    if (contacto && contacto.color) {
      const paleta = [
          { id: 'emerald', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500' },
          { id: 'purple', bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', dot: 'bg-purple-500' },
          { id: 'blue', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', dot: 'bg-blue-500' },
          { id: 'pink', bg: 'bg-pink-50', text: 'text-pink-700', border: 'border-pink-200', dot: 'bg-pink-500' },
          { id: 'amber', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', dot: 'bg-amber-500' },
          { id: 'indigo', bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200', dot: 'bg-indigo-500' }
      ];
      return paleta.find(p => p.id === contacto.color) || { bg: 'bg-slate-50', text: 'text-slate-600', border: 'border-slate-200', dot: 'bg-slate-400' };
    }
    return { bg: 'bg-slate-50', text: 'text-slate-600', border: 'border-slate-200', dot: 'bg-slate-400' };
  };

  useEffect(() => {
    setFiltroResponsable('TODOS');
  }, [filtroAlerta, selectedGroup, searchTerm]);

  const renderRadarDinamico = (datosDeLaLista) => {
    if (currentUser.rol !== 'owner') return null;
    const ownersUnicos = [...new Set(datosDeLaLista.map(i => i.owner?.toUpperCase().trim() || 'SIN ASIGNAR'))].filter(o => o !== 'SIN ASIGNAR');
    if (ownersUnicos.length === 0) return null;

    return (
      <div className="flex items-center gap-2 bg-white p-1.5 rounded-xl border border-slate-200 shadow-sm overflow-x-auto w-max max-w-full">
        <button onClick={() => setFiltroResponsable('TODOS')} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${filtroResponsable === 'TODOS' ? 'bg-slate-800 text-white shadow-md' : 'text-slate-500 hover:bg-slate-100'}`}>Visión Global</button>
        {ownersUnicos.map(ownerAlias => {
          const contacto = (config.contactos || []).find(c => c.alias && c.alias.trim().toUpperCase() === ownerAlias);
          const col = contacto?.color || 'slate';
          const bgActive = col==='emerald'?'bg-emerald-500':col==='purple'?'bg-purple-500':col==='blue'?'bg-blue-500':col==='pink'?'bg-pink-500':col==='amber'?'bg-amber-500':col==='indigo'?'bg-indigo-500':'bg-slate-500';
          const isAct = filtroResponsable === ownerAlias;
          return (
            <button key={ownerAlias} onClick={() => setFiltroResponsable(ownerAlias)} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap flex items-center gap-1.5 ${isAct ? `${bgActive} text-white shadow-md` : 'bg-transparent text-slate-500 hover:bg-slate-100'}`}>
              {!isAct && <span className={`w-2 h-2 rounded-full ${bgActive}`}></span>}
              {ownerAlias}
            </button>
          );
        })}
      </div>
    );
  };
  
  const [config, setConfig] = useState({ contactos: [], feriados: [], asuntos: { equipo: "ALERTA: {nombre}", comprasLeve: "SEGUIMIENTO: {nombre}", comprasGrave: "URGENTE: {nombre}" }, plantillas: { equipo: "", comprasLeve: "", comprasGrave: "" } });

  // 1. CEREBRO DE USUARIOS CON "MODO DIOS" PARA EL OWNER
  const realUser = useMemo(() => {
    if (!usuarioLogueado) return { id: 'invitado', nombre: "Cargando...", rol: "espectador", inicial: "-", aliasMatch: "NINGUNO", editorFavoritos: false };
    const emailLogueado = usuarioLogueado.email.toLowerCase();

    if (emailLogueado === 'fachaval@devesa.com' || emailLogueado === 'fernandocomex1@gmail.com') {
      return { id: 'owner_real', email: emailLogueado, nombre: emailLogueado === 'fachaval@devesa.com' ? "Fernando (Dueño)" : "Fer (Tester)", rol: "owner", inicial: "F", aliasMatch: "TODOS", editorFavoritos: true };
    }
    
    if (emailLogueado === 'tv@devesa.com') return { id: 'tv', email: emailLogueado, nombre: "Monitor TV", rol: "produccion", inicial: "TV", aliasMatch: "TV", editorFavoritos: false };
    
    const operarioMatch = (config?.contactos || []).filter(c => c.tipo === 'equipo').find(c => c.email && c.email.toLowerCase() === emailLogueado);
    if (operarioMatch) return { id: operarioMatch.id, email: emailLogueado, nombre: operarioMatch.label || operarioMatch.email, rol: "operario", inicial: (operarioMatch.label || operarioMatch.email || "O").charAt(0).toUpperCase(), aliasMatch: (operarioMatch.alias || "").trim().toUpperCase(), editorFavoritos: operarioMatch.editorFavoritos === true };
    
    return { id: usuarioLogueado.uid, email: emailLogueado, nombre: "Sin Permisos", rol: "espectador", inicial: "X", aliasMatch: "NINGUNO", editorFavoritos: false };
  }, [usuarioLogueado, config]);

  const perfilesSimulables = useMemo(() => {
    const base = [
      { id: 'owner_real', nombre: "Dueño VIP", rol: "owner", inicial: "👑", aliasMatch: "TODOS", editorFavoritos: true },
      { id: 'tv', nombre: "Planta TV", rol: "produccion", inicial: "📺", aliasMatch: "TV", editorFavoritos: false }
    ];
    const extras = (config?.contactos || []).filter(c => c.tipo === 'equipo').map((c) => ({
      id: c.id, nombre: (c.alias || c.label || 'Operario').toUpperCase(), rol: "operario", inicial: "👁️", aliasMatch: (c.alias || "").trim().toUpperCase(), editorFavoritos: c.editorFavoritos === true
    }));
    return [...base, ...extras];
  }, [config]);

  const [simulatedId, setSimulatedId] = useState('owner_real');

  const currentUser = useMemo(() => {
    if (realUser.rol !== 'owner') return realUser; 
    const simulado = perfilesSimulables.find(p => p.id === simulatedId);
    return simulado || realUser;
  }, [realUser, simulatedId, perfilesSimulables]);

  const [showWelcome, setShowWelcome] = useState(true);
  
  useEffect(() => { 
    if (currentUser.rol === 'produccion') {
      setShowWelcome(false);
      if (vistaActiva !== 'cartelera' && vistaActiva !== 'planta') setVistaActiva('planta'); 
    } 
  }, [currentUser]);

  useEffect(() => {
    const unsubConfig = onSnapshot(doc(db, "config", "general"), (docSnap) => { if (docSnap.exists()) setConfig(docSnap.data()); else setDoc(doc(db, "config", "general"), config); });
    return () => unsubConfig();
  }, []);

  useEffect(() => {
    const q = query(collection(db, "insumos"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      let maxTime = 0; const hoy = new Date();
      const data = snapshot.docs.map(doc => {
        const d = doc.data(); const up = d.fecha_actualizacion || d.timestamp || d.updatedAt;
        if (up) { const t = up.seconds ? up.seconds * 1000 : new Date(up).getTime(); if (t > maxTime && !isNaN(t)) maxTime = t; }
        const stock = Number(d.stockActual) || 0; const consumoMes = Number(d.consumoPromedio) || 0; const consumoDiario = consumoMes > 0 ? (consumoMes / 26) : 0; const sp = Number(d.solpeds) || 0;
        let ocFuturaTotal = 0; let ocDemoradaTotal = 0;
        d.detalleOCs?.forEach(oc => { 
          const f = oc.fecha?.seconds ? new Date(oc.fecha.seconds * 1000) : new Date(oc.fecha); 
          const fCheck = new Date(f); fCheck.setHours(0,0,0,0); const hoyCheck = new Date(); hoyCheck.setHours(0,0,0,0);
          if (fCheck < hoyCheck) ocDemoradaTotal += Number(oc.cantidad) || 0; else ocFuturaTotal += Number(oc.cantidad) || 0; 
        });
        const supervivencia = consumoDiario > 0 ? (stock / consumoDiario) : 999; const coberturaReal = consumoDiario > 0 ? ((stock + ocFuturaTotal + sp) / consumoDiario) : 999;
        return { id: doc.id, ...d, stock, ocDemorada: ocDemoradaTotal, ocFutura: ocFuturaTotal, sp, consumo: consumoMes, supervivencia: supervivencia > 998 ? 999 : supervivencia, cobertura: coberturaReal > 998 ? 999 : coberturaReal, favorito: d.esFavorito || false, owner: d.owner || "Sin asignar", visibleEnPlanta: d.visibleEnPlanta === true };
      });
      setInsumosRaw(data); if (maxTime > 0) setUltimaAct(new Date(maxTime)); setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const q = query(collection(db, "reclamos"), orderBy("fecha", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => { setReclamosRaw(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))); });
    return () => unsubscribe();
  }, []);

  const reclamos = useMemo(() => {
    const asc = [...reclamosRaw].sort((a, b) => (a.fecha?.seconds || 0) - (b.fecha?.seconds || 0)); const counts = {};
    const procesados = asc.map(r => { if(r.insumoId !== "BROADCAST") counts[r.insumoId] = (counts[r.insumoId] || 0) + 1; return { ...r, iteracion: counts[r.insumoId] || 0 }; });
    return procesados.reverse();
  }, [reclamosRaw]);

  const insumos = useMemo(() => {
    return insumosRaw.map(i => ({ ...i, escalados: reclamos.filter(r => r.insumoId === i.id && r.estado === 'ABIERTO' && r.tipo !== 'equipo').length })).sort((a, b) => a.supervivencia - b.supervivencia);
  }, [insumosRaw, reclamos]);

  useEffect(() => {
    if (activeInsumo) { const insumoActualizado = insumos.find(i => i.id === activeInsumo.id); if (insumoActualizado && (insumoActualizado.stock !== activeInsumo.stock || insumoActualizado.ocDemorada !== activeInsumo.ocDemorada)) { setActiveInsumo(insumoActualizado); } }
  }, [insumos]);

  // --- ROBOT HÍBRIDO CON ESCUDO TÁCTICO (SIMBIOSIS PERFECTA) ---
  useEffect(() => {
    if (insumos.length === 0 || reclamos.length === 0) return;
    
    const ejecutarAutoLimpieza = async () => {
      const reclamosAbiertos = reclamos.filter(r => r.estado === 'ABIERTO' && r.insumoId !== 'BROADCAST');
      let alertasSugeridas = [];
      // Toma los días del panel de Ajustes (o usa 20 por defecto)
      const umbral = config?.umbralUrgencia || 20; 

      for (const r of reclamosAbiertos) { 
        const insumo = insumos.find(i => i.id === r.insumoId); 
        if (insumo) {
          // REGLA 1: Calculamos la edad del reclamo en horas para el Escudo
          const tiempoReclamo = r.fecha?.seconds ? r.fecha.seconds * 1000 : new Date(r.fecha).getTime();
          const horasAntiguedad = (new Date().getTime() - tiempoReclamo) / (1000 * 60 * 60);
          const tieneEscudo = horasAntiguedad < 48; // 48 horas de inmunidad garantizada

          if (insumo.supervivencia >= umbral) { 
            if (insumo.ocDemorada === 0) {
              // REGLA 2: Cierre Feliz Automático (Solo si ya se quedó sin escudo)
              if (!tieneEscudo) {
                const reclamoRef = doc(db, "reclamos", r.id); 
                await updateDoc(reclamoRef, { estado: "CERRADO", motivoCierre: "Stock Recuperado (Automático)" }); 
              }
            } else if (!r.alertaCierreMostrada) {
              // REGLA 3: Cierre Bajo Observación Manual (Avisa en pantalla pero no cierra)
              alertasSugeridas.push(insumo.nombre);
              const reclamoRef = doc(db, "reclamos", r.id);
              await updateDoc(reclamoRef, { alertaCierreMostrada: true }); 
            }
          } else if (insumo.supervivencia < umbral && r.alertaCierreMostrada) {
            // Si el stock vuelve a caer, le quitamos la marca para avisar de nuevo a futuro
            const reclamoRef = doc(db, "reclamos", r.id);
            await updateDoc(reclamoRef, { alertaCierreMostrada: false });
          }
        }
      }

      // Dispara el aviso visual en pantalla
      if (alertasSugeridas.length > 0) {
        setToastMsg(`Sugerencia de Auditoría: ${alertasSugeridas.join(', ')} superó los ${umbral} días de stock, pero mantiene OC demoradas.`);
        setTimeout(() => setToastMsg(null), 8000); 
      }
    }; 
    ejecutarAutoLimpieza();
  }, [insumos, reclamos, config?.umbralUrgencia]);

  const guardarConfigEnFirebase = async (nuevaConfig) => { setConfig(nuevaConfig); await setDoc(doc(db, "config", "general"), nuevaConfig); };
  const toggleFavorito = async (insumo) => { await updateDoc(doc(db, "insumos", insumo.id), { esFavorito: !insumo.favorito }); };
  const toggleVisibilidadPlanta = async (insumo) => { const current = insumo.visibleEnPlanta !== false; await updateDoc(doc(db, "insumos", insumo.id), { visibleEnPlanta: !current }); };
  
  const solicitarAlertaPlanta = async (insumo) => {
    try {
      // 1. LA HUELLA TÁCTICA EN AUDITORÍA (El registro para el dueño)
      await addDoc(collection(db, "reclamos"), { 
        insumoId: insumo.id, 
        operario: currentUser.nombre, 
        mensaje: `SOLICITUD DE ALERTA: ${insumo.nombre}`, 
        cuerpoOriginal: "El operario solicita autorización para emitir una alerta interna a la planta.", 
        fecha: serverTimestamp(), 
        estado: "ABIERTO", 
        tipo: "SOLICITUD GERENCIA" 
      });

      // 2. EL CAMBIO DE ESTADO EN EL TABLERO (Para el operario)
      await updateDoc(doc(db, "insumos", insumo.id), { 
        alertaPendiente: true, 
        alertaSolicitante: currentUser.nombre,
        alertaRechazadaMotivo: null,
        alertaSolicitadaHora: serverTimestamp() 
      });
      
      setToastMsg("Solicitud enviada. Queda a la espera de aprobación por gerencia.");
      setTimeout(() => setToastMsg(null), 4000);
    } catch (error) { 
      console.error("Error solicitando alerta:", error); 
    }
  };

  const marcarAlertaComoVista = async (insumo) => {
    if (insumo.alertaVistaPorOperario === false) {
      try { await updateDoc(doc(db, "insumos", insumo.id), { alertaVistaPorOperario: true }); } 
      catch (error) { console.error(error); }
    }
  };

  // --- ACÁ PEGAS LA FUNCIÓN NUEVA ---
 const rechazarAlertaPlanta = async (insumo, motivo) => {
    try {
      await addDoc(collection(db, "reclamos"), { 
        insumoId: insumo.id, 
        operario: `GERENCIA ➡️ ${insumo.alertaSolicitante || 'Planta'}`,
        mensaje: `RECHAZO DE ALERTA: ${insumo.nombre}`, 
        cuerpoOriginal: `Motivo del rechazo: ${motivo}`, 
        fecha: serverTimestamp(), 
        estado: "CERRADO", 
        tipo: "RECHAZO GERENCIA" 
      });
      
      await updateDoc(doc(db, "insumos", insumo.id), { 
        alertaPendiente: false, 
        alertaRechazadaMotivo: motivo, 
        alertaVistaPorOperario: false 
      });
      
      setToastMsg("Solicitud rechazada. Motivo enviado a la planta.");
      setTimeout(() => setToastMsg(null), 4000);
      setActiveInsumo(null); // <-- Cierra el panel automáticamente
    } catch (error) { 
      console.error("Error rechazando alerta:", error); 
    }
  };
        
  const aprobarAlertaPlanta = async (insumo) => {
    try {
      await addDoc(collection(db, "reclamos"), { 
        insumoId: insumo.id, 
        operario: `GERENCIA ➡️ ${insumo.alertaSolicitante || 'Planta'}`,
        mensaje: `APROBACIÓN OFICIAL: ${insumo.nombre}`, 
        cuerpoOriginal: "Autorizado para emitir alerta interna a planta.", 
        fecha: serverTimestamp(), 
        estado: "CERRADO", 
        tipo: "APROBACION GERENCIA" 
      });
      
      await updateDoc(doc(db, "insumos", insumo.id), { 
        alertaPendiente: false, 
        alertaAprobada: true, 
        alertaAprobadaPor: currentUser.nombre, 
        alertaAprobadaHora: serverTimestamp(), 
        alertaVistaPorOperario: false 
      });
      
      setToastMsg("¡Alerta aprobada! El operario ya puede enviarla.");
      setTimeout(() => setToastMsg(null), 4000);
      setActiveInsumo(null); // <-- Cierra el panel automáticamente
    } catch (error) { 
      console.error("Error aprobando alerta:", error); 
    }
  };

  const forzarCancelacionAlerta = async (insumo) => {
    try {
      await updateDoc(doc(db, "insumos", insumo.id), { 
        alertaAprobada: false, 
        alertaPendiente: false, 
        alertaActivaEnPlanta: false,
        visibleEnPlanta: false,
        alertaVistaPorOperario: true
      });
      setToastMsg("Alerta cancelada y limpiada forzosamente.");
      setTimeout(() => setToastMsg(null), 4000);
    } catch (error) { 
      console.error("Error cancelando alerta:", error); 
    }
  };

  const calcularFechaQuiebre = (dias) => {
    if (dias >= 999) return "Nunca"; let fecha = new Date(); let agregados = 0;
    while (agregados < Math.round(dias)) { fecha.setDate(fecha.getDate() + 1); const esDom = fecha.getDay() === 0; const str = fecha.toISOString().split('T')[0]; const esFer = config.feriados?.includes(str); if (!esDom && !esFer) agregados++; }
    return fecha.toLocaleDateString('es-AR');
  };

  const getPlantillasDinamicas = () => {
    if (config.plantillasDinamicas && config.plantillasDinamicas.length > 0) return config.plantillasDinamicas;
    return [
      { id: 'comprasLeve', nombre: 'Seguimiento Normal', destino: 'compras', isNormal: true, isUrgente: false, isSolped: false, asunto: config.asuntos?.comprasLeve || "", cuerpo: config.plantillas?.comprasLeve || "" },
      { id: 'comprasGrave', nombre: 'Reclamo Urgente', destino: 'compras', isNormal: false, isUrgente: true, isSolped: false, asunto: config.asuntos?.comprasGrave || "", cuerpo: config.plantillas?.comprasGrave || "" },
      { id: 'equipo', nombre: 'Alerta Interna (Planta)', destino: 'equipo', isNormal: false, isUrgente: false, isSolped: false, asunto: config.asuntos?.equipo || "", cuerpo: config.plantillas?.equipo || "" }
    ];
  };

  const aplicarPlantilla = (insumo, templateId) => {
    if (!insumo || !config) return { asunto: "", cuerpo: "", destino: "compras" };
    const plantillas = getPlantillasDinamicas();
    const template = plantillas.find(p => p.id === templateId) || plantillas[0];
    const dias = Math.round(insumo.supervivencia); 
    const fechaQ = calcularFechaQuiebre(insumo.supervivencia);
    const hoyCheck = new Date(); hoyCheck.setHours(0,0,0,0);
    
    const ocsIgnoradas = insumo.ocsIgnoradas || [];
    const ocsD = insumo.detalleOCs?.filter(oc => { 
      if (ocsIgnoradas.includes(oc.numero)) return false;
      const f = oc.fecha?.seconds ? new Date(oc.fecha.seconds * 1000) : new Date(oc.fecha); 
      const fCheck = new Date(f); fCheck.setHours(0,0,0,0); 
      return fCheck < hoyCheck; 
    }) || [];
    const listaOcs = ocsD.length > 0 ? ocsD.map(oc => `- OC ${oc.numero} (${formatoNum(oc.cantidad)} un.)`).join("\n") : "Sin OC Demoradas";
    
    const solpedsD = insumo.detalleSolpeds || [];
    const listaSolpeds = solpedsD.length > 0 ? solpedsD.map(sp => `- S/P ${sp.numero} (${formatoNum(sp.cantidad)} un.)`).join("\n") : "Sin Solicitudes (S/P)";

    const procesar = (txt) => {
      if (!txt) return "";
      return txt.replace(/{nombre}/g, insumo.nombre || "").replace(/{codigo}/g, insumo.codigo || "").replace(/{dias}/g, dias >= 999 ? 'Infinitos' : dias).replace(/{fechaQuiebre}/g, fechaQ).replace(/{ocs}/g, listaOcs).replace(/{solpeds}/g, listaSolpeds);
    };
    
    return { asunto: procesar(template.asunto || "⚠️ Asunto vacío"), cuerpo: procesar(template.cuerpo || "⚠️ Cuerpo vacío"), destino: template.destino || "compras" };
  };

  const abrirRedactorReclamo = (insumo, tipoAccionForzada = null) => {
    const umbral = config?.umbralUrgencia || 15;
    const isGrave = Math.round(insumo.supervivencia) <= umbral;
    const hasSolpeds = insumo.sp > 0; 
    const plantillas = getPlantillasDinamicas();
    
    let tInicial = null;
    
    if (tipoAccionForzada === "ALERTA PLANTA") {
      tInicial = plantillas.find(p => p.destino === 'equipo');
    } else {
      if (!tInicial && hasSolpeds) tInicial = plantillas.find(p => p.isSolped); 
      if (!tInicial && isGrave) tInicial = plantillas.find(p => p.isUrgente); 
      if (!tInicial) tInicial = plantillas.find(p => p.isNormal); 
    }

    if (!tInicial) tInicial = plantillas[0]; 

    const { asunto, cuerpo, destino } = aplicarPlantilla(insumo, tInicial.id);
    
    // --- SISTEMA DE TICKET ÚNICO ---
    // Si no tiene un ticket guardado, le inventamos uno al azar para este borrador
    const ticketActual = insumo.ticketReclamo || `TK-${Math.floor(1000 + Math.random() * 9000)}`;
    // Le pegamos el ticket al asunto SOLO si es un reclamo hacia afuera
    const asuntoConTicket = destino === 'equipo' || destino === 'planta' ? asunto : `${asunto} [${ticketActual}]`;

    let destinatariosMatch = [];
    if (insumo.owner && insumo.owner !== "Sin asignar") {
        const txtOwner = String(insumo.owner).trim().toLowerCase();
        const contacto = (config.contactos || []).find(c => (c.alias && String(c.alias).trim().toLowerCase() === txtOwner) || (c.label && String(c.label).trim().toLowerCase() === txtOwner));
        if (contacto && contacto.tipo === destino) destinatariosMatch.push(contacto.id);
    }

    setReclamoDraft({ 
      insumo, 
      destinatarios: destinatariosMatch, 
      asunto: asuntoConTicket, 
      cuerpo, 
      tipoPlantilla: tInicial.id, 
      tipoDestino: destino, 
      showDestinatarios: destinatariosMatch.length === 0,
      ticketBorrador: ticketActual // Lo guardamos en memoria
    });
  };
  const confirmarYGuardarReclamo = async (modoAccion = 'NUEVO') => {
    // 1. RECOLECCIÓN DE DATOS Y DESTINATARIOS
    const correosDirectorio = reclamoDraft.destinatarios
      .map(id => config.contactos.find(c => c.id === id)?.email)
      .filter(e => e);
    const correoManual = reclamoDraft.correoManual ? reclamoDraft.correoManual.trim() : "";
    
    const correosFinales = [...correosDirectorio];
    if (correoManual) correosFinales.push(correoManual);
    const correosStr = correosFinales.join(",");

    // Validación de seguridad: debe haber al menos un destino (salvo en modo hilo que ya conocemos al receptor)
    if (correosStr.length === 0 && modoAccion !== 'HILO') {
      setToastMsg("⚠️ Error: Seleccioná un destinatario antes de continuar.");
      setTimeout(() => setToastMsg(null), 4000);
      return;
    }

    // 2. GUARDADO EN AUDITORÍA (HISTORIAL TÁCTICO)
    try {
      await addDoc(collection(db, "reclamos"), { 
        insumoId: reclamoDraft.insumo.id, 
        operario: currentUser.nombre, 
        mensaje: reclamoDraft.asunto, 
        cuerpoOriginal: reclamoDraft.cuerpo, 
        fecha: serverTimestamp(), 
        estado: "ABIERTO", 
        tipo: reclamoDraft.tipoDestino 
      });

      // 3. ACTUALIZACIÓN DEL ESTADO DEL INSUMO
      const isAlertaInterna = reclamoDraft.tipoDestino === 'equipo' || reclamoDraft.tipoDestino === 'planta';
      
      let updates = {
        alertaPendiente: false,
        alertaAprobada: false,
        alertaSolicitante: null,
        alertaAprobadaHora: null,
        alertaVistaPorOperario: true,
        visibleEnPlanta: isAlertaInterna ? true : (reclamoDraft.insumo.visibleEnPlanta || false),
        alertaActivaEnPlanta: isAlertaInterna ? true : false 
      };

      // Si es reclamo a proveedor, grabamos el Ticket para que el ERP lo recuerde
      if (!isAlertaInterna) {
        updates.ticketReclamo = reclamoDraft.ticketBorrador;
      }

      await updateDoc(doc(db, "insumos", reclamoDraft.insumo.id), updates);

      // 4. EJECUCIÓN SEGÚN EL MODO ELEGIDO
      if (modoAccion === 'HILO') {
        // MODO PROFESIONAL: Copiamos al portapapeles y abrimos el Modal UI de instrucciones
        navigator.clipboard.writeText(reclamoDraft.cuerpo);
        setAlertaHilo({
          url: `https://mail.google.com/mail/u/0/#search/to:${correosStr}+"${reclamoDraft.ticketBorrador}"`
        });
        // IMPORTANTE: No cerramos el redactor todavía, lo hará el modal de instrucciones al confirmar
      } else {
        // MODO CORREO NUEVO: Abrimos ventana de redacción limpia de Gmail
        const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${correosStr}&su=${encodeURIComponent(reclamoDraft.asunto)}&body=${encodeURIComponent(reclamoDraft.cuerpo)}`;
        window.open(gmailUrl, '_blank');
        
        // Limpiamos el borrador y avisamos éxito
        setReclamoDraft(null);
        setToastMsg("✅ Reclamo registrado y Gmail abierto con éxito.");
        setTimeout(() => setToastMsg(null), 4000);
      }

    } catch (error) {
      console.error("Error en la operación de reclamo:", error);
      setToastMsg("❌ Error al procesar el reclamo. Reintentá.");
      setTimeout(() => setToastMsg(null), 4000);
    }
  };

  const cerrarReclamoManual = async (reclamoId, e) => {
    // Frenamos el clic para que no se abra el panel lateral por accidente
    if (e) e.stopPropagation(); 
    
    try {
      // Apuntamos directo a la base de datos y le bajamos el martillo
      await updateDoc(doc(db, "reclamos", reclamoId), {
        estado: 'CERRADO'
      });
      
      // Aviso elegante y moderno
      setToastMsg("✅ Reclamo cerrado y archivado en el historial.");
      setTimeout(() => setToastMsg(null), 4000);
      
    } catch (error) {
      console.error("Error táctico cerrando el reclamo:", error);
      setToastMsg("❌ Ocurrió un error al intentar cerrar el registro.");
      setTimeout(() => setToastMsg(null), 4000);
    }
  };
  
  const exportarBackupDB = () => {
    const data = JSON.stringify({ insumos: insumosRaw, reclamos: reclamosRaw, config }, null, 2);
    const blob = new Blob([data], { type: "application/json" }); const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = `Backup_ERP_${new Date().toISOString().split('T')[0]}.json`; link.click();
  };

  const importarBackupDB = (e) => {
    const file = e.target.files[0]; if (!file) return; const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = JSON.parse(event.target.result);
        if (data.config) await guardarConfigEnFirebase(data.config);
        if (data.reclamos) for (const r of data.reclamos) { const { id, ...rest } = r; await setDoc(doc(db, "reclamos", id), rest); }
        if (data.insumos) for (const i of data.insumos) { const { id, ...rest } = i; await setDoc(doc(db, "insumos", id), rest); }
        alert("¡Base de datos restaurada con éxito!");
      } catch (err) { alert("Error al leer el archivo JSON: Archivo corrupto o formato inválido."); }
    }; reader.readAsText(file);
  };

  const resultadosBusqueda = insumos.filter(i => i.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) || i.codigo?.toLowerCase().includes(searchTerm.toLowerCase()));
  const grupos = [...new Set(insumos.map(item => item.grupo || 'SIN CLASIFICAR'))].sort((a, b) => a.localeCompare(b));
  const reclamosActivos = activeInsumo ? reclamos.filter(r => r.insumoId === activeInsumo.id) : [];

let datosAlerta = []; let tituloAlerta = "";
  const uCriticoApp = config?.umbralCritico !== undefined ? config.umbralCritico : 0;
  const uUrgenciaApp = config?.umbralUrgencia !== undefined ? config.umbralUrgencia : 15;

  if (filtroAlerta === 'quiebres') { datosAlerta = insumos.filter(i => i.stock <= 0); tituloAlerta = "Quiebres Confirmados"; } 
  else if (filtroAlerta === 'favoritos') { datosAlerta = insumos.filter(i => i.favorito && i.supervivencia <= uUrgenciaApp && i.supervivencia > uCriticoApp); tituloAlerta = "Favoritos en Riesgo"; } 
  else if (filtroAlerta === 'oc_tardia') { datosAlerta = insumos.filter(i => i.ocDemorada > 0); tituloAlerta = "OC Demoradas"; } 
  else if (filtroAlerta === 'mis_favoritos') { datosAlerta = insumos.filter(i => i.favorito); tituloAlerta = currentUser.rol === 'owner' ? "Todos los Favoritos" : "Mis Favoritos"; }
  // --- FILTROS DE AUDITORÍA REALES ---
  else if (filtroAlerta === 'alerta_planta') { datosAlerta = insumos.filter(i => i.alertaActivaEnPlanta || i.alertaAprobada); tituloAlerta = "Alertas Activas en Planta"; }
  else if (filtroAlerta === 'esperando_aprobacion') { datosAlerta = insumos.filter(i => i.alertaPendiente); tituloAlerta = "Esperando Confirmación"; }
  
  if (currentUser.rol !== 'owner' && currentUser.rol !== 'produccion') {
    datosAlerta = datosAlerta.filter(i => i.owner?.toUpperCase().trim() === currentUser.aliasMatch);
  }
  
  const isTV = currentUser.rol === 'produccion';
  if (cargandoAuth) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50 font-bold text-slate-500">Verificando credenciales...</div>;
  }

  if (!usuarioLogueado) {
    return <VistaLogin />;
  }

  return (
    <div className={`flex h-screen w-screen font-sans overflow-hidden ${isTV ? 'bg-slate-950 text-white' : 'bg-[#F8FAFC] text-slate-800'}`}>
      
      {!isTV && (
        <aside className="w-20 bg-slate-900 flex flex-col items-center py-6 border-r border-slate-800 z-[60] shadow-2xl shrink-0 h-full relative">
          <div onClick={() => setShowWelcome(true)} className="w-12 h-12 bg-orange-500 rounded-xl flex items-center justify-center text-white shadow-lg mb-10 font-black italic text-xl cursor-pointer hover:scale-105 transition-all">K</div>
          <nav className="flex flex-col gap-6 w-full px-3">
            <div onClick={() => setVistaActiva('gestion')} className={`p-3 rounded-xl flex justify-center cursor-pointer transition-all relative group ${vistaActiva === 'gestion' ? 'bg-slate-800 text-orange-500 shadow-inner border border-slate-700' : 'text-slate-500 hover:text-orange-400 hover:bg-slate-800'}`}><LayoutDashboard size={22} /><span className="absolute left-16 bg-slate-800 text-white text-[10px] font-black px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity uppercase tracking-widest whitespace-nowrap z-50">Gestión ERP</span></div>
            <div onClick={() => setVistaActiva('planta')} className={`p-3 rounded-xl flex justify-center cursor-pointer transition-all relative group ${vistaActiva === 'planta' ? 'bg-slate-800 text-purple-500 shadow-inner border border-slate-700' : 'text-slate-500 hover:text-purple-400 hover:bg-slate-800'}`}><Activity size={22} /><span className="absolute left-16 bg-slate-800 text-white text-[10px] font-black px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity uppercase tracking-widest whitespace-nowrap z-50">Monitoreo</span></div>
            {currentUser.rol === 'owner' && (<div onClick={() => setVistaActiva('mensajeria')} className={`p-3 rounded-xl flex justify-center cursor-pointer transition-all relative group ${vistaActiva === 'mensajeria' ? 'bg-slate-800 text-emerald-400 shadow-inner border border-slate-700' : 'text-slate-500 hover:text-emerald-400 hover:bg-slate-800'}`}><Megaphone size={22} /><span className="absolute left-16 bg-slate-800 text-white text-[10px] font-black px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity uppercase tracking-widest whitespace-nowrap z-50">Difusión</span></div>)}
            <div onClick={() => setVistaActiva('auditoria')} className={`p-3 rounded-xl flex justify-center cursor-pointer transition-all relative group ${vistaActiva === 'auditoria' ? 'bg-slate-800 text-sky-500 shadow-inner border border-slate-700' : 'text-slate-500 hover:text-sky-400 hover:bg-slate-800'}`}><History size={22} /><span className="absolute left-16 bg-slate-800 text-white text-[10px] font-black px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity uppercase tracking-widest whitespace-nowrap z-50">Auditoría</span></div>
            <div onClick={() => setVistaActiva('notificaciones')} className={`p-3 rounded-xl flex justify-center cursor-pointer transition-all relative group ${vistaActiva === 'notificaciones' ? 'bg-slate-800 text-yellow-400 shadow-inner border border-slate-700' : 'text-slate-500 hover:text-yellow-400 hover:bg-slate-800'}`}>
            <div className="relative">
              <Bell size={22} />
              {(() => {
                const msjSinLeer = reclamos.filter(r => r.insumoId === "BROADCAST" && r.destinatarioId?.includes(String(currentUser.id)) && !(r.leidoPor || []).includes(currentUser.nombre)).length;
                const ownerPendientes = currentUser.rol === 'owner' ? insumos.filter(i => i.alertaPendiente).length : 0;
                const operarioRespuestas = currentUser.rol !== 'owner' ? insumos.filter(i => i.alertaSolicitante === currentUser.nombre && i.alertaVistaPorOperario === false).length : 0;
                const operarioEnviados = currentUser.rol !== 'owner' ? insumos.filter(i => i.alertaPendiente && i.alertaSolicitante === currentUser.nombre).length : 0;

                const totalRojas = msjSinLeer + ownerPendientes + operarioRespuestas;

                if (totalRojas > 0) return <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full border-2 border-slate-900 shadow-[0_0_8px_rgba(239,68,68,0.8)]">{totalRojas}</span>;
                if (operarioEnviados > 0) return <span className="absolute -top-2 -right-2 bg-amber-500 text-amber-900 text-[9px] font-black px-1.5 py-0.5 rounded-full border-2 border-slate-900 shadow-[0_0_8px_rgba(245,158,11,0.8)]">{operarioEnviados}</span>;
                return null;
              })()}
            </div>
            <span className="absolute left-16 bg-slate-800 text-white text-[10px] font-black px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity uppercase tracking-widest whitespace-nowrap z-50">Notificaciones</span>
          </div>
          </nav>
          {currentUser.rol === 'owner' && (<div className="mt-auto w-full px-3 relative group"><div onClick={() => setShowSettings(true)} className="p-3 text-slate-500 hover:text-white hover:bg-slate-800 transition-all flex justify-center cursor-pointer rounded-xl w-full"><Settings size={22} /><span className="absolute left-16 top-2 bg-slate-800 text-white text-[10px] font-black px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity uppercase tracking-widest whitespace-nowrap z-50">Ajustes Generales</span></div></div>)}
        </aside>
      )}

      <div className="flex-1 flex flex-col h-full min-w-0 relative">
        <header className={`h-20 flex items-center px-8 gap-8 shrink-0 z-10 ${isTV ? 'bg-slate-900 border-b border-slate-800 shadow-[0_4px_30px_rgba(0,0,0,0.5)]' : 'bg-white border-b border-slate-200 shadow-sm'}`}>
          <div className="relative flex-1 max-w-3xl flex items-center gap-4">
            {!isTV && (
              <>
                <Search className="absolute left-4 top-3 text-slate-400" size={20} />
                <input type="text" placeholder="Buscar insumo..." value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setFiltroAlerta(null); setSelectedGroup(null); if (vistaActiva !== 'gestion') setVistaActiva('gestion'); }} className="w-full pl-12 pr-4 py-2.5 bg-slate-100 rounded-xl text-sm font-bold uppercase outline-none focus:bg-white focus:ring-2 focus:ring-orange-500 transition-all" />
                {searchTerm && (<X onClick={() => {setSearchTerm(""); setFiltroAlerta(null)}} className="absolute right-4 top-3 text-slate-400 cursor-pointer hover:text-orange-500 transition-colors" size={20} />)}
              </>
            )}

            {isTV && (
              <div className="flex gap-4">
                <button onClick={() => setVistaActiva('planta')} className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 ${vistaActiva === 'planta' ? 'text-yellow-400 border border-yellow-500 bg-slate-900 shadow-[0_0_15px_rgba(234,179,8,0.3)]' : 'text-white border border-slate-700 hover:border-slate-500 hover:bg-slate-800'}`}><Activity size={16} className="-mt-0.5" /> Monitor</button>
                <button onClick={() => setVistaActiva('notificaciones')} className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 ${vistaActiva === 'notificaciones' ? 'text-yellow-400 border border-yellow-500 bg-slate-900 shadow-[0_0_15px_rgba(234,179,8,0.3)]' : 'text-white border border-slate-700 hover:border-slate-500 hover:bg-slate-800'}`}><Bell size={16} /> Notificaciones {reclamos.some(r => r.insumoId === "BROADCAST" && r.destinatarioId?.includes(String(currentUser.id)) && !(r.leidoPor || []).includes(currentUser.nombre)) && (<span className="w-2 h-2 bg-red-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.8)]"></span>)}</button>
              </div>
            )}
          </div>
          
          <div className={`flex items-center gap-4 ml-auto border-l pl-8 ${isTV ? 'border-slate-800' : 'border-slate-200'}`}>
            <div className="mr-4 text-right hidden md:block">
              <p className={`text-[9px] font-black uppercase tracking-widest flex items-center gap-1 justify-end ${isTV ? 'text-slate-400' : 'text-slate-400'}`}><Clock size={10}/> Última Actualización Sheets</p>
              <p className={`text-xs font-bold ${isTV ? 'text-white' : 'text-slate-600'}`}>{ultimaAct ? formatearFecha(ultimaAct) : 'Esperando Script...'}</p>
            </div>
            
            {/* --- AVATAR CON MODO DIOS --- */}
            <div 
              className={`flex items-center group p-2 rounded-xl border relative transition-all ${isTV ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'} ${realUser.rol === 'owner' ? 'cursor-pointer hover:border-orange-500 hover:shadow-md' : ''}`}
              onClick={() => { 
                if (realUser.rol === 'owner') {
                  const currentIndex = perfilesSimulables.findIndex(p => p.id === currentUser.id); 
                  const nextIndex = (currentIndex + 1) % perfilesSimulables.length; 
                  setSimulatedId(perfilesSimulables[nextIndex].id); 
                } 
              }}
            >
              <div className="text-right mr-3">
                <p className={`text-[10px] font-bold uppercase tracking-widest ${isTV ? 'text-slate-400' : 'text-slate-400'}`}>
                  {realUser.rol === 'owner' && currentUser.id !== realUser.id ? 'ESPIANDO:' : currentUser.rol}
                </p>
                <p className={`text-xs font-black ${isTV ? 'text-white' : 'text-slate-800'}`}>
                  {currentUser.nombre}
                </p>
              </div>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black shadow-md transition-transform group-hover:scale-105 ${currentUser.rol === 'owner' ? 'bg-orange-500 text-white' : currentUser.rol === 'produccion' ? 'bg-yellow-500 text-slate-900' : 'bg-slate-700 text-white'}`}>{currentUser.inicial}</div>
            </div>
            {/* --------------------------- */}
            
            {/* --- BOTÓN CERRAR SESIÓN --- */}
            <button 
              onClick={() => signOut(auth)} 
              className="ml-4 px-3 py-1.5 bg-red-100 text-red-600 hover:bg-red-200 rounded-lg text-xs font-bold uppercase tracking-widest transition-colors"
            >
              Salir
            </button>
            {/* --------------------------- */}
          </div>
        </header>

        <main className={`flex-1 overflow-auto relative ${isTV ? 'bg-slate-950' : 'bg-[#F8FAFC]'}`}>
          {vistaActiva === 'planta' && <VistaProduccion insumos={insumos} currentUser={currentUser} setActiveInsumo={setActiveInsumo} />}
          {vistaActiva === 'auditoria' && !isTV && (
            <VistaAuditoria 
              insumos={insumos} 
              reclamos={reclamos} 
              currentUser={currentUser} 
              formatearFecha={formatearFecha} 
              obtenerMesAnio={obtenerMesAnio} 
              setToastMsg={setToastMsg} 
              cerrarReclamoManual={cerrarReclamoManual}
              auditoriaFiltroInsumo={auditoriaFiltroInsumo}
              setAuditoriaFiltroInsumo={setAuditoriaFiltroInsumo}
              setActiveInsumo={setActiveInsumo} 
            />
          )}
          {vistaActiva === 'mensajeria' && currentUser.rol === 'owner' && (
            <VistaMensajeria 
              currentUser={currentUser} 
              config={config} 
              reclamos={reclamos} 
              formatearFecha={formatearFecha} 
            />
          )}
          {vistaActiva === 'notificaciones' && (
            <VistaNotificaciones 
              currentUser={currentUser}
              insumos={insumos}
              reclamos={reclamos}
              notiTabActiva={notiTabActiva}
              setNotiTabActiva={setNotiTabActiva}
              formatearFecha={formatearFecha}
              setActiveInsumo={setActiveInsumo}
              rechazarAlertaPlanta={rechazarAlertaPlanta}
              aprobarAlertaPlanta={aprobarAlertaPlanta}
              marcarAlertaComoVista={marcarAlertaComoVista}
            />
          )}
           {vistaActiva === 'gestion' && !isTV && (
            <VistaGestion 
              currentUser={currentUser}
              insumos={insumos}
              config={config}
              searchTerm={searchTerm}
              resultadosBusqueda={resultadosBusqueda}
              filtroAlerta={filtroAlerta}
              setFiltroAlerta={setFiltroAlerta}
              datosAlerta={datosAlerta}
              tituloAlerta={tituloAlerta}
              selectedGroup={selectedGroup}
              setSelectedGroup={setSelectedGroup}
              grupos={grupos}
              filtroResponsable={filtroResponsable}
              filtroVistaLista={filtroVistaLista}
              setFiltroVistaLista={setFiltroVistaLista}
              filtroRiesgoGrupo={filtroRiesgoGrupo}
              setFiltroRiesgoGrupo={setFiltroRiesgoGrupo}
              setActiveInsumo={setActiveInsumo}
              toggleFavorito={toggleFavorito}
              toggleVisibilidadPlanta={toggleVisibilidadPlanta}
              obtenerColorOwner={obtenerColorOwner}
              renderRadarDinamico={renderRadarDinamico}
            />
          )}
        </main>
      </div>

      <AnimatePresence>
       {activeInsumo && (
          <PanelDetalle 
            activeInsumo={activeInsumo}
            setActiveInsumo={setActiveInsumo}
            currentUser={currentUser}
            config={config}
            toggleFavorito={toggleFavorito}
            toggleVisibilidadPlanta={toggleVisibilidadPlanta}
            formatearFecha={formatearFecha}
            reclamosActivos={reclamosActivos}
            cerrarReclamoManual={cerrarReclamoManual}
            setAuditoriaFiltroInsumo={setAuditoriaFiltroInsumo}
            setVistaActiva={setVistaActiva}
            rechazarAlertaPlanta={rechazarAlertaPlanta}
            aprobarAlertaPlanta={aprobarAlertaPlanta}
            abrirRedactorReclamo={abrirRedactorReclamo}
            solicitarAlertaPlanta={solicitarAlertaPlanta}
            forzarCancelacionAlerta={forzarCancelacionAlerta}
          />
        )}
        
      </AnimatePresence>

      {/* MODAL PROFESIONAL DE INSTRUCCIONES PARA EL HILO */}
      <AnimatePresence>
        {alertaHilo && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4">
            <motion.div initial={{ scale: 0.95, y: 10 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl border border-slate-200 flex flex-col">
              
              <div className="bg-slate-900 p-6 text-center relative">
                <div className="w-16 h-16 bg-sky-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Mail size={32} className="text-sky-400" />
                </div>
                <h3 className="text-white font-black uppercase tracking-widest text-lg">Modo Hilo Activado</h3>
                <p className="text-slate-400 text-xs font-bold mt-1">El texto ya fue copiado al portapapeles</p>
              </div>
              
              <div className="p-6 bg-slate-50">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 text-center">Pasos a seguir en Gmail:</p>
                <div className="bg-white border border-slate-200 rounded-2xl p-4 text-xs font-bold text-slate-600 space-y-3 shadow-sm">
                  <div className="flex items-center gap-3">
                    <span className="bg-slate-100 text-slate-800 rounded-full w-6 h-6 flex items-center justify-center shrink-0 font-black text-[10px]">1</span> 
                    <p>Se abrirá Gmail buscando el <span className="text-orange-500 font-black">ticket anterior</span>.</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="bg-slate-100 text-slate-800 rounded-full w-6 h-6 flex items-center justify-center shrink-0 font-black text-[10px]">2</span> 
                    <p>Abrí ese correo viejo.</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="bg-slate-100 text-slate-800 rounded-full w-6 h-6 flex items-center justify-center shrink-0 font-black text-[10px]">3</span> 
                    <p>Tocá la flecha de <span className="text-sky-600 font-black">Responder</span>.</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="bg-slate-100 text-slate-800 rounded-full w-6 h-6 flex items-center justify-center shrink-0 font-black text-[10px]">4</span> 
                    <p>Presioná <span className="bg-slate-800 text-white px-1.5 py-0.5 rounded uppercase font-black text-[9px]">Ctrl + V</span> para pegar el reclamo.</p>
                  </div>
                </div>
              </div>
              
              <div className="p-5 bg-white border-t border-slate-100 flex gap-3">
                <button 
                  onClick={() => { 
                    setAlertaHilo(null); 
                    setToastMsg("Envío pausado. Podés enviarlo manualmente luego."); 
                    setTimeout(()=>setToastMsg(null),4000); 
                  }} 
                  className="flex-1 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700 transition-all"
                >
                  Cancelar
                </button>
                <button 
                  onClick={() => { 
                    window.open(alertaHilo.url, '_blank'); 
                    setAlertaHilo(null); 
                    setReclamoDraft(null); 
                  }} 
                  className="flex-[2] flex items-center justify-center gap-2 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest bg-sky-500 text-white hover:bg-sky-600 shadow-[0_5px_15px_rgba(14,165,233,0.3)] transition-all active:scale-95"
                >
                  Entendido, Abrir Gmail <ChevronRight size={14}/>
                </button>
              </div>
              
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {reclamoDraft && (
          <ModalRedactor 
            reclamoDraft={reclamoDraft}
            setReclamoDraft={setReclamoDraft}
            config={config}
            currentUser={currentUser}
            getPlantillasDinamicas={getPlantillasDinamicas}
            aplicarPlantilla={aplicarPlantilla}
            confirmarYGuardarReclamo={confirmarYGuardarReclamo}
            solicitarAlertaPlanta={solicitarAlertaPlanta}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showSettings && (
          <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 md:p-8">
            <PanelAjustes 
              configInicial={config} 
              onClose={() => setShowSettings(false)} 
              onGuardar={(nuevaConfig) => {
                guardarConfigEnFirebase(nuevaConfig);
                setToastMsg("✅ Ajustes guardados en la nube exitosamente.");
                setTimeout(() => setToastMsg(null), 3000);
              }}
              onExportar={exportarBackupDB}
              onImportar={importarBackupDB}
            />
          </div>
        )}
      </AnimatePresence>
      
      <AnimatePresence>
        {toastMsg && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }} 
            animate={{ opacity: 1, y: 0 }} 
            exit={{ opacity: 0, y: 50 }} 
            className="fixed bottom-10 right-10 z-[9999] bg-slate-900 border border-slate-700 text-white px-5 py-4 rounded-2xl shadow-2xl flex items-center gap-4"
          >
            <div className="w-8 h-8 bg-emerald-500/20 rounded-full flex items-center justify-center shrink-0">
              <CheckCircle size={16} className="text-emerald-400" />
            </div>
            <div>
              <h4 className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Operación Exitosa</h4>
              <p className="text-xs font-bold text-slate-300 mt-0.5">{toastMsg}</p>
            </div>
            <button onClick={() => setToastMsg(null)} className="ml-4 text-slate-500 hover:text-white transition-colors shrink-0">
              <X size={16}/>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
      
    </div>
  );
};

export default App;
