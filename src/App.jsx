import React, { useState, useEffect, useMemo } from 'react';
import { db } from './firebase';
import TablaInsumos from './componentes/TablaInsumos';
import VistaAuditoria from './vistas/VistaAuditoria';
import VistaArchivados from './vistas/VistaArchivados';
import VistaNotificaciones from './vistas/VistaNotificaciones';
import PanelAjustes from './componentes/PanelAjustes';
import PanelDetalle from './componentes/PanelDetalle';
import ModalRedactor from './componentes/ModalRedactor';
import VistaGestion from './vistas/VistaGestion';
import VistaLogin from './vistas/VistaLogin';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from './firebase';
import { collection, onSnapshot, query, addDoc, serverTimestamp, orderBy, doc, updateDoc, setDoc } from 'firebase/firestore';
import { Brain, MessageSquare, Mail, Settings, Search, AlertTriangle, X, ChevronRight, CheckCircle, Clock, History, Bell, Package, Archive, Warehouse } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const formatearFecha = (fecha) => {
  if (!fecha || fecha === "-") return "-";
  try {
    let f = (fecha && typeof fecha.toDate === 'function') ?
      fecha.toDate() : (fecha && fecha.seconds ? new Date(fecha.seconds * 1000) : new Date(fecha));
    if (isNaN(f.getTime())) return String(fecha);
    const dia = String(f.getDate()).padStart(2, '0'); const mes = String(f.getMonth() + 1).padStart(2, '0'); const anio = String(f.getFullYear()).slice(-2);
    return `${dia}/${mes}/${anio} ${String(f.getHours()).padStart(2, '0')}:${String(f.getMinutes()).padStart(2, '0')}`;
  } catch (e) { return String(fecha); }
};

const obtenerMesAnio = (fecha) => {
  if (!fecha) return "Sin Fecha";
  try {
    let f = (fecha && typeof fecha.toDate === 'function') ?
      fecha.toDate() : (fecha && fecha.seconds ? new Date(fecha.seconds * 1000) : new Date(fecha));
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
  const [dialogoConfirmacion, setDialogoConfirmacion] = useState(null);
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
            <button key={ownerAlias} onClick={() => setFiltroResponsable(ownerAlias)} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap flex items-center gap-1.5 ${isAct ?
              `${bgActive} text-white shadow-md` : 'bg-transparent text-slate-500 hover:bg-slate-100'}`}>
              {!isAct && <span className={`w-2 h-2 rounded-full ${bgActive}`}></span>}
              {ownerAlias}
            </button>
          );
        })}
      </div>
    );
  };

  const archivarInsumo = async (id) => {
    setDialogoConfirmacion({
      titulo: "Archivar Insumo",
      mensaje: "¿Seguro que querés archivar este insumo? Desaparecerá del tablero principal.",
      textoConfirmar: "Sí, Archivar",
      colorBoton: "bg-red-500 hover:bg-red-600",
      onConfirm: async () => {
        await updateDoc(doc(db, "insumos", id), { 
          discontinuado: true,
          fechaArchivado: serverTimestamp() 
        });
        setActiveInsumo(null);
        setToastMsg("📦 Insumo enviado al sótano correctamente.");
        setTimeout(() => setToastMsg(null), 4000);
      }
    });
  };

  const guardarNotaInterna = async (id, nota) => {
    await updateDoc(doc(db, "insumos", id), { notasInternas: nota });
  };

  const [config, setConfig] = useState({ contactos: [], feriados: [], asuntos: { comprasLeve: "SEGUIMIENTO: {nombre}", comprasGrave: "URGENTE: {nombre}" }, plantillas: { comprasLeve: "", comprasGrave: "" } });

  const realUser = useMemo(() => {
    if (!usuarioLogueado) return { id: 'invitado', nombre: "Cargando...", rol: "espectador", etiquetaRol: "ESPECTADOR", inicial: "-", aliasMatch: "NINGUNO", editorFavoritos: false };
    const emailLogueado = usuarioLogueado.email.toLowerCase();

    // 1. EL ÚNICO OWNER VIP: Fernando (Acceso total + Ajustes)
    if (emailLogueado === 'fernandocomex1@gmail.com') {
      return { id: 'owner_real', email: emailLogueado, nombre: "Fernando", rol: "owner", etiquetaRol: "OWNER VIP", inicial: "F", aliasMatch: "TODOS", editorFavoritos: true, accesoAjustes: true };
    }

    // 2. BUSCAMOS EN EL DIRECTORIO
    const operarioMatch = (config?.contactos || []).find(c => c.email && c.email.toLowerCase() === emailLogueado);

    if (operarioMatch) {
      if (operarioMatch.visionGlobal) {
        // PERFIL SUPERVISOR (Tiene el Ojo activado)
        return {
          id: operarioMatch.id,
          email: emailLogueado,
          nombre: operarioMatch.label || emailLogueado.split('@')[0],
          rol: "owner", // Le damos poderes de owner
          etiquetaRol: "SUPERVISOR", // Pero le ponemos su propia etiqueta
          inicial: (operarioMatch.label || emailLogueado.split('@')[0]).charAt(0).toUpperCase(),
          aliasMatch: "TODOS",
          editorFavoritos: true,
          accesoAjustes: false // CANDADO AL PANEL DE AJUSTES
        };
      } else {
        // PERFIL OPERARIO ESTÁNDAR
        return {
          id: operarioMatch.id,
          email: emailLogueado,
          nombre: operarioMatch.label || emailLogueado.split('@')[0],
          rol: "operario",
          etiquetaRol: "OPERARIO",
          inicial: (operarioMatch.label || emailLogueado.split('@')[0]).charAt(0).toUpperCase(),
          aliasMatch: (operarioMatch.alias || "").trim().toUpperCase(),
          editorFavoritos: operarioMatch.editorFavoritos === true
        };
      }
    }

    // 3. VISITAS
    const nombreVisita = emailLogueado.split('@')[0];
    return { id: usuarioLogueado.uid, email: emailLogueado, nombre: nombreVisita, rol: "espectador", etiquetaRol: "VISITA", inicial: nombreVisita.charAt(0).toUpperCase(), aliasMatch: "NINGUNO", editorFavoritos: false };
  }, [usuarioLogueado, config]);

  const perfilesSimulables = useMemo(() => {
    const base = [
      { id: 'owner_real', nombre: "Dueño VIP", rol: "owner", etiquetaRol: "OWNER VIP", inicial: "👑", aliasMatch: "TODOS", editorFavoritos: true, accesoAjustes: true }
    ];
    const extras = (config?.contactos || []).filter(c => c.tipo === 'equipo').map((c) => {
      if (c.visionGlobal) {
         return {
           id: c.id,
           nombre: (c.alias || c.label || 'Supervisor').toUpperCase(),
           rol: "owner",
           etiquetaRol: "SUPERVISOR",
           inicial: "👁️",
           aliasMatch: "TODOS",
           editorFavoritos: true,
           accesoAjustes: false
         };
      }
      return {
        id: c.id,
        nombre: (c.alias || c.label || 'Operario').toUpperCase(),
        rol: "operario",
        etiquetaRol: "OPERARIO",
        inicial: "👤",
        aliasMatch: (c.alias || "").trim().toUpperCase(),
        editorFavoritos: c.editorFavoritos === true
      };
    });
    return [...base, ...extras];
  }, [config]);

  const [simulatedId, setSimulatedId] = useState('owner_real');

  const currentUser = useMemo(() => {
    if (realUser.rol !== 'owner') return realUser; 
    const simulado = perfilesSimulables.find(p => p.id === simulatedId);
    return simulado || realUser;
  }, [realUser, simulatedId, perfilesSimulables]);

  const [showWelcome, setShowWelcome] = useState(true);

  // --- CORTE QUIRÚRGICO: ESCAPE PARA CERRAR PANEL ---
  useEffect(() => {
    const handleEsc = (event) => {
      if (event.key === 'Escape') {
        setActiveInsumo(null); // Cierra el PanelDetalle
        setReclamoDraft(null); // Cierra el ModalRedactor si está abierto
        setAlertaHilo(null);   // Cierra la alerta de hilo
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);

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
          if (fCheck < hoyCheck) ocDemoradaTotal += Number(oc.cantidad) || 0;
          else ocFuturaTotal += Number(oc.cantidad) || 0; 
        });
        
        const supervivencia = consumoDiario > 0 ? (stock / consumoDiario) : 999;
        const coberturaReal = consumoDiario > 0 ? ((stock + ocFuturaTotal + sp) / consumoDiario) : 999;

        return { 
          id: doc.id, ...d, stock, ocDemorada: ocDemoradaTotal, ocFutura: ocFuturaTotal, sp, consumo: consumoMes, 
          supervivencia: supervivencia > 998 ? 999 : supervivencia, cobertura: coberturaReal > 998 ? 999 : coberturaReal, 
          favorito: d.esFavorito || false, owner: d.owner || "Sin asignar" 
        };
      });
      setInsumosRaw(data);
      if (maxTime > 0) setUltimaAct(new Date(maxTime)); setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const q = query(collection(db, "reclamos"), orderBy("fecha", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => { setReclamosRaw(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))); });
    return () => unsubscribe();
  }, []);

  // --- CORTE QUIRÚRGICO: ESCAPE PARA OCULTAR PANEL Y DETALLES ---
  useEffect(() => {
    const controlarEscape = (event) => {
      if (event.key === 'Escape') {
        setActiveInsumo(null); // Oculta el panel lateral derecho de detalles
        setReclamoDraft(null); // Cierra el redactor si estaba a mitad de camino
        setAlertaHilo(null);   // Limpia popups de hilos
      }
    };
    window.addEventListener('keydown', controlarEscape);
    return () => window.removeEventListener('keydown', controlarEscape);
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

  const guardarConfigEnFirebase = async (nuevaConfig) => { setConfig(nuevaConfig); await setDoc(doc(db, "config", "general"), nuevaConfig); };

  const toggleFavorito = async (insumo) => { await updateDoc(doc(db, "insumos", insumo.id), { esFavorito: !insumo.favorito }); };

  const calcularFechaQuiebre = (dias) => {
    if (dias >= 999) return "Nunca";
    let fecha = new Date();
    let agregados = 0;
    while (agregados < Math.round(dias)) { 
      fecha.setDate(fecha.getDate() + 1);
      const esDom = fecha.getDay() === 0;
      const str = fecha.toISOString().split('T')[0]; const esFer = config.feriados?.includes(str); if (!esDom && !esFer) agregados++;
    }
    return fecha.toLocaleDateString('es-AR');
  };

  const getPlantillasDinamicas = () => {
    if (config.plantillasDinamicas && config.plantillasDinamicas.length > 0) return config.plantillasDinamicas;
    return [
      { id: 'comprasLeve', nombre: 'Seguimiento Normal', destino: 'compras', isNormal: true, isUrgente: false, isSolped: false, asunto: config.asuntos?.comprasLeve || "", cuerpo: config.plantillas?.comprasLeve || "" },
      { id: 'comprasGrave', nombre: 'Reclamo Urgente', destino: 'compras', isNormal: false, isUrgente: true, isSolped: false, asunto: config.asuntos?.comprasGrave || "", cuerpo: config.plantillas?.comprasGrave || "" }
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

    // NUEVO MOTOR 5: OCs a Futuro para Adelantar
    const ocsAdelantar = insumo.detalleOCs?.filter(oc => { 
      if (ocsIgnoradas.includes(oc.numero)) return false;
      const f = oc.fecha?.seconds ? new Date(oc.fecha.seconds * 1000) : new Date(oc.fecha); 
      const fCheck = new Date(f); fCheck.setHours(0,0,0,0); 
      return fCheck >= hoyCheck; // Busca las que NO están demoradas
    }).sort((a,b) => {
      const fa = a.fecha?.seconds ? a.fecha.seconds : new Date(a.fecha).getTime()/1000;
      const fb = b.fecha?.seconds ? b.fecha.seconds : new Date(b.fecha).getTime()/1000;
      return fa - fb; // Ordena de la más próxima a la más lejana
    }) || [];
    
    const listaOcsAdelantar = ocsAdelantar.length > 0 ? ocsAdelantar.map(oc => {
      const f = oc.fecha?.seconds ? new Date(oc.fecha.seconds * 1000) : new Date(oc.fecha);
      return `- OC ${oc.numero} (${formatoNum(oc.cantidad)} un.) | Ingreso Pautado: ${f.toLocaleDateString('es-AR')} | Adelantar para: ${fechaQ} | Resp: ${oc.comprador || 'SIN ASIGNAR'}`;
    }).join("\n") : "Sin OCs a futuro para adelantar";

    const solpedsD = insumo.detalleSolpeds || [];
    const listaSolpeds = solpedsD.length > 0 ? solpedsD.map(sp => `- S/P ${sp.numero} (${formatoNum(sp.cantidad)} un.)`).join("\n") : "Sin Solicitudes (S/P)";

    const procesar = (txt) => {
      if (!txt) return "";
      // Agregamos el replace de ocs_a_adelantar
      return txt.replace(/{nombre}/g, insumo.nombre || "").replace(/{codigo}/g, insumo.codigo || "").replace(/{dias}/g, dias >= 999 ? 'Infinitos' : dias).replace(/{fechaQuiebre}/g, fechaQ).replace(/{ocs}/g, listaOcs).replace(/{solpeds}/g, listaSolpeds).replace(/{ocs_a_adelantar}/g, listaOcsAdelantar);
    };
    return { asunto: procesar(template.asunto || "⚠️ Asunto vacío"), cuerpo: procesar(template.cuerpo || "⚠️ Cuerpo vacío"), destino: template.destino || "compras" };
  };

  const abrirRedactorReclamo = (insumoPulsado) => {
    const insumo = insumos.find(i => i.id === insumoPulsado.id) || insumoPulsado;
    const umbral = config?.umbralUrgencia || 15;
    const isGrave = Math.round(insumo.supervivencia) <= umbral;
    const hasSolpeds = insumo.sp > 0;
    const plantillas = getPlantillasDinamicas();
    
    let tInicial = null;
    if (!tInicial && hasSolpeds) tInicial = plantillas.find(p => p.isSolped);
    if (!tInicial && isGrave) tInicial = plantillas.find(p => p.isUrgente);
    if (!tInicial) tInicial = plantillas.find(p => p.isNormal);
    if (!tInicial) tInicial = plantillas[0];
    
    const { asunto, cuerpo, destino } = aplicarPlantilla(insumo, tInicial.id);
    const ticketActual = insumo.ticketReclamo || `TK-${Math.floor(1000 + Math.random() * 9000)}`;
    const asuntoConTicket = `${asunto} [${ticketActual}]`;

    let destinatariosMatch = [];
    if (insumo.owner && insumo.owner !== "Sin asignar") { // [cite: 194]
        const txtOwner = String(insumo.owner).trim().toLowerCase(); // [cite: 194]
        const contacto = (config.contactos || []).find(c => (c.alias && String(c.alias).trim().toLowerCase() === txtOwner) || (c.label && String(c.label).trim().toLowerCase() === txtOwner)); // [cite: 195]
        if (contacto && contacto.tipo === destino) destinatariosMatch.push(contacto.id); // 
    }

    setReclamoDraft({ 
      insumo, 
      destinatarios: destinatariosMatch, 
      asunto: asuntoConTicket, 
      cuerpo, 
      tipoPlantilla: tInicial.id, 
      tipoDestino: destino, 
      showDestinatarios: destinatariosMatch.length === 0,
      ticketBorrador: ticketActual
    });
  };

  const procesarGuardadoBD = async (draft) => {
    await addDoc(collection(db, "reclamos"), { 
      insumoId: draft.insumo.id, operario: currentUser.nombre, mensaje: draft.asunto, 
      cuerpoOriginal: draft.cuerpo, fecha: serverTimestamp(), estado: "ABIERTO", tipo: draft.tipoDestino 
    });
    let updates = {};
    updates.ticketReclamo = draft.ticketBorrador;
    await updateDoc(doc(db, "insumos", draft.insumo.id), updates);
  };

  const confirmarYGuardarReclamo = async (modoAccion = 'NUEVO') => {
    const correosDirectorio = reclamoDraft.destinatarios.map(id => config.contactos.find(c => c.id === id)?.email).filter(e => e);
    const correoManual = reclamoDraft.correoManual ? reclamoDraft.correoManual.trim() : "";
    const correosFinales = [...correosDirectorio];
    if (correoManual) correosFinales.push(correoManual);
    const correosStr = correosFinales.join(",");

    if (correosStr.length === 0 && modoAccion !== 'HILO') {
      setToastMsg("⚠️ Error: Seleccioná un destinatario antes de continuar.");
      setTimeout(() => setToastMsg(null), 4000);
      return;
    }

    const ejecutarFlujoNuevo = async () => {
      try {
        await procesarGuardadoBD(reclamoDraft);
        window.open(`https://mail.google.com/mail/?view=cm&fs=1&to=${correosStr}&su=${encodeURIComponent(reclamoDraft.asunto)}&body=${encodeURIComponent(reclamoDraft.cuerpo)}`, '_blank');
        setReclamoDraft(null);
        setToastMsg("✅ Reclamo nuevo registrado y Gmail abierto.");
        setTimeout(() => setToastMsg(null), 4000);
      } catch (error) {
        console.error("Error guardando reclamo:", error);
      }
    };

    if (modoAccion === 'HILO') {
      try {
        navigator.clipboard.writeText(reclamoDraft.cuerpo);
        await procesarGuardadoBD(reclamoDraft);
        window.open(`https://mail.google.com/mail/u/0/#search/"${reclamoDraft.ticketBorrador}"`, '_blank');
        setReclamoDraft(null);
        setToastMsg("✅ Texto copiado. Pegalo en la respuesta de Gmail.");
        setTimeout(() => setToastMsg(null), 5000);
      } catch (error) {
        console.error("Error en Hilo:", error);
      }
    } else {
      if (reclamoDraft.insumo.ticketReclamo) {
        setDialogoConfirmacion({
          titulo: "⚠️ Atención: Reclamo ya iniciado",
          mensaje: `Este material ya tiene un reclamo activo (${reclamoDraft.insumo.ticketReclamo}). Si enviás un correo nuevo, la conversación en Gmail se va a separar. Te sugerimos CANCELAR este cartel y presionar el botón "CONTINUAR HILO".`,
          textoConfirmar: "Forzar envío nuevo",
          colorBoton: "bg-red-500 hover:bg-red-600",
          onConfirm: ejecutarFlujoNuevo
        });
      } else {
        ejecutarFlujoNuevo();
      }
    }
  };

  const cerrarReclamoManual = async (reclamoId, e) => {
    if (e) e.stopPropagation();
    try {
      const reclamoObj = reclamos.find(r => r.id === reclamoId);
      await updateDoc(doc(db, "reclamos", reclamoId), { 
        estado: 'CERRADO',
        fechaCierre: serverTimestamp(),
        motivoCierre: 'Cierre manual por operario'
      });
      if (reclamoObj && reclamoObj.insumoId) {
         await updateDoc(doc(db, "insumos", reclamoObj.insumoId), { ticketReclamo: null });
      }
      setToastMsg("✅ Reclamo cerrado y pizarra limpia para futuros avisos.");
      setTimeout(() => setToastMsg(null), 4000);
    } catch (error) {
      console.error("Error táctico cerrando el reclamo:", error);
    }
  };

  const exportarBackupDB = () => {
    const data = JSON.stringify({ insumos: insumosRaw, reclamos: reclamosRaw, config }, null, 2);
    const blob = new Blob([data], { type: "application/json" }); const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = `Backup_ERP_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
  };

  const importarBackupDB = (e) => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = JSON.parse(event.target.result);
        if (data.config) await guardarConfigEnFirebase(data.config);
        if (data.reclamos) for (const r of data.reclamos) { const { id, ...rest } = r; await setDoc(doc(db, "reclamos", id), rest); }
        if (data.insumos) for (const i of data.insumos) { const { id, ...rest } = i; await setDoc(doc(db, "insumos", id), rest); }
        alert("¡Base de datos restaurada con éxito!");
      } catch (err) { alert("Error al leer el archivo JSON: Archivo corrupto o formato inválido."); }
    };
    reader.readAsText(file);
  };

  const insumosVivos = insumos.filter(i => !i.discontinuado);
  const resultadosBusqueda = insumosVivos.filter(i => i.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) || i.codigo?.toLowerCase().includes(searchTerm.toLowerCase()));
  const grupos = [...new Set(insumosVivos.map(item => item.grupo || 'SIN CLASIFICAR'))].sort((a, b) => a.localeCompare(b));
  const reclamosActivos = activeInsumo ? reclamos.filter(r => r.insumoId === activeInsumo.id) : [];

  // --- MOTOR DE FILTROS ACTUALIZADO A LAS 5 TARJETAS ---
  let datosAlerta = []; let tituloAlerta = "";
  const uUrgenciaApp = config?.umbralUrgencia !== undefined ? config.umbralUrgencia : 15;
  
  const hace10DiasApp = new Date();
  hace10DiasApp.setDate(new Date().getDate() - 10);
  
  const parsearFechaApp = (fRaw) => {
    if (!fRaw) return new Date(2100, 1, 1);
    if (fRaw.seconds) return new Date(fRaw.seconds * 1000);
    if (typeof fRaw === 'string' && fRaw.includes('/')) {
      const p = fRaw.split('/');
      if (p.length === 3) return new Date(p[2], p[1]-1, p[0]);
    }
    return new Date(fRaw);
  };

  if (filtroAlerta === 'favoritos') { 
    datosAlerta = insumosVivos.filter(i => i.favorito); 
    tituloAlerta = currentUser.rol === 'owner' ? "Todos los Favoritos" : "Mis Favoritos"; 
  } 
  else if (filtroAlerta === 'riesgo') { 
    datosAlerta = insumosVivos.filter(i => i.favorito && i.supervivencia <= uUrgenciaApp); 
    tituloAlerta = "Insumos en Riesgo Crítico"; 
  } 
  else if (filtroAlerta === 'ocs') { 
    datosAlerta = insumosVivos.filter(i => i.ocDemorada > 0); 
    tituloAlerta = "Órdenes de Compra Demoradas"; 
  } 
  else if (filtroAlerta === 'solpeds_viejas') {
    datosAlerta = insumosVivos.filter(ins => 
      (ins.detalleSolpeds || []).some(sp => {
        const fechaBase = sp.fechaCreacion || sp.fechaSolicitud || sp.fecha;
        if (!fechaBase) return false;
        return parsearFechaApp(fechaBase) < hace10DiasApp;
      })
    );
    tituloAlerta = "SOLPEDS Emitidas s/ OC (+10 Días)";
  }
  else if (filtroAlerta === 'tickets_abiertos') {
    const insumosConTicket = [...new Set(reclamos.filter(r => r.estado === 'ABIERTO').map(r => r.insumoId))];
    datosAlerta = insumosVivos.filter(i => insumosConTicket.includes(i.id));
    tituloAlerta = "Insumos con Reclamos Activos";
  }
  else if (filtroAlerta === 'todos') { 
    datosAlerta = insumosVivos; 
    tituloAlerta = "Inventario Completo"; 
  }
  
  if (currentUser.rol !== 'owner') {
    datosAlerta = datosAlerta.filter(i => i.owner?.toUpperCase().trim() === currentUser.aliasMatch);
  }

  useEffect(() => {
    const modoCierre = config?.modoCierreReclamos || 'manual';
    if (currentUser?.rol !== 'owner' || insumos.length === 0 || reclamos.length === 0) return;

    const procesarLimpieza = async () => {
      const reclamosAbiertos = reclamos.filter(r => r.estado === 'ABIERTO');
      const umbral = config?.umbralUrgencia || 15;

      for (const reclamo of reclamosAbiertos) {
        const insumo = insumos.find(i => i.id === reclamo.insumoId);
        if (!insumo || insumo.discontinuado || (modoCierre === 'auto' && insumo.supervivencia > umbral)) {
          try {
            await updateDoc(doc(db, "reclamos", reclamo.id), { 
              estado: 'CERRADO',
              fechaCierre: serverTimestamp(),
              motivoCierre: insumo?.discontinuado ? 'Auto-cierre: Insumo al sótano' : 'Auto-cierre: Stock regularizado'
            });
          } catch (e) { console.error("Error en auto-cierre:", e); }
        }
      }
    };
    procesarLimpieza();
  }, [insumos, reclamos, currentUser, config]);
  
  if (cargandoAuth) return <div className="min-h-screen flex items-center justify-center bg-slate-50 font-bold text-slate-500">Verificando credenciales...</div>;
  if (!usuarioLogueado) return <VistaLogin />;

  return (
    <div className="flex h-screen w-screen font-sans overflow-hidden bg-[#F8FAFC] text-slate-800">
      
      <aside className="w-20 bg-slate-900 flex flex-col items-center py-6 border-r border-slate-800 z-[60] shadow-2xl shrink-0 h-full relative">
        <div onClick={() => setShowWelcome(true)} className="w-12 h-12 bg-orange-500 rounded-xl flex items-center justify-center text-white shadow-lg mb-10 text-xl cursor-pointer hover:scale-105 transition-all">
          <Warehouse size={28} />
        </div>
        <nav className="flex flex-col gap-6 w-full px-3">
          <div onClick={() => setVistaActiva('gestion')} className={`p-3 rounded-xl flex justify-center cursor-pointer transition-all relative group ${vistaActiva === 'gestion' ? 'bg-slate-800 text-orange-500 shadow-inner border border-slate-700' : 'text-slate-500 hover:text-orange-400 hover:bg-slate-800'}`}><Brain size={22} /><span className="absolute left-16 bg-slate-800 text-white text-[10px] font-black px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity uppercase tracking-widest whitespace-nowrap z-50">Gestión ERP</span></div>
          <div onClick={() => setVistaActiva('auditoria')} className={`p-3 rounded-xl flex justify-center cursor-pointer transition-all relative group ${vistaActiva === 'auditoria' ? 'bg-slate-800 text-sky-500 shadow-inner border border-slate-700' : 'text-slate-500 hover:text-sky-400 hover:bg-slate-800'}`}><History size={22} /><span className="absolute left-16 bg-slate-800 text-white text-[10px] font-black px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity uppercase tracking-widest whitespace-nowrap z-50">Auditoría</span></div>
          {currentUser.rol === 'owner' && (
            <div onClick={() => setVistaActiva('archivados')} className={`p-3 rounded-xl flex justify-center cursor-pointer transition-all relative group ${vistaActiva === 'archivados' ? 'bg-slate-800 text-purple-400 shadow-inner border border-slate-700' : 'text-slate-500 hover:text-purple-400 hover:bg-slate-800'}`}>
              <Archive size={22} />
              <span className="absolute left-16 bg-slate-800 text-white text-[10px] font-black px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity uppercase tracking-widest whitespace-nowrap z-50">Insumos Ocultos</span>
            </div>
          )}
          <div onClick={() => setVistaActiva('notificaciones')} className={`p-3 rounded-xl flex justify-center cursor-pointer transition-all relative group ${vistaActiva === 'notificaciones' ? 'bg-slate-800 text-yellow-400 shadow-inner border border-slate-700' : 'text-slate-500 hover:text-yellow-400 hover:bg-slate-800'}`}>
          <div className="relative">
            <Bell size={22} />
            {(() => {
              const msjSinLeer = reclamos.filter(r => r.insumoId === "BROADCAST" && r.destinatarioId?.includes(String(currentUser.id)) && !(r.leidoPor || []).includes(currentUser.nombre)).length;
              if (msjSinLeer > 0) return <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full border-2 border-slate-900 shadow-[0_0_8px_rgba(239,68,68,0.8)]">{msjSinLeer}</span>;
              return null;
            })()}
          </div>
          <span className="absolute left-16 bg-slate-800 text-white text-[10px] font-black px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity uppercase tracking-widest whitespace-nowrap z-50">Notificaciones</span>
        </div>
        </nav>
        {currentUser.rol === 'owner' && currentUser.accesoAjustes !== false && (
          <div className="mt-auto w-full px-3 relative group">
            <div onClick={() => setShowSettings(true)} className="p-3 text-slate-500 hover:text-white hover:bg-slate-800 transition-all flex justify-center cursor-pointer rounded-xl w-full">
              <Settings size={22} />
              <span className="absolute left-16 top-2 bg-slate-800 text-white text-[10px] font-black px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity uppercase tracking-widest whitespace-nowrap z-50">Ajustes Generales</span>
            </div>
          </div>
        )}
      </aside>

      <div className="flex-1 flex flex-col h-full min-w-0 relative">
        <header className="h-20 flex items-center justify-between px-8 shrink-0 z-10 bg-white border-b border-slate-200 shadow-sm w-full">
          
          {/* POLO IZQUIERDO: TÍTULOS DINÁMICOS */}
          <div className="flex items-center gap-3 shrink-0 min-w-[200px]">
            {vistaActiva === 'gestion' && <><div className="p-2 bg-slate-800 rounded-lg shadow-sm"><Brain size={20} className="text-orange-500" /></div><h1 className="text-xl font-black text-slate-800 uppercase tracking-tight hidden lg:block">Gestión de Insumos</h1></>}
            {vistaActiva === 'auditoria' && <><div className="p-2 bg-slate-800 rounded-lg shadow-sm"><History size={20} className="text-sky-500" /></div><h1 className="text-xl font-black text-slate-800 uppercase tracking-tight hidden lg:block">Auditoría de Reclamos</h1></>}
            {vistaActiva === 'archivados' && <><div className="p-2 bg-slate-800 rounded-lg shadow-sm"><Archive size={20} className="text-purple-500" /></div><h1 className="text-xl font-black text-slate-800 uppercase tracking-tight hidden lg:block">Sótano de Insumos</h1></>}
            {vistaActiva === 'notificaciones' && <><div className="p-2 bg-slate-800 rounded-lg shadow-sm"><Bell size={20} className="text-yellow-500" /></div><h1 className="text-xl font-black text-slate-800 uppercase tracking-tight hidden lg:block">Notificaciones</h1></>}
          </div>

          {/* CENTRO: BUSCADOR GLOBAL MÁGICO */}
          <div className="flex-1 max-w-xl mx-6 hidden md:block">
            <div className="relative group">
              <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-orange-500 transition-colors" />
              <input
                type="text"
                placeholder="Buscar por código o material..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  if (e.target.value !== "" && vistaActiva !== 'gestion') {
                    setVistaActiva('gestion');
                  }
                }}
                className="w-full pl-12 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:bg-white focus:border-orange-400 focus:ring-4 focus:ring-orange-50 transition-all placeholder:text-slate-400 uppercase shadow-inner"
              />
              {searchTerm && (
                <button 
                  onClick={() => setSearchTerm("")} 
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 bg-slate-200/50 hover:bg-slate-200 p-1.5 rounded-lg transition-colors"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          {/* POLO DERECHO: RELOJ Y PERFIL DE USUARIO */}
          <div className="flex items-center justify-end gap-4 pl-6 border-l border-slate-200 shrink-0">
            <div className="mr-4 text-right hidden lg:block">
              <p className="text-[9px] font-black uppercase tracking-widest flex items-center gap-1 justify-end text-slate-400"><Clock size={10}/> ACTUALIZADO </p>
              <p className="text-xs font-bold text-slate-600">{ultimaAct ? formatearFecha(ultimaAct) : 'Esperando Script...'}</p>
            </div>
            
            {realUser.rol === 'owner' && currentUser.id !== realUser.id ? (
              <button 
                onClick={() => setSimulatedId('owner_real')}
                className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-[0_0_15px_rgba(239,68,68,0.4)] transition-all animate-pulse"
              >
                CONTROLANDO
              </button>
            ) : (
              <div className="flex items-center group p-2 rounded-xl border relative transition-all bg-slate-50 border-slate-200">
                <div className="text-right mr-3">
                  <p className={`text-[10px] font-bold uppercase tracking-widest ${currentUser.etiquetaRol === 'SUPERVISOR' ? 'text-sky-500' : 'text-slate-400'}`}>
                    {currentUser.etiquetaRol || currentUser.rol}
                  </p>
                  <p className="text-xs font-black text-slate-800">
                    {currentUser.nombre}
                  </p>
                </div>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black shadow-md ${currentUser.rol === 'owner' ? (currentUser.accesoAjustes === false ? 'bg-sky-500 text-white' : 'bg-orange-500 text-white') : 'bg-slate-700 text-white'}`}>{currentUser.inicial}</div>
              </div>
            )}
            
            <button 
              onClick={() => signOut(auth)} 
              className="ml-4 px-3 py-1.5 bg-red-100 text-red-600 hover:bg-red-200 rounded-lg text-xs font-bold uppercase tracking-widest transition-colors"
            >
              Salir
            </button>
          </div>

        </header>

        <main className="flex-1 overflow-auto relative bg-[#F8FAFC]">
          {vistaActiva === 'auditoria' && (
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
              setDialogoConfirmacion={setDialogoConfirmacion}
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
              contactos={config?.contactos || []}
              setToastMsg={setToastMsg}
            />
          )}

          {vistaActiva === 'archivados' && (
            <VistaArchivados 
              insumos={insumos}
              currentUser={currentUser}
              setToastMsg={setToastMsg}
              setDialogoConfirmacion={setDialogoConfirmacion}
            />
          )}
          
           {vistaActiva === 'gestion' && (
            <VistaGestion 
              currentUser={currentUser}
              insumos={insumosVivos}
              reclamos={reclamos}
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
              obtenerColorOwner={obtenerColorOwner}
              renderRadarDinamico={renderRadarDinamico}
              setSimulatedId={setSimulatedId}
              perfilesSimulables={perfilesSimulables}
              archivarInsumo={archivarInsumo}
              cerrarReclamoManual={cerrarReclamoManual}
              setDialogoConfirmacion={setDialogoConfirmacion}
              setVistaActiva={setVistaActiva}
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
            formatearFecha={formatearFecha}
            reclamosActivos={reclamosActivos}
            abrirRedactorReclamo={abrirRedactorReclamo}
            obtenerColorOwner={obtenerColorOwner}
            archivarInsumo={archivarInsumo}
            guardarNotaInterna={guardarNotaInterna}
          />
        )}
      </AnimatePresence>

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
                  onClick={async () => { 
                    await procesarGuardadoBD(alertaHilo.reclamoData);
                    window.open(alertaHilo.url, '_blank'); 
                    setAlertaHilo(null); 
                    setReclamoDraft(null); 
                    setToastMsg("✅ Reclamo sumado al hilo y registrado en auditoría.");
                    setTimeout(() => setToastMsg(null), 4000);
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
        {dialogoConfirmacion && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl border border-slate-200 p-6 text-center">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100">
                <AlertTriangle size={32} className="text-slate-400" />
              </div>
              <h3 className="text-slate-800 font-black text-lg mb-2 uppercase tracking-widest">{dialogoConfirmacion.titulo}</h3>
              <p className="text-slate-500 text-xs font-bold mb-8 px-2">{dialogoConfirmacion.mensaje}</p>
              <div className="flex gap-3">
                <button onClick={() => setDialogoConfirmacion(null)} className="flex-1 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest bg-slate-100 text-slate-500 hover:bg-slate-200 transition-all">Cancelar</button>
                <button onClick={() => { dialogoConfirmacion.onConfirm(); setDialogoConfirmacion(null);
                }} className={`flex-1 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest text-white transition-all shadow-md ${dialogoConfirmacion.colorBoton || 'bg-orange-500 hover:bg-orange-600'}`}>{dialogoConfirmacion.textoConfirmar || 'Aceptar'}</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      
    </div>
  );
};

export default App;
