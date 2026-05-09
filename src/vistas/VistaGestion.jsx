import React, { useState, useMemo } from 'react';
import { 
  LayoutDashboard, AlertTriangle, Star, Clock, Folder, ArrowLeft, 
  Activity, Bell, Users, ChevronRight, AlertCircle, CheckCircle, Package 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import TablaInsumos from '../componentes/TablaInsumos';

const formatoNum = (num) => Number(num).toLocaleString('es-AR');

const VistaGestion = ({
  currentUser,
  insumos,
  config,
  searchTerm,
  resultadosBusqueda,
  filtroAlerta,
  setFiltroAlerta,
  datosAlerta,
  tituloAlerta,
  selectedGroup,
  setSelectedGroup,
  grupos,
  filtroResponsable,
  filtroVistaLista,
  setFiltroVistaLista,
  filtroRiesgoGrupo,
  setFiltroRiesgoGrupo,
  setActiveInsumo,
  toggleFavorito,
  toggleVisibilidadPlanta,
  obtenerColorOwner,
  renderRadarDinamico
}) => {
  // --- ESTADO PARA EL MODO FOCO (RADIOGRAFÍA) ---
  const [operadorFoco, setOperadorFoco] = useState(null);

  // --- MOTOR ANALÍTICO ---
  const { 
    sanos, riesgo, quiebres, pctSanos, pctRiesgo, pctQuiebres, 
    operariosData, gruposAsignados, pctCobertura 
  } = useMemo(() => {
    const total = insumos.length;
    const q = insumos.filter(i => i.supervivencia <= 0).length;
    const r = insumos.filter(i => i.supervivencia > 0 && i.supervivencia <= 30).length;
    const s = total - q - r;

    // Mapeo de Operarios
    const opData = insumos.reduce((acc, ins) => {
      const owner = (ins.owner && ins.owner.trim() !== "") ? ins.owner : "SIN ASIGNAR";
      if (!acc[owner]) acc[owner] = { nombre: owner, insumos: 0, grupos: new Set(), quiebres: 0, riesgo: 0 };
      acc[owner].insumos += 1;
      if (ins.grupo) acc[owner].grupos.add(ins.grupo);
      if (ins.supervivencia <= 0) acc[owner].quiebres += 1;
      if (ins.supervivencia > 0 && ins.supervivencia <= 30) acc[owner].riesgo += 1;
      return acc;
    }, {});

    const totalGruposEsperados = 26;
    const asignados = new Set(insumos.filter(i => i.owner && i.owner.trim() !== "" && i.owner !== "SIN ASIGNAR").map(i => i.grupo)).size;

    return {
      sanos: s, riesgo: r, quiebres: q,
      pctSanos: total === 0 ? 0 : Math.round((s / total) * 100),
      pctRiesgo: total === 0 ? 0 : Math.round((r / total) * 100),
      pctQuiebres: total === 0 ? 0 : Math.round((q / total) * 100),
      operariosData: Object.values(opData),
      gruposAsignados: asignados,
      pctCobertura: Math.round((asignados / totalGruposEsperados) * 100)
    };
  }, [insumos]);

  // --- FILTRADO POR MODO FOCO ---
  const insumosFiltradosFoco = useMemo(() => {
    if (!operadorFoco) return insumos;
    if (operadorFoco === "SIN ASIGNAR") return insumos.filter(i => !i.owner || i.owner.trim() === "");
    return insumos.filter(i => i.owner === operadorFoco);
  }, [insumos, operadorFoco]);

  // Datos para la tabla inferior (respetando filtros de grupo/alerta)
  const datosParaTabla = useMemo(() => {
    let base = selectedGroup ? insumosFiltradosFoco.filter(i => i.grupo === selectedGroup) : insumosFiltradosFoco;
    if (filtroAlerta) base = base.filter(i => {
        if (filtroAlerta === 'quiebre') return i.supervivencia <= 0;
        if (filtroAlerta === 'riesgo') return i.supervivencia > 0 && i.supervivencia <= 30;
        return true;
    });
    return base;
  }, [insumosFiltradosFoco, selectedGroup, filtroAlerta]);

  return (
    <div className="p-4 md:p-6 h-full max-w-full">
      
      {/* 1. SECCIÓN ANALÍTICA (TABLERO SAAS) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        
        {/* COLUMNA IZQUIERDA: KPIs Y SALUD */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <Activity size={14}/> Salud Operativa {operadorFoco ? `- FOCO: ${operadorFoco}` : 'GLOBAL'}
              </h3>
              {operadorFoco && (
                <button 
                  onClick={() => setOperadorFoco(null)}
                  className="flex items-center gap-1 text-[10px] font-black uppercase text-orange-500 hover:text-orange-700 transition-all"
                >
                  <ArrowLeft size={12}/> Volver a Vista Integral
                </button>
              )}
            </div>
            
            <div className="w-full h-4 bg-slate-100 rounded-full overflow-hidden flex mb-6">
              <div style={{ width: `${pctSanos}%` }} className="h-full bg-emerald-500 transition-all duration-500"></div>
              <div style={{ width: `${pctRiesgo}%` }} className="h-full bg-yellow-400 transition-all duration-500"></div>
              <div style={{ width: `${pctQuiebres}%` }} className="h-full bg-red-500 transition-all duration-500"></div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-3xl font-black text-slate-800">{sanos}</p>
                <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest flex items-center gap-1">Sanos</p>
              </div>
              <div>
                <p className="text-3xl font-black text-slate-800">{riesgo}</p>
                <p className="text-[10px] font-bold text-yellow-500 uppercase tracking-widest flex items-center gap-1">Riesgo</p>
              </div>
              <div>
                <p className="text-3xl font-black text-slate-800">{quiebres}</p>
                <p className="text-[10px] font-bold text-red-500 uppercase tracking-widest flex items-center gap-1">Quiebres</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <AlertTriangle size={18} className="text-red-500 mb-2"/>
                <p className="text-2xl font-black text-slate-800">{quiebres}</p>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Sin Stock</p>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <Clock size={18} className="text-yellow-500 mb-2"/>
                <p className="text-2xl font-black text-slate-800">{riesgo}</p>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Riesgo Crítico</p>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <Bell size={18} className="text-orange-500 mb-2"/>
                <p className="text-2xl font-black text-slate-800">{insumosFiltradosFoco.filter(i => i.alertaPendiente).length}</p>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Alertas Planta</p>
            </div>
          </div>
        </div>

        {/* COLUMNA DERECHA: INTEGRIDAD Y EQUIPO */}
        <div className="space-y-6">
          <div className={`p-6 rounded-3xl border shadow-sm relative overflow-hidden transition-all ${pctCobertura >= 100 ? 'bg-emerald-600 border-emerald-700' : 'bg-red-600 border-red-700'}`}>
            <h3 className="text-[10px] font-black text-white/70 uppercase tracking-widest mb-1">Integridad Logística</h3>
            <p className="text-4xl font-black text-white mb-2">{pctCobertura}%</p>
            <p className="text-xs font-bold text-white/90">{gruposAsignados} / 26 Grupos Cubiertos</p>
            <div className="absolute top-0 right-0 -mr-4 -mt-4 w-24 h-24 bg-white/10 rounded-full blur-xl"></div>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Users size={14}/> Equipo (Modo Foco)
            </h3>
            <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1">
              {operariosData
                .filter(op => !operadorFoco || op.nombre === operadorFoco)
                .map(op => (
                  <button 
                    key={op.nombre}
                    onClick={() => setOperadorFoco(op.nombre)}
                    className={`w-full flex items-center justify-between p-3 rounded-2xl border transition-all group ${op.nombre === 'SIN ASIGNAR' ? 'bg-red-50 border-red-100 hover:bg-red-100' : 'bg-slate-50 border-slate-100 hover:border-orange-200 hover:bg-white'}`}
                  >
                    <div className="text-left">
                      <p className={`text-xs font-black uppercase tracking-widest ${op.nombre === 'SIN ASIGNAR' ? 'text-red-700' : 'text-slate-800'}`}>{op.nombre}</p>
                      <p className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">{op.grupos.size} Grupos | {op.insumos} Items</p>
                    </div>
                    <ChevronRight size={14} className="text-slate-300 group-hover:text-orange-500 transition-colors"/>
                  </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 2. TABLA Y LISTADO (RESPONDE AL FOCO) */}
      <AnimatePresence mode="wait">
        <motion.div 
          key={operadorFoco || 'integral'}
          initial={{ opacity: 0, y: 10 }} 
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden"
        >
          <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-white">
                <Package size={20}/>
              </div>
              <div>
                <h2 className="text-sm font-black uppercase tracking-tighter">Listado de Insumos</h2>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Mostrando {datosParaTabla.length} registros</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <select 
                value={selectedGroup} 
                onChange={(e) => setSelectedGroup(e.target.value)}
                className="text-[10px] font-black uppercase bg-white border border-slate-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-orange-500 outline-none"
              >
                <option value="">Todos los Grupos</option>
                {grupos.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
          </div>

          <TablaInsumos 
            datos={datosParaTabla} 
            config={config} 
            onGestionar={setActiveInsumo} 
            toggleFavorito={toggleFavorito} 
            toggleVisibilidadPlanta={toggleVisibilidadPlanta} 
            isOwner={currentUser.rol === 'owner'} 
            canEditFav={currentUser.rol === 'owner' || currentUser.editorFavoritos} 
            obtenerColorOwner={obtenerColorOwner}
          />
        </motion.div>
      </AnimatePresence>

    </div>
  );
};

export default VistaGestion;
