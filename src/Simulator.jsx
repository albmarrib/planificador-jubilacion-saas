import { useState, useMemo, useEffect, useRef } from 'react'
import { Plus, Trash2, TrendingDown, PiggyBank, Calculator, Table, Info, X, Settings, Save, Download, ExternalLink, LayoutDashboard, Briefcase, List, ArrowLeft, FileText } from 'lucide-react'
import { LineChart, Line, Legend, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, ComposedChart } from 'recharts'
import * as XLSX from 'xlsx'
import { projectRetirement, calculateRequiredReturn } from './calculationEngine'
import { addDoc, doc, setDoc, collection } from 'firebase/firestore'
import { db, auth } from './firebase'

export default function Simulator({ client, scenario, onBack }) {
  const [config, setConfig] = useState({
    retirementDate: '2030-12-16',
    pensionMonthly: 0,
    inflationRate: 2.0,
    rentInflationRate: 2.0,
    realEstateAppreciationRate: 2.0,
    currentAge: client?.age || 65,
    endAge: 85,
    generalTaxBrackets: [
      { limit: 12450, rate: 0.19 },
      { limit: 20200, rate: 0.24 },
      { limit: 35200, rate: 0.30 },
      { limit: 60000, rate: 0.37 },
      { limit: 300000, rate: 0.45 },
      { limit: 999999999, rate: 0.47 }
    ],
    savingsTaxBrackets: [
      { limit: 6000, rate: 0.19 },
      { limit: 50000, rate: 0.21 },
      { limit: 200000, rate: 0.23 },
      { limit: 300000, rate: 0.27 },
      { limit: 999999999, rate: 0.28 },
    ]
  })
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isGlobalModalOpen, setIsGlobalModalOpen] = useState(false)
  const [activeTab, setActiveTab] = useState('dashboard')

  const [desiredIncomeStages, setDesiredIncomeStages] = useState([
    { id: 1, startAge: client?.age || 65, endAge: 85, amount: 0 }
  ])

  const [savings, setSavings] = useState([])

  useEffect(() => {
    if (scenario && !scenario.isNew) {
      if (scenario.config) setConfig(scenario.config);
      if (scenario.desiredIncomeStages) setDesiredIncomeStages(scenario.desiredIncomeStages);
      if (scenario.savings) setSavings(scenario.savings);
    } else {
      setSavings([]);
      setConfig(prev => ({ ...prev, pensionMonthly: 0, currentAge: client?.age || 65 }));
      setDesiredIncomeStages([{ id: 1, startAge: client?.age || 65, endAge: 85, amount: 0 }]);
    }
  }, [scenario, client]);

  const handleConfigChange = (e) => {
    const { name, value } = e.target
    setConfig(prev => ({ ...prev, [name]: value }))
  }

  const handleSaveScenario = async () => {
    const scenarioName = window.prompt('Nombre de la simulación:', scenario?.name || 'Escenario Venta 2035');
    if (!scenarioName) return;

    try {
      const scenarioData = {
        name: scenarioName,
        config,
        desiredIncomeStages,
        savings,
        updatedAt: new Date().toISOString()
      };

      if (scenario?.id && !scenario.isNew) {
        // Update
        await setDoc(doc(db, `gestorias/${auth.currentUser.uid}/clientes/${client.id}/escenarios`, scenario.id), scenarioData, { merge: true });
        alert('Escenario actualizado');
      } else {
        // Create
        scenarioData.createdAt = new Date().toISOString();
        await addDoc(collection(db, `gestorias/${auth.currentUser.uid}/clientes/${client.id}/escenarios`), scenarioData);
        alert('Nuevo escenario guardado');
        if (onBack) onBack(); // Go back to reload scenarios
      }
    } catch (err) {
      console.error(err);
      alert('Error guardando: ' + err.message);
    }
  }

  const addIncomeStage = () => {
    setDesiredIncomeStages(prev => [
      ...prev,
      { id: Date.now(), startAge: 65, endAge: 85, amount: 2000 }
    ])
  }

  const updateIncomeStage = (id, field, value) => {
    setDesiredIncomeStages(prev => prev.map(s => s.id === id ? { ...s, [field]: Number(value) } : s))
  }

  const removeIncomeStage = (id) => {
    setDesiredIncomeStages(prev => prev.filter(s => s.id !== id))
  }

  const addSaving = () => {
    setSavings(prev => [
      ...prev,
      { id: Date.now(), name: 'Nueva línea', amount: 0, expectedReturn: 0, type: 'savings' }
    ])
  }

  const updateSaving = (id, field, value) => {
    setSavings(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s))
  }

  const removeSaving = (id) => {
    setSavings(prev => prev.filter(s => s.id !== id))
  }

  const updateBracket = (type, index, field, value) => {
    setConfig(prev => {
      const newBrackets = [...prev[type]];
      newBrackets[index] = { ...newBrackets[index], [field]: Number(value) };
      return { ...prev, [type]: newBrackets };
    });
  };

  const addBracket = (type) => {
    setConfig(prev => {
      const newBrackets = [...prev[type]];
      newBrackets.push({ limit: 0, rate: 0 });
      return { ...prev, [type]: newBrackets.sort((a,b) => a.limit - b.limit) };
    });
  };

  const removeBracket = (type, index) => {
    setConfig(prev => {
      const newBrackets = prev[type].filter((_, i) => i !== index);
      return { ...prev, [type]: newBrackets };
    });
  };

  const renderBracketEditor = (type, title, helpUrl) => {
    const brackets = config[type];
    return (
      <div className="mt-6">
        <div className="flex justify-between items-center mb-3">
          <label className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
            {title}
            {helpUrl && (
              <a href={helpUrl} target="_blank" rel="noopener noreferrer" className="text-primary-500 hover:text-primary-400" title="Consultar tramos oficiales en la Agencia Tributaria">
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </label>
          <button onClick={() => addBracket(type)} className="text-xs flex items-center gap-1 text-primary-400 hover:text-primary-300">
            <Plus className="w-3 h-3" /> Añadir Tramo
          </button>
        </div>
        <div className="space-y-2">
          {brackets.map((bracket, i) => (
            <div key={i} className="flex items-center gap-2 bg-slate-950 p-2 rounded-lg border border-slate-800">
              <span className="text-slate-500 text-xs w-10">Hasta</span>
              <div className="relative flex-1">
                <input 
                  type="number" 
                  value={bracket.limit >= 999999999 ? 999999999 : bracket.limit}
                  onChange={e => updateBracket(type, i, 'limit', e.target.value)}
                  className="w-full rounded border-slate-700 border p-1.5 text-xs outline-none bg-slate-900 text-white pr-6" 
                  title="Límite del tramo (€)"
                />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 text-xs">€</span>
              </div>
              <span className="text-slate-500 text-xs w-10 text-right">Tipo</span>
              <div className="relative w-24">
                <input 
                  type="number" 
                  step="0.1"
                  value={+(bracket.rate * 100).toFixed(2)}
                  onChange={e => updateBracket(type, i, 'rate', e.target.value / 100)}
                  className="w-full rounded border-slate-700 border p-1.5 text-xs outline-none bg-slate-900 text-white pr-6" 
                  title="Porcentaje (%)"
                />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 text-xs">%</span>
              </div>
              <button onClick={() => removeBracket(type, i)} className="p-1.5 text-slate-500 hover:text-red-400 rounded">
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
        <p className="text-[10px] text-slate-500 mt-2">
          * Nota: Para el último tramo (ilimitado), usa un límite alto como 999999999.
        </p>
      </div>
    );
  };


  const chartData = useMemo(() => {
    const year = parseInt(config.retirementDate.split('-')[0]) || new Date().getFullYear();
    
    // Transform limit back to Infinity if it was mapped to 999999999 for JSON UI
    const generalBrackets = config.generalTaxBrackets.map(b => ({...b, limit: b.limit >= 999999999 ? Infinity : b.limit}));
    const savingsBrackets = config.savingsTaxBrackets.map(b => ({...b, limit: b.limit >= 999999999 ? Infinity : b.limit}));

    return projectRetirement({
      retirementYear: year,
      currentAge: parseInt(config.currentAge) || 65,
      endAge: parseInt(config.endAge) || 85,
      pensionMonthly: parseFloat(config.pensionMonthly) || 0,
      desiredIncomeStages: desiredIncomeStages,
      inflationRate: parseFloat(config.inflationRate) || 0,
      rentInflationRate: parseFloat(config.rentInflationRate) || 0,
      realEstateAppreciationRate: parseFloat(config.realEstateAppreciationRate) || 0,
      generalTaxBrackets: generalBrackets,
      savingsTaxBrackets: savingsBrackets,
      savings: savings.map(s => ({
        ...s,
        amount: parseFloat(s.amount) || 0,
        expectedReturn: parseFloat(s.expectedReturn) || 0,
        type: s.type || 'savings'
      }))
    })
  }, [config, savings, desiredIncomeStages])

  const handleExportExcel = () => {
    if (!chartData || chartData.length === 0) return;
    
    const roundToTwo = (num) => Math.round((num + Number.EPSILON) * 100) / 100;

    // Mapear los datos de chartData al formato deseado para Excel, usando números puros y redondeados a 2 decimales
    const excelData = chartData.map(row => ({
      'Año': row.year,
      'Edad': row.age,
      'Ingreso Neto Real (Mes)': roundToTwo(row.realMonthlyIncome),
      'Ingresos Alquiler': roundToTwo(row.rentIncome),
      'Faltante a Cubrir': roundToTwo(row.gap),
      'Rescate Plan Pensiones': roundToTwo(row.withdrawnFromPension),
      'Rescate Fondos': roundToTwo(row.withdrawnFromSavings),
      'Impuestos Estimados': roundToTwo(row.estimatedTaxes),
      'Capital Restante': roundToTwo(row.totalCapital)
    }));

    // Crear la hoja y el libro
    const worksheet = XLSX.utils.json_to_sheet(excelData);
    
    // Aplicar formato de moneda nativo de Excel (símbolo de € y separador de miles)
    for (const key in worksheet) {
      if (!key.startsWith('!')) {
        const cell = worksheet[key];
        // Omitir columnas A (Año) y B (Edad) que son números normales
        if (typeof cell.v === 'number' && !key.startsWith('A') && !key.startsWith('B')) {
          cell.z = '#,##0.00 €';
        }
      }
    }

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Plan de Rescate");

    // Ajustar el ancho de las columnas
    const colWidths = [
      { wch: 8 },  // Año
      { wch: 8 },  // Edad
      { wch: 24 }, // Ingreso Neto Real (Mes)
      { wch: 20 }, // Ingresos Alquiler
      { wch: 20 }, // Faltante a Cubrir
      { wch: 25 }, // Rescate Plan Pensiones
      { wch: 20 }, // Rescate Fondos
      { wch: 22 }, // Impuestos Estimados
      { wch: 20 }  // Capital Restante
    ];
    worksheet['!cols'] = colWidths;

    // Generar el archivo y descargarlo
    XLSX.writeFile(workbook, `Plan_Rescate_Optimizado.xlsx`);
  }

  const handleGeneratePDF = () => {
    window.print();
  };

  const [requiredReturnResult, setRequiredReturnResult] = useState(null);

  useEffect(() => {
    setRequiredReturnResult(null);
  }, [config, savings, desiredIncomeStages]);

  const handleCalculateReturn = () => {
    if (requiredReturnResult !== null) {
      setRequiredReturnResult(null);
      return;
    }

    const year = parseInt(config.retirementDate.split('-')[0]) || new Date().getFullYear();
    const generalBrackets = config.generalTaxBrackets.map(b => ({...b, limit: b.limit >= 999999999 ? Infinity : b.limit}));
    const savingsBrackets = config.savingsTaxBrackets.map(b => ({...b, limit: b.limit >= 999999999 ? Infinity : b.limit}));

    const params = {
      retirementYear: year,
      currentAge: parseInt(config.currentAge) || 65,
      endAge: parseInt(config.endAge) || 85,
      pensionMonthly: parseFloat(config.pensionMonthly) || 0,
      desiredIncomeStages: desiredIncomeStages,
      inflationRate: parseFloat(config.inflationRate) || 0,
      rentInflationRate: parseFloat(config.rentInflationRate) || 0,
      realEstateAppreciationRate: parseFloat(config.realEstateAppreciationRate) || 0,
      generalTaxBrackets: generalBrackets,
      savingsTaxBrackets: savingsBrackets,
      savings: savings.map(s => ({
        ...s,
        amount: parseFloat(s.amount) || 0,
        expectedReturn: parseFloat(s.expectedReturn) || 0,
        type: s.type || 'savings'
      }))
    };

    const initialLiquidCapital = savings.reduce((acc, s) => acc + (s.type !== 'real_estate' ? (parseFloat(s.amount) || 0) : 0), 0);
    if (initialLiquidCapital <= 0) {
      setRequiredReturnResult('LIQUIDITY_CRISIS');
      return;
    }

    const result = calculateRequiredReturn(params);
    setRequiredReturnResult(result !== null ? result : 'IMPOSSIBLE');
  };

  const liquidityCrisisData = chartData.find(d => d.uncoveredDeficit > 0.01);
  const liquidityCrisisYear = liquidityCrisisData?.year;
  const currentTotalSavings = savings.reduce((acc, s) => acc + (parseFloat(s.amount) || 0), 0);
  const zeroCapitalYear = currentTotalSavings > 0 
    ? chartData.find(d => d.totalCapital <= 0)?.year 
    : (chartData.some(d => d.desiredIncome > 0 && d.uncoveredDeficit > 0.01) ? chartData[0]?.year : null);
  const hasError = Boolean(liquidityCrisisYear || zeroCapitalYear);

  const formatCurrency = (value) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(value);

  const initialLiquidCapital = savings.reduce((acc, s) => acc + (s.type !== 'real_estate' ? (parseFloat(s.amount) || 0) : 0), 0);
  const initialRealEstateCapital = savings.reduce((acc, s) => acc + (s.type === 'real_estate' ? (parseFloat(s.amount) || 0) : 0), 0);

  return (
    <div className="min-h-screen font-sans bg-slate-950 text-slate-200 selection:bg-primary-500/30 print:bg-white print:text-black">
      
      {/* =========================================================================
          SECCIÓN 1: INTERFAZ INTERACTIVA PARA PANTALLA (OCULTA EN IMPRESIÓN)
          ========================================================================= */}
      <div className="print:hidden px-4 pb-4 md:px-8 md:pb-8 pt-0">
        <div className="max-w-[1400px] mx-auto space-y-6">
          <header className="sticky top-0 z-40 bg-slate-950/95 backdrop-blur-sm border-b border-slate-800 pt-4 md:pt-8 pb-0 mb-6 -mx-4 md:-mx-8 px-4 md:px-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 pb-0">
              {/* Left side: Title + Tabs */}
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-4 flex-wrap">
                  <button 
                    onClick={onBack}
                    className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors flex-shrink-0"
                    title="Volver"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-3">
                    <Calculator className="w-7 h-7 text-primary-500" />
                    Planificador de Jubilación
                  </h1>
                  {client && (
                    <span className="px-3 py-1 bg-slate-800 text-primary-400 text-sm font-medium rounded-full border border-primary-900/50">
                      Cliente: {client.name}
                    </span>
                  )}
                  <div className="flex gap-2">
                    <button 
                      onClick={() => setIsGlobalModalOpen(true)}
                      className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-full transition-colors flex-shrink-0"
                      title="Ajustes Globales"
                    >
                      <Settings className="w-5 h-5" />
                    </button>
                    <button 
                      onClick={() => setIsModalOpen(true)}
                      className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-full transition-colors flex-shrink-0"
                      title="Documentación Técnica"
                    >
                      <Info className="w-5 h-5" />
                    </button>
                  </div>
                </div>
                
                {/* Tabs Navigation now integrated in header to save vertical space */}
                <div className="flex space-x-1 mt-2">
                  <button 
                    onClick={() => setActiveTab('dashboard')}
                    className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-all rounded-t-lg border-x border-t border-b-2 ${activeTab === 'dashboard' ? 'text-primary-400 border-slate-700 border-b-primary-500 bg-slate-900 drop-shadow-[0_0_8px_rgba(56,189,248,0.3)]' : 'text-slate-400 border-slate-800 border-b-transparent bg-slate-950 hover:text-slate-200 hover:bg-slate-900'}`}
                  >
                    <LayoutDashboard className="w-4 h-4" /> Panel de Control
                  </button>
                  <button 
                    onClick={() => setActiveTab('assets')}
                    className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-all rounded-t-lg border-x border-t border-b-2 ${activeTab === 'assets' ? 'text-primary-400 border-slate-700 border-b-primary-500 bg-slate-900 drop-shadow-[0_0_8px_rgba(56,189,248,0.3)]' : 'text-slate-400 border-slate-800 border-b-transparent bg-slate-950 hover:text-slate-200 hover:bg-slate-900'}`}
                  >
                    <Briefcase className="w-4 h-4" /> Mi Patrimonio
                  </button>
                  <button 
                    onClick={() => setActiveTab('plan')}
                    className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-all rounded-t-lg border-x border-t border-b-2 ${activeTab === 'plan' ? 'text-primary-400 border-slate-700 border-b-primary-500 bg-slate-900 drop-shadow-[0_0_8px_rgba(56,189,248,0.3)]' : 'text-slate-400 border-slate-800 border-b-transparent bg-slate-950 hover:text-slate-200 hover:bg-slate-900'}`}
                  >
                    <List className="w-4 h-4" /> Plan de Rescate
                  </button>
                </div>
              </div>

              {/* Right side: Save/Load + Patrimonio */}
              <div className="flex flex-col items-end gap-3 pb-3">
                <div className="flex items-center gap-2">
                  <button 
                    onClick={handleGeneratePDF}
                    className="flex items-center gap-1.5 text-xs bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 px-3 py-1.5 rounded-lg transition-colors font-medium"
                    title="Generar Expediente PDF para el cliente"
                  >
                    <FileText className="w-3.5 h-3.5" /> Informe PDF
                  </button>
                  <button onClick={handleSaveScenario} className="flex items-center gap-2 text-xs bg-blue-600/20 text-blue-400 px-3 py-1.5 rounded-lg hover:bg-blue-600/30 transition-colors">
                    <Save className="w-3.5 h-3.5" /> Guardar Escenario
                  </button>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-0.5">Patrimonio Inicial</p>
                  <p className="text-2xl font-bold text-white leading-none">{formatCurrency(currentTotalSavings)}</p>
                </div>
              </div>
            </div>
          </header>

          {/* TOP ROW: Config (1 col) + Chart (2 cols) */}
          {activeTab === 'dashboard' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Panel de Configuración */}
          <div className="lg:col-span-1 bg-slate-900 p-6 rounded-2xl shadow-xl border border-slate-800 print:hidden">
            <h2 className="text-lg font-semibold mb-5 flex items-center gap-2 text-white">
              <TrendingDown className="w-5 h-5 text-primary-500" />
              Parámetros Globales
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-1">
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Edad Jubilación</label>
                <input 
                  type="number" 
                  name="currentAge"
                  value={config.currentAge}
                  onChange={handleConfigChange}
                  className="w-full rounded-lg border-slate-700 border p-2.5 text-sm outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all bg-slate-950 text-white" 
                />
              </div>
              <div className="col-span-1">
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Esp. Vida</label>
                <input 
                  type="number" 
                  name="endAge"
                  value={config.endAge}
                  onChange={handleConfigChange}
                  className="w-full rounded-lg border-slate-700 border p-2.5 text-sm outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all bg-slate-950 text-white" 
                />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Fecha de Jubilación</label>
                <input 
                  type="date" 
                  name="retirementDate"
                  value={config.retirementDate}
                  onChange={handleConfigChange}
                  className="w-full rounded-lg border-slate-700 border p-2.5 text-sm outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all bg-slate-950 text-white" 
                />
              </div>
              <div className="col-span-2">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Pensión Pública Estimada (Bruta / Mes)
                  </label>
                  <a 
                    href="https://sede-tu.seg-social.gob.es/wps/myportal/tussR/tuss/TrabajoPensiones/JubilacionCalculo/!ut/p/z1/pZHBaoNAEIafJQePcWaNWdvejIZsFBvFSsxeipatEawG17a0T98lIQRKsxUyt12-n-H7BzjkwNvio66Koe7aolHvHafPj8RdEpZivHoKPExYQLPQW5PUp7DVApQCH5PHK-PiuPw1IHPG5R3iW4ShFW8y28bECVlixyHBiNy23z_5a_S2wLUrIvoPQM-ArsMjoJEMgFdNV54O7rbl7K4C3otX0YvefO_V934YDvLBQAM_LVOKaiq7l7poTCEN_Cu07-QA-W8Wdqou5-KySSPlco8MA29hYYTHPrXA4S1Tk2O9nvLya_Y9dyeTHz9vHEE!/#Z7_N1AE1HS0POSMC0Q90H0JCB20M0" 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="text-xs text-primary-400 hover:text-primary-300 flex items-center gap-1 transition-colors"
                    title="Consultar estimación oficial en el simulador de la Seguridad Social"
                  >
                    <span>Simulador Seg. Social</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <input 
                  type="number" 
                  name="pensionMonthly"
                  value={config.pensionMonthly}
                  onChange={handleConfigChange}
                  className="w-full rounded-lg border-slate-700 border p-2.5 text-sm outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all bg-slate-950 text-white" 
                />
                <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed flex items-start gap-1.5">
                  <Info className="w-3.5 h-3.5 text-primary-400 shrink-0 mt-0.5" />
                  <span>
                    Introduce el importe bruto en 14 pagas, tal como lo indica el{' '}
                    <a 
                      href="https://sede-tu.seg-social.gob.es/wps/myportal/tussR/tuss/TrabajoPensiones/JubilacionCalculo/!ut/p/z1/pZHBaoNAEIafJQePcWaNWdvejIZsFBvFSsxeipatEawG17a0T98lIQRKsxUyt12-n-H7BzjkwNvio66Koe7aolHvHafPj8RdEpZivHoKPExYQLPQW5PUp7DVApQCH5PHK-PiuPw1IHPG5R3iW4ShFW8y28bECVlixyHBiNy23z_5a_S2wLUrIvoPQM-ArsMjoJEMgFdNV54O7rbl7K4C3otX0YvefO_V934YDvLBQAM_LVOKaiq7l7poTCEN_Cu07-QA-W8Wdqou5-KySSPlco8MA29hYYTHPrXA4S1Tk2O9nvLya_Y9dyeTHz9vHEE!/#Z7_N1AE1HS0POSMC0Q90H0JCB20M0"
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-primary-400 hover:underline inline-flex items-center gap-0.5"
                    >
                      simulador de la Seguridad Social
                    </a>.
                  </span>
                </p>
              </div>
            </div>

            <div className="mt-6">
              <div className="flex justify-between items-center mb-3">
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">Tramos de Vida (Ingreso Mensual)</label>
                <button onClick={addIncomeStage} className="text-xs flex items-center gap-1 text-primary-400 hover:text-primary-300">
                  <Plus className="w-3 h-3" /> Añadir
                </button>
              </div>
              <div className="space-y-2">
                {desiredIncomeStages.map(stage => (
                  <div key={stage.id} className="flex items-center gap-2 bg-slate-950 p-2 rounded-lg border border-slate-800">
                    <input 
                      type="number" 
                      value={stage.startAge}
                      onChange={e => updateIncomeStage(stage.id, 'startAge', e.target.value)}
                      className="w-16 rounded border-slate-700 border p-1.5 text-xs outline-none bg-slate-900 text-white text-center" 
                      title="Edad Inicio"
                    />
                    <span className="text-slate-500 text-xs">-</span>
                    <input 
                      type="number" 
                      value={stage.endAge}
                      onChange={e => updateIncomeStage(stage.id, 'endAge', e.target.value)}
                      className="w-16 rounded border-slate-700 border p-1.5 text-xs outline-none bg-slate-900 text-white text-center" 
                      title="Edad Fin"
                    />
                    <input 
                      type="number" 
                      value={stage.amount}
                      onChange={e => updateIncomeStage(stage.id, 'amount', e.target.value)}
                      className="flex-1 rounded border-slate-700 border p-1.5 text-xs outline-none bg-slate-900 text-white" 
                      title="Ingreso Mensual"
                    />
                    <button onClick={() => removeIncomeStage(stage.id)} className="p-1.5 text-slate-500 hover:text-red-400 rounded">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Gráfica principal */}
          <div className="lg:col-span-2 space-y-6 print:w-full print:space-y-6">
            {(currentTotalSavings > 0 || (config.pensionMonthly || 0) > 0 || desiredIncomeStages.some(s => (s.amount || 0) > 0)) && (
              <div className={`p-5 rounded-2xl shadow-xl border print:hidden ${hasError ? 'bg-red-950/30 border-red-900/50' : 'bg-emerald-950/30 border-emerald-900/50'}`}>
                {liquidityCrisisYear && liquidityCrisisData?.capitalIliquido > 0 ? (
                  <div>
                    <h3 className="text-lg font-semibold text-red-400 flex items-center gap-2">🚨 Bloqueo de Liquidez (Inicia en Año {liquidityCrisisYear})</h3>
                    <p className="text-red-300 mt-1">Tus ahorros líquidos se han agotado. Posees patrimonio inmovilizado, pero sufres un desfase de tesorería y no puedes pagar el día a día hasta que lo vendas.</p>
                  </div>
                ) : liquidityCrisisYear || zeroCapitalYear ? (
                  <div>
                    <h3 className="text-lg font-semibold text-red-400 flex items-center gap-2">🚨 Quiebra Patrimonial (Año {liquidityCrisisYear || zeroCapitalYear})</h3>
                    <p className="text-red-300 mt-1">Tu capital se ha agotado por completo. La inflación y tus gastos han superado la rentabilidad de tus ahorros. Necesitas reducir urgentemente el 'Ingreso Deseado' en tus tramos de vida para hacer viable este escenario.</p>
                  </div>
                ) : (
                  <div>
                    <h3 className="text-lg font-semibold text-emerald-400 flex items-center gap-2">✅ Proyección Sostenible</h3>
                    <p className="text-emerald-300 mt-1">El patrimonio cubre la esperanza de vida hasta los {config.endAge} años sin agotarse.</p>
                  </div>
                )}
              </div>
            )}

            <div className="mt-4">
              <button 
                onClick={handleCalculateReturn}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold transition-colors shadow-lg flex items-center justify-center gap-2"
              >
                <Calculator className="w-5 h-5" />
                Robo-Advisor: Calcular Rentabilidad Necesaria
              </button>

              {requiredReturnResult !== null && (
                <div className="mt-4 p-5 bg-slate-900 border border-slate-700 rounded-xl shadow-inner animate-in fade-in slide-in-from-top-2 duration-300">
                  <h4 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
                    {hasError ? '💡 Objetivo de Inversión' : '💡 Margen de Seguridad'}
                  </h4>
                  {requiredReturnResult === 'LIQUIDITY_CRISIS' ? (
                    <div className="p-4 bg-red-950/50 border border-red-800 rounded-lg">
                      <h5 className="font-semibold text-red-400 mb-1">💡 Diagnóstico: Sin capital líquido inicial.</h5>
                      <p className="text-red-300 text-sm whitespace-pre-wrap">No se puede calcular un % de rentabilidad sobre 0€. Para sobrevivir los primeros años hasta que vendas tu patrimonio inmovilizado, tus únicas opciones son: adelantar la venta, aportar efectivo inicial, o pedir financiación (ej. Hipoteca Inversa).</p>
                    </div>
                  ) : requiredReturnResult === 'IMPOSSIBLE' ? (
                    <p className="text-red-400">Ni siquiera con una rentabilidad sostenida del 15% anual lograrías evitar agotar el capital. Necesitas reducir el gasto, retrasar la jubilación o aumentar el capital inicial.</p>
                  ) : requiredReturnResult === 0 ? (
                    <p className="text-emerald-400">¡Tu capital es suficiente incluso con un 0% de rentabilidad en tus cuentas/fondos!</p>
                  ) : (
                    <>
                      {hasError ? (
                        <p className="text-slate-300 mb-4">
                          Para que tu dinero dure hasta los {config.endAge} años sin agotarse y sin quiebras de liquidez, necesitas alcanzar una rentabilidad media anual del <strong className="text-xl text-white">{requiredReturnResult}%</strong> en tus inversiones líquidas (Cuentas/Fondos).
                        </p>
                      ) : (
                        <p className="text-emerald-300 mb-4">
                          ¡Tu configuración actual ya es sostenible! El mínimo absoluto que necesitarías promediar en tus activos líquidos para no descapitalizarte es un <strong className="text-xl text-white">{requiredReturnResult}%</strong>. (Esto significa que podrías permitirte reducir el riesgo de tu cartera).
                        </p>
                      )}
                      
                      <div className="space-y-2">
                        <p className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Perfil de Riesgo Requerido:</p>
                        {requiredReturnResult < 3 ? (
                          <div className="p-3 bg-emerald-950/50 border border-emerald-800 rounded-lg flex items-center gap-3">
                            <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse shrink-0"></div>
                            <p className="text-emerald-300 font-medium flex-1">
                              Conservador (Depósitos, Bonos, Letras del Tesoro)
                              <a href="https://www.cnmv.es/portal/Inversor/Fondos-Inversion-Renta-Fija.aspx" target="_blank" rel="noopener noreferrer" className="inline-flex items-center ml-2 text-emerald-400 hover:text-emerald-200 hover:underline" title="Saber más en la CNMV">
                                <ExternalLink className="w-3 h-3 ml-1" />
                              </a>
                            </p>
                          </div>
                        ) : requiredReturnResult <= 6 ? (
                          <div className="p-3 bg-yellow-950/50 border border-yellow-800 rounded-lg flex items-center gap-3">
                            <div className="w-3 h-3 rounded-full bg-yellow-500 animate-pulse shrink-0"></div>
                            <p className="text-yellow-300 font-medium flex-1">
                              Moderado (Cartera Mixta 60/40, Indexados Globales)
                              <a href="https://www.cnmv.es/portal/Inversor/Fondos-Inversion-Mixtos.aspx" target="_blank" rel="noopener noreferrer" className="inline-flex items-center ml-2 text-yellow-400 hover:text-yellow-200 hover:underline" title="Saber más en la CNMV">
                                <ExternalLink className="w-3 h-3 ml-1" />
                              </a>
                            </p>
                          </div>
                        ) : requiredReturnResult <= 9 ? (
                          <div className="p-3 bg-orange-950/50 border border-orange-800 rounded-lg flex items-center gap-3">
                            <div className="w-3 h-3 rounded-full bg-orange-500 animate-pulse shrink-0"></div>
                            <p className="text-orange-300 font-medium flex-1">
                              Arriesgado (100% Renta Variable, ETFs S&P 500 / Nasdaq)
                              <a href="https://www.cnmv.es/portal/Inversor/Fondos-Inversion-Renta-Variable.aspx" target="_blank" rel="noopener noreferrer" className="inline-flex items-center ml-2 text-orange-400 hover:text-orange-200 hover:underline" title="Saber más en la CNMV">
                                <ExternalLink className="w-3 h-3 ml-1" />
                              </a>
                            </p>
                          </div>
                        ) : (
                          <div className="p-3 bg-red-950/50 border border-red-800 rounded-lg flex items-center gap-3">
                            <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse shrink-0"></div>
                            <p className="text-red-300 font-medium flex-1">Peligro Irreal (Altísimo riesgo. Estrategia no recomendable para jubilación)</p>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* PRIMER GRÁFICO: Evolución del Patrimonio */}
            <div 
              id="patrimonio-chart" 
              className="bg-slate-900 print:bg-white print:border-slate-300 print:shadow-none p-6 rounded-2xl shadow-xl border border-slate-800 h-[430px] print:h-[300px] print:w-full flex flex-col print:break-inside-avoid print:mb-6"
            >
              <h2 className="text-lg font-semibold mb-6 text-white print:text-slate-900">
                Evolución del Patrimonio
              </h2>
              <div className="flex-1 min-h-0 w-full h-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 20, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#cbd5e1" strokeOpacity={0.4} />
                    <XAxis 
                      dataKey="year" 
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#64748b' }}
                      dy={10}
                    />
                    <YAxis 
                      tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`} 
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#64748b' }}
                      dx={-10}
                    />
                    <Tooltip 
                      formatter={(value, name) => [formatCurrency(value), name === 'capitalLiquido' ? 'Patrimonio Líquido' : name === 'capitalIliquido' ? 'Patrimonio Inmobiliario' : 'Total']}
                      labelFormatter={(label) => `Año ${label}`}
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', color: '#fff' }}
                      itemStyle={{ color: '#60a5fa' }}
                    />
                    <Legend verticalAlign="top" height={36} wrapperStyle={{ paddingBottom: '10px' }} />
                    <ReferenceLine y={0} stroke="#ef4444" strokeDasharray="3 3" />
                    <Line 
                      type="monotone" 
                      dataKey="capitalLiquido" 
                      name="Liquidez (Gastable)" 
                      stroke="#2563eb" 
                      strokeWidth={3.5} 
                      dot={false} 
                      isAnimationActive={false}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="capitalIliquido" 
                      name="Ladrillo (Inmovilizado)" 
                      stroke="#64748b" 
                      strokeWidth={2} 
                      strokeDasharray="5 5" 
                      dot={false} 
                      isAnimationActive={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* SEGUNDO GRÁFICO: Flujo de Caja y Nivel de Vida Mensual */}
            <div 
              id="cashflow-chart" 
              className="bg-slate-900 print:bg-white print:border-slate-300 print:shadow-none p-6 rounded-2xl shadow-xl border border-slate-800 h-[430px] print:h-[300px] print:w-full flex flex-col print:break-inside-avoid print:mb-6"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-6">
                <div>
                  <h2 className="text-lg font-semibold text-white print:text-slate-900">
                    Evolución de tu Nivel de Vida Mensual
                  </h2>
                  <p className="text-xs mt-0.5 text-slate-400 print:text-slate-600">
                    Ingreso neto deseado vs. flujo de caja neto real disponible
                  </p>
                </div>
              </div>
              <div className="flex-1 min-h-0 w-full h-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 20, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#cbd5e1" strokeOpacity={0.4} />
                    <XAxis 
                      dataKey="year" 
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#64748b' }}
                      dy={10}
                    />
                    <YAxis 
                      tickFormatter={(value) => `${value >= 1000 ? (value / 1000).toFixed(1) + 'k' : value}€`} 
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#64748b' }}
                      dx={-10}
                    />
                    <Tooltip 
                      formatter={(value, name) => [
                        formatCurrency(value), 
                        name === 'desiredMonthlyIncome' ? 'Ingreso Deseado (Mes)' : 'Ingreso Real Disponible (Mes)'
                      ]}
                      labelFormatter={(label) => `Año ${label}`}
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', color: '#fff' }}
                    />
                    <Legend verticalAlign="top" height={36} wrapperStyle={{ paddingBottom: '10px' }} />
                    <Line 
                      type="monotone" 
                      dataKey="desiredMonthlyIncome" 
                      name="Ingreso Deseado (Mes)" 
                      stroke="#dc2626" 
                      strokeWidth={2} 
                      strokeDasharray="5 5" 
                      dot={false} 
                      isAnimationActive={false}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="realMonthlyIncome" 
                      name="Ingreso Real Disponible (Mes)" 
                      stroke="#059669" 
                      strokeWidth={3} 
                      dot={false} 
                      isAnimationActive={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
        )}

        {/* MIDDLE ROW: Savings Cards Grid */}
        <div className={`bg-slate-900 p-6 rounded-2xl shadow-xl border border-slate-800 print:hidden ${activeTab === 'assets' ? 'block' : 'hidden'}`}>
          <div className="flex justify-between items-center mb-6 py-4 px-2 -mx-2 border-b border-slate-800">
            <h2 className="text-xl font-semibold flex items-center gap-2 text-white">
              <PiggyBank className="w-5 h-5 text-primary-500" />
              Cartera de Activos
            </h2>
            <button 
              onClick={addSaving}
              className="px-4 py-2 bg-primary-600 hover:bg-primary-500 text-white rounded-lg transition-colors shadow-sm flex items-center gap-2 text-sm font-medium"
            >
              <Plus className="w-4 h-4" /> Añadir Activo
            </button>
          </div>

          {savings.length === 0 ? (
            <div className="text-sm text-slate-500 text-center py-10 bg-slate-950 rounded-xl border border-dashed border-slate-800">
              No hay activos registrados en la cartera.
            </div>
          ) : (
            <div className="columns-1 md:columns-2 xl:columns-3 gap-6 space-y-6">
              {savings.map(saving => (
                <div key={saving.id} className="break-inside-avoid p-5 bg-slate-950/50 hover:bg-slate-950 rounded-2xl border border-slate-800 relative group hover:border-slate-700 transition-all duration-300 shadow-sm hover:shadow-xl">
                  <button 
                    onClick={() => removeSaving(saving.id)}
                    className="absolute top-3 right-3 p-1.5 text-slate-500 hover:bg-red-950 hover:text-red-400 rounded-md opacity-0 group-hover:opacity-100 transition-all"
                    title="Eliminar activo"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  
                  <div className="space-y-4">
                    <div className="space-y-3">
                      <input 
                        type="text" 
                        value={saving.name}
                        onChange={(e) => updateSaving(saving.id, 'name', e.target.value)}
                        className="w-[calc(100%-24px)] bg-transparent font-semibold text-white text-lg outline-none placeholder:text-slate-600 border-b border-transparent focus:border-primary-500 transition-colors"
                        placeholder="Nombre del activo"
                      />
                      
                      <div className="flex items-center">
                        <select
                          value={saving.type || 'savings'}
                          onChange={(e) => updateSaving(saving.id, 'type', e.target.value)}
                          className="text-xs font-medium rounded-full border border-slate-700 py-1.5 px-3 bg-slate-900 text-slate-300 outline-none focus:ring-2 focus:ring-primary-500/50 appearance-none cursor-pointer transition-colors"
                        >
                          <option value="savings">💰 Fondos / Acciones / Cuentas</option>
                          <option value="pension_plan">🛡️ Plan de Pensiones</option>
                          <option value="real_estate">🏠 Inmueble</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-800/50">
                      <div>
                        <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">
                          {saving.type === 'real_estate' ? 'Valor Actual' : 'Importe Actual'}
                        </label>
                        <input 
                          type="number" 
                          value={saving.amount}
                          onChange={(e) => updateSaving(saving.id, 'amount', e.target.value)}
                          className="w-full rounded-lg border-slate-700 border p-2 text-sm outline-none focus:ring-2 focus:ring-primary-500/50 bg-slate-900 text-white"
                        />
                      </div>
                      
                      {saving.type === 'real_estate' ? (
                        <>
                          <div>
                            <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">Precio Adquisición</label>
                            <input 
                              type="number" 
                              value={saving.acquisitionPrice || ''}
                              onChange={(e) => updateSaving(saving.id, 'acquisitionPrice', e.target.value)}
                              className="w-full rounded-lg border-slate-700 border p-2 text-sm outline-none focus:ring-2 focus:ring-primary-500/50 bg-slate-900 text-white"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">Año Venta (Opcional)</label>
                            <input 
                              type="number" 
                              value={saving.expectedSaleYear || ''}
                              onChange={(e) => updateSaving(saving.id, 'expectedSaleYear', e.target.value)}
                              className="w-full rounded-lg border-slate-700 border p-2 text-sm outline-none focus:ring-2 focus:ring-primary-500/50 bg-slate-900 text-white"
                            />
                          </div>
                          <div className="flex items-center gap-2 col-span-2 pt-1">
                            <input 
                              type="checkbox" 
                              checked={saving.isPrimaryResidence || false}
                              onChange={(e) => updateSaving(saving.id, 'isPrimaryResidence', e.target.checked)}
                              className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-primary-500 focus:ring-primary-500/50 accent-primary-500"
                            />
                            <label className="text-xs text-slate-400 cursor-pointer" onClick={() => updateSaving(saving.id, 'isPrimaryResidence', !saving.isPrimaryResidence)}>
                              Es vivienda habitual (&ge; 65 exento)
                            </label>
                            <div className="relative group/info flex items-center ml-1">
                              <Info className="w-3.5 h-3.5 text-slate-500 cursor-help" />
                              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-slate-800 text-xs text-slate-200 rounded-lg shadow-2xl border border-slate-700 opacity-0 group-hover/info:opacity-100 transition-opacity pointer-events-none z-50">
                                En España, si vendes tu vivienda habitual siendo mayor de 65 años, la ganancia patrimonial está totalmente exenta de tributar en el IRPF. Si es una segunda residencia o inmueble de inversión, tributarás entre un 19% y 28% por la ganancia obtenida.
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 col-span-2 pt-1">
                            <input 
                              type="checkbox" 
                              checked={saving.isRented || false}
                              onChange={(e) => updateSaving(saving.id, 'isRented', e.target.checked)}
                              className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-primary-500 focus:ring-primary-500/50 accent-primary-500"
                            />
                            <label className="text-xs text-slate-400 cursor-pointer" onClick={() => updateSaving(saving.id, 'isRented', !saving.isRented)}>
                              Está Alquilado
                            </label>
                          </div>
                          {saving.isRented && (
                            <>
                              <div>
                                <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">Alquiler Bruto/Mes</label>
                                <input 
                                  type="number" 
                                  value={saving.grossMonthlyRent || ''}
                                  onChange={(e) => updateSaving(saving.id, 'grossMonthlyRent', e.target.value)}
                                  className="w-full rounded-lg border-slate-700 border p-2 text-sm outline-none focus:ring-2 focus:ring-primary-500/50 bg-slate-900 text-white"
                                />
                              </div>
                              <div>
                                <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">% Gastos Anuales</label>
                                <input 
                                  type="number" 
                                  value={saving.expensePercentage ?? 20}
                                  onChange={(e) => updateSaving(saving.id, 'expensePercentage', e.target.value)}
                                  className="w-full rounded-lg border-slate-700 border p-2 text-sm outline-none focus:ring-2 focus:ring-primary-500/50 bg-slate-900 text-white"
                                />
                              </div>
                            </>
                          )}
                        </>
                      ) : (
                        <div>
                          <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">Rentabilidad Anual Bruta</label>
                          <div className="relative">
                            <input 
                              type="number" 
                              step="0.1"
                              value={saving.expectedReturn}
                              onChange={(e) => updateSaving(saving.id, 'expectedReturn', e.target.value)}
                              className="w-full rounded-lg border-slate-700 border p-2 text-sm outline-none focus:ring-2 focus:ring-primary-500/50 bg-slate-900 text-white pr-7"
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">%</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* BOTTOM ROW: Rescue Plan Table (Pantalla interactiva) */}
        {activeTab === 'plan' && (
          <div className="bg-slate-900 p-6 rounded-2xl shadow-xl border border-slate-800">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 pb-4 border-b border-slate-800">
              <div>
                <h2 className="text-xl font-semibold flex items-center gap-2 text-white">
                  <Table className="w-5 h-5 text-primary-500" />
                  Plan de Rescate Optimizado
                </h2>
                <p className="text-slate-400 text-sm mt-1">
                  Desglose anual priorizando retiros de Planes de Pensiones hasta el límite óptimo del tramo de IRPF.
                </p>
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                <button 
                  onClick={handleExportExcel}
                  className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 hover:border-slate-600 px-4 py-2 rounded-lg font-medium text-sm transition-colors whitespace-nowrap"
                >
                  <Download className="w-4 h-4" />
                  Exportar Excel
                </button>
                <button 
                  onClick={handleGeneratePDF}
                  className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-950/40 border border-emerald-500 px-4 py-2 rounded-lg font-medium text-sm transition-all whitespace-nowrap"
                >
                  <FileText className="w-4 h-4" />
                  Generar Informe PDF
                </button>
              </div>
            </div>
            
            <div className="w-full overflow-x-auto">
              <table className="w-full text-left text-sm table-fixed border-collapse">
                <thead className="bg-slate-950 text-slate-400 font-semibold uppercase text-xs tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="py-3.5 px-3 text-left w-[11%]">Año (Edad)</th>
                    <th className="py-3.5 px-3 text-right text-emerald-400 w-[14%]">Ingreso Neto Real (Mes)</th>
                    <th className="py-3.5 px-3 text-right w-[11%]">Alquileres</th>
                    <th className="py-3.5 px-3 text-right w-[12%]">Faltante</th>
                    <th className="py-3.5 px-3 text-right text-emerald-400 w-[13%]">Plan Pensiones</th>
                    <th className="py-3.5 px-3 text-right text-blue-400 w-[12%]">Fondos</th>
                    <th className="py-3.5 px-3 text-right text-red-400 w-[12%]">Impuestos</th>
                    <th className="py-3.5 px-3 text-right w-[15%]">Capital Restante</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50 text-slate-300">
                  {chartData.map((row) => (
                    <tr key={row.year} className="hover:bg-slate-800/50">
                      <td className="py-3 px-3 font-medium text-white whitespace-nowrap">
                        {row.year} <span className="text-slate-500 font-normal">({row.age}a)</span>
                      </td>
                      <td className={`py-3 px-3 text-right font-bold tabular-nums whitespace-nowrap ${row.uncoveredDeficit > 0.01 ? 'text-amber-400' : 'text-emerald-400'}`}>
                        {formatCurrency(row.realMonthlyIncome)}
                      </td>
                      <td className="py-3 px-3 text-right text-purple-400 font-medium tabular-nums whitespace-nowrap">
                        {row.rentIncome > 0 ? formatCurrency(row.rentIncome) : <span className="text-slate-600">-</span>}
                      </td>
                      <td className={`py-3 px-3 text-right tabular-nums whitespace-nowrap ${row.uncoveredDeficit > 0.01 ? 'text-red-500 font-bold' : 'text-slate-400'}`}>
                        {formatCurrency(row.gap)}
                      </td>
                      <td className="py-3 px-3 text-right tabular-nums whitespace-nowrap">
                        {row.withdrawnFromPension > 0 ? (
                          <span className="text-emerald-400 font-medium">{formatCurrency(row.withdrawnFromPension)}</span>
                        ) : (
                          <span className="text-slate-600">-</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right tabular-nums whitespace-nowrap">
                        {row.withdrawnFromSavings > 0 ? (
                          <span className="text-blue-400 font-medium">{formatCurrency(row.withdrawnFromSavings)}</span>
                        ) : (
                          <span className="text-slate-600">-</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right tabular-nums whitespace-nowrap">
                        {row.estimatedTaxes > 0 ? (
                          <span className="text-red-400">{formatCurrency(row.estimatedTaxes)}</span>
                        ) : (
                          <span className="text-slate-600">-</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right font-semibold text-white tabular-nums whitespace-nowrap">
                        {row.totalCapital > 0 ? formatCurrency(row.totalCapital) : <span className="text-red-500 font-bold">Agotado</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    </div>

    {/* =========================================================================
        SECCIÓN 2: EXPEDIENTE OFICIAL DE JUBILACIÓN (EXCLUSIVO IMPRESIÓN A4 / PDF)
        Totalmente independiente de la pantalla y de los tabs activos.
        Renderizado con SVG de dimensiones fijas (sin ResponsiveContainer).
        ========================================================================= */}
    <div className="hidden print:block w-full max-w-[210mm] mx-auto text-slate-900 bg-white font-sans text-xs">
      
      {/* PÁGINA 1: PORTADA, RESUMEN EJECUTIVO Y GRÁFICOS */}
      <div className="p-6">
        {/* Encabezado Profesional */}
        <div className="flex justify-between items-start border-b-2 border-slate-900 pb-4 mb-4">
          <div>
            <p className="text-[10px] tracking-widest font-black uppercase text-blue-700 mb-1">
              INFORME TÉCNICO DE PLANIFICACIÓN PATRIMONIAL
            </p>
            <h1 className="text-2xl font-black text-slate-950 tracking-tight leading-tight">
              Estudio de Viabilidad y Optimización Fiscal para la Jubilación
            </h1>
            <p className="text-xs text-slate-600 mt-1">
              Estrategia de Rescate de Activos, Sostenibilidad Financiera y Eficiencia en IRPF
            </p>
          </div>
          <div className="text-right text-[11px] text-slate-600 bg-slate-50 border border-slate-200 rounded-lg p-2.5 min-w-[210px] shrink-0">
            <p><strong className="text-slate-900">Cliente:</strong> {client?.name || 'Cliente Particular'}</p>
            {client?.dni && <p><strong className="text-slate-900">NIF/DNI:</strong> {client.dni}</p>}
            <p><strong className="text-slate-900">Fecha Emisión:</strong> {new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
            <p className="text-blue-700 font-semibold mt-1">Expediente Oficial</p>
          </div>
        </div>

        {/* Resumen Ejecutivo (Radiografía Inicial en 4 KPI Cards) */}
        <div className="grid grid-cols-4 gap-3 mb-4">
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
            <span className="block text-[10px] uppercase font-bold text-slate-500">Edad Jubilación</span>
            <span className="text-base font-black text-slate-900">{config.currentAge} años</span>
            <span className="block text-[10px] text-slate-500">Esp. Vida: {config.endAge} años</span>
          </div>
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
            <span className="block text-[10px] uppercase font-bold text-slate-500">Pensión Estimada</span>
            <span className="text-base font-black text-slate-900">{formatCurrency(config.pensionMonthly)}</span>
            <span className="block text-[10px] text-slate-500">Bruto / mes (14 pagas)</span>
          </div>
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
            <span className="block text-[10px] uppercase font-bold text-slate-500">Ingreso Objetivo</span>
            <span className="text-base font-black text-emerald-700">{formatCurrency(desiredIncomeStages[0]?.amount || 0)}</span>
            <span className="block text-[10px] text-slate-500">Neto / mes (IPC {config.inflationRate}%)</span>
          </div>
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
            <span className="block text-[10px] uppercase font-bold text-slate-500">Patrimonio Inicial</span>
            <span className="text-base font-black text-blue-700">{formatCurrency(currentTotalSavings)}</span>
            <span className="block text-[10px] text-slate-500">Líq: {formatCurrency(initialLiquidCapital)}</span>
          </div>
        </div>

        {/* Dictamen de Viabilidad Patrimonial */}
        <div className="mb-4">
          {hasError ? (
            <div className="p-3 bg-red-50 border border-red-300 rounded-lg">
              <p className="font-bold text-red-800 text-xs uppercase tracking-wide">
                ⚠️ Dictamen: Riesgo de Agotamiento de Liquidez
              </p>
              <p className="text-[11px] text-red-700 mt-0.5 leading-relaxed">
                El patrimonio líquido disponible para rescate se agota en el año <strong>{zeroCapitalYear || liquidityCrisisYear}</strong> (edad: {config.currentAge + ((zeroCapitalYear || liquidityCrisisYear) - new Date().getFullYear())} años).
                {requiredReturnResult ? ` Para cubrir el 100% del nivel de vida proyectado sin reducir el gasto, la cartera requeriría una rentabilidad anualizada del ${requiredReturnResult}%.` : ''}
              </p>
            </div>
          ) : (
            <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-lg">
              <p className="font-bold text-emerald-800 text-xs uppercase tracking-wide">
                ✓ Dictamen: Planificación Patrimonialmente Sostenible
              </p>
              <p className="text-[11px] text-emerald-700 mt-0.5 leading-relaxed">
                El patrimonio acumulado y las rentas proyectadas cubren la totalidad del nivel de vida deseado durante todo el horizonte vital (hasta los {config.endAge} años).
              </p>
            </div>
          )}
        </div>

        {/* GRÁFICO 1: EVOLUCIÓN DEL PATRIMONIO (VECTORIAL DIRECTO, SIN RESPONSIVECONTAINER) */}
        <div className="mb-4 border border-slate-200 rounded-lg p-2.5 bg-white">
          <h2 className="text-[11px] font-bold text-slate-900 uppercase tracking-wider mb-1.5">
            1. Evolución del Patrimonio Acumulado (€)
          </h2>
          <div className="w-full flex justify-center">
            <LineChart width={710} height={205} data={chartData} margin={{ top: 8, right: 15, left: 5, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="year" tickLine={false} tick={{ fill: '#475569', fontSize: 10 }} />
              <YAxis tickFormatter={(val) => `${(val / 1000).toFixed(0)}k`} tickLine={false} tick={{ fill: '#475569', fontSize: 10 }} />
              <Legend verticalAlign="top" height={24} wrapperStyle={{ fontSize: '10px' }} />
              <ReferenceLine y={0} stroke="#dc2626" strokeDasharray="3 3" />
              <Line type="monotone" dataKey="capitalLiquido" name="Patrimonio Líquido (Gastable)" stroke="#2563eb" strokeWidth={2.5} dot={false} isAnimationActive={false} />
              <Line type="monotone" dataKey="capitalIliquido" name="Inmobiliario (Inmovilizado)" stroke="#64748b" strokeWidth={1.5} strokeDasharray="4 4" dot={false} isAnimationActive={false} />
            </LineChart>
          </div>
        </div>

        {/* GRÁFICO 2: FLUJO DE CAJA Y NIVEL DE VIDA (VECTORIAL DIRECTO, SIN RESPONSIVECONTAINER) */}
        <div className="border border-slate-200 rounded-lg p-2.5 bg-white">
          <h2 className="text-[11px] font-bold text-slate-900 uppercase tracking-wider mb-1.5">
            2. Nivel de Vida Mensual (Ingreso Deseado vs. Real Disponible €/mes)
          </h2>
          <div className="w-full flex justify-center">
            <LineChart width={710} height={205} data={chartData} margin={{ top: 8, right: 15, left: 5, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="year" tickLine={false} tick={{ fill: '#475569', fontSize: 10 }} />
              <YAxis tickFormatter={(val) => `${val >= 1000 ? (val / 1000).toFixed(1) + 'k' : val}€`} tickLine={false} tick={{ fill: '#475569', fontSize: 10 }} />
              <Legend verticalAlign="top" height={24} wrapperStyle={{ fontSize: '10px' }} />
              <Line type="monotone" dataKey="desiredMonthlyIncome" name="Ingreso Deseado Objetivo (Mes)" stroke="#dc2626" strokeWidth={2} strokeDasharray="4 4" dot={false} isAnimationActive={false} />
              <Line type="monotone" dataKey="realMonthlyIncome" name="Ingreso Real Disponible (Mes)" stroke="#059669" strokeWidth={2.5} dot={false} isAnimationActive={false} />
            </LineChart>
          </div>
        </div>
      </div>

      {/* PÁGINA 2: PLAN DE RESCATE ANUAL (SALTO DE PÁGINA LIMPIO) */}
      <div className="p-6 break-before-page">
        <div className="border-b-2 border-slate-900 pb-3 mb-4">
          <h2 className="text-base font-black text-slate-950 uppercase tracking-wide">
            3. Desglose Anual del Plan de Rescate Optimizado
          </h2>
          <p className="text-[11px] text-slate-600 mt-0.5">
            Cronograma de rescates anuales optimizando entre rentas del trabajo (planes de pensiones) y base del ahorro (fondos de inversión) para minimizar el impacto en el IRPF.
          </p>
        </div>

        <table className="w-full text-left text-[10px] table-fixed border-collapse border border-slate-300">
          <thead className="bg-slate-100 text-slate-900 font-bold border-b-2 border-slate-300">
            <tr>
              <th className="py-2 px-2 text-left w-[11%]">Año (Edad)</th>
              <th className="py-2 px-2 text-right w-[14%]">Ingreso Real (Mes)</th>
              <th className="py-2 px-2 text-right w-[11%]">Alquileres</th>
              <th className="py-2 px-2 text-right w-[12%]">Faltante</th>
              <th className="py-2 px-2 text-right w-[13%]">Plan Pensiones</th>
              <th className="py-2 px-2 text-right w-[12%]">Fondos</th>
              <th className="py-2 px-2 text-right w-[12%]">Impuestos</th>
              <th className="py-2 px-2 text-right w-[15%]">Capital Restante</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {chartData.map((row) => (
              <tr key={row.year} className="break-inside-avoid">
                <td className="py-1.5 px-2 font-medium text-slate-950">
                  {row.year} <span className="text-slate-500">({row.age}a)</span>
                </td>
                <td className={`py-1.5 px-2 text-right font-bold tabular-nums ${row.uncoveredDeficit > 0.01 ? 'text-amber-700' : 'text-emerald-700'}`}>
                  {formatCurrency(row.realMonthlyIncome)}
                </td>
                <td className="py-1.5 px-2 text-right tabular-nums text-purple-700 font-medium">
                  {row.rentIncome > 0 ? formatCurrency(row.rentIncome) : '-'}
                </td>
                <td className={`py-1.5 px-2 text-right tabular-nums ${row.uncoveredDeficit > 0.01 ? 'text-red-600 font-bold' : 'text-slate-600'}`}>
                  {formatCurrency(row.gap)}
                </td>
                <td className="py-1.5 px-2 text-right tabular-nums text-emerald-700 font-medium">
                  {row.withdrawnFromPension > 0 ? formatCurrency(row.withdrawnFromPension) : '-'}
                </td>
                <td className="py-1.5 px-2 text-right tabular-nums text-blue-700 font-medium">
                  {row.withdrawnFromSavings > 0 ? formatCurrency(row.withdrawnFromSavings) : '-'}
                </td>
                <td className="py-1.5 px-2 text-right tabular-nums text-red-700">
                  {row.estimatedTaxes > 0 ? formatCurrency(row.estimatedTaxes) : '-'}
                </td>
                <td className="py-1.5 px-2 text-right font-bold tabular-nums text-slate-950">
                  {row.totalCapital > 0 ? formatCurrency(row.totalCapital) : <span className="text-red-600 font-extrabold">Agotado</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* ANEXO METODOLÓGICO */}
        <div className="mt-6 pt-4 border-t-2 border-slate-300 break-inside-avoid space-y-3">
          <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
            Anexo Metodológico y Cláusulas Informativas
          </h3>
          <div className="grid grid-cols-3 gap-3">
            <div className="p-2.5 bg-slate-50 border border-slate-200 rounded">
              <h4 className="font-bold text-slate-900 text-[10px] mb-0.5">1. Optimización Fiscal Progresiva</h4>
              <p className="text-[9px] text-slate-600 leading-relaxed">
                El algoritmo prioriza el rescate de fondos de inversión frente a planes de pensiones para evitar saltos en la base general del IRPF.
              </p>
            </div>
            <div className="p-2.5 bg-slate-50 border border-slate-200 rounded">
              <h4 className="font-bold text-slate-900 text-[10px] mb-0.5">2. Corrección por Inflación (IPC)</h4>
              <p className="text-[9px] text-slate-600 leading-relaxed">
                El nivel de vida y las rentas se indexan al {config.inflationRate}% acumulativo para preservar el poder adquisitivo real durante toda la jubilación.
              </p>
            </div>
            <div className="p-2.5 bg-slate-50 border border-slate-200 rounded">
              <h4 className="font-bold text-slate-900 text-[10px] mb-0.5">3. Riesgo de Liquidez ("House Rich")</h4>
              <p className="text-[9px] text-slate-600 leading-relaxed">
                El patrimonio inmovilizado en inmuebles no proporciona liquidez directa si no se enajena antes de que se agote el capital financiero.
              </p>
            </div>
          </div>
          <p className="text-[8px] text-slate-400 italic pt-1 border-t border-slate-200 leading-tight">
            Aviso Legal: Informe de simulación orientativa calculado con los parámetros facilitados por el cliente y la normativa fiscal vigente. No constituye recomendación vinculante de inversión. Rentabilidades pasadas no garantizan rendimientos futuros.
          </p>
        </div>
      </div>
    </div>

      {isGlobalModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 print:hidden">
          <div className="bg-slate-900 rounded-2xl border border-slate-700 shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/50 sticky top-0">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Settings className="w-6 h-6 text-primary-500" />
                Ajustes Globales (Macro y Legal)
              </h2>
              <button 
                onClick={() => setIsGlobalModalOpen(false)}
                className="p-2 text-slate-400 hover:bg-slate-800 hover:text-white rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto space-y-6">
              
              <div className="bg-blue-950/30 border border-blue-900/50 rounded-xl p-4 flex gap-3">
                <Info className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                <div className="text-sm">
                  <strong className="text-blue-300 block mb-1">Revisión Anual Recomendada</strong>
                  <p className="text-blue-200/70">
                    Las leyes fiscales y los datos macroeconómicos cambian anualmente. Para que las proyecciones sean fiables, asegúrate de actualizar el IPC y los tramos de IRPF al menos una vez al año (p.ej. tras la publicación de los Presupuestos Generales del Estado). 
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex flex-col justify-between h-full">
                  <label className="flex items-start gap-2 text-[11px] lg:text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    <span>Inflación IPC (%)</span>
                    <a href="https://www.ine.es/dyngs/INEbase/es/categoria.htm?c=Estadistica_P&cid=1254735976607" target="_blank" rel="noopener noreferrer" className="text-primary-500 hover:text-primary-400 shrink-0" title="Consultar IPC en el INE">
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </label>
                  <input 
                    type="number" step="0.1" name="inflationRate" value={config.inflationRate} onChange={handleConfigChange}
                    className="w-full rounded-lg border-slate-700 border p-2.5 text-sm bg-slate-950 text-white outline-none focus:border-primary-500" 
                  />
                </div>
                <div className="flex flex-col justify-between h-full">
                  <label className="flex items-start gap-2 text-[11px] lg:text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    <span>Inflación Alquileres (%)</span>
                    <a href="https://serpavi.mivau.gob.es/" target="_blank" rel="noopener noreferrer" className="text-primary-500 hover:text-primary-400 shrink-0" title="Consultar Sistema Estatal de Referencia (SERPAVI)">
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </label>
                  <input 
                    type="number" step="0.1" name="rentInflationRate" value={config.rentInflationRate} onChange={handleConfigChange}
                    className="w-full rounded-lg border-slate-700 border p-2.5 text-sm bg-slate-950 text-white outline-none focus:border-primary-500" 
                  />
                </div>
                <div className="flex flex-col justify-between h-full">
                  <label className="flex items-start gap-2 text-[11px] lg:text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    <span>Revalorización Inmob. (%)</span>
                    <a href="https://www.ine.es/prensa/ipv_prensa.htm" target="_blank" rel="noopener noreferrer" className="text-primary-500 hover:text-primary-400 shrink-0" title="Consultar IPV oficial en el INE">
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </label>
                  <input 
                    type="number" step="0.1" name="realEstateAppreciationRate" value={config.realEstateAppreciationRate} onChange={handleConfigChange}
                    className="w-full rounded-lg border-slate-700 border p-2.5 text-sm bg-slate-950 text-white outline-none focus:border-primary-500" 
                  />
                </div>
              </div>
              
              {renderBracketEditor('generalTaxBrackets', 'Tramos IRPF (Base General)', 'https://sede.agenciatributaria.gob.es/')}
              {renderBracketEditor('savingsTaxBrackets', 'Tramos IRPF (Base Ahorro)', 'https://sede.agenciatributaria.gob.es/')}

            </div>
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 print:hidden">
          <div className="bg-slate-900 rounded-2xl border border-slate-700 shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/50 sticky top-0">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Info className="w-6 h-6 text-primary-500" />
                Documentación Técnica
              </h2>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-2 text-slate-400 hover:bg-slate-800 hover:text-white rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto space-y-6 text-slate-300 text-sm leading-relaxed">
              <p className="text-base text-white">
                <strong>Documento Técnico y Fiscal: Algoritmo de Optimización de Descapitalización en Jubilación</strong>
              </p>
              <p>
                <strong>Propósito del Sistema:</strong> Proyectar la viabilidad del patrimonio de un individuo a lo largo de su esperanza de vida, aplicando reglas dinámicas de inflación, interés compuesto y una estrategia de extracción algorítmica que minimiza el impacto en el Impuesto sobre la Renta de las Personas Físicas (IRPF) según la legislación española vigente.
              </p>

              <div>
                <h3 className="text-lg font-semibold text-white mb-2">1. Parametrización Legal y Macroeconómica (Modal de Ajustes Globales)</h3>
                <p>El sistema no opera con variables legales fijas en el código (hardcodeadas), garantizando su perpetuidad y adaptabilidad ante cambios legislativos. Todos los cálculos beben de un "Estado Global" que el usuario o administrador configura a través de un panel dedicado:</p>
                <ul className="list-disc pl-5 mt-2 space-y-1">
                  <li><strong className="text-slate-100">Tramos IRPF (Base General):</strong> Array de tramos progresivos (Rendimientos del Trabajo y Capital Inmobiliario). Ej: 19% hasta 12.450€, 24% hasta 20.200€, etc.</li>
                  <li><strong className="text-slate-100">Tramos IRPF (Base del Ahorro):</strong> Array de tramos para Ganancias Patrimoniales y Rendimientos del Capital Mobiliario. Ej: 19% hasta 6.000€, 21% hasta 50.000€, 23% hasta 200.000€, etc.</li>
                  <li><strong className="text-slate-100">Topes y Límites:</strong> Pensión máxima estatal anual.</li>
                  <li><strong className="text-slate-100">Variables Macroeconómicas:</strong> Inflación general (IPC estimado), Inflación específica para el límite de actualización de rentas de alquileres, y tasa de Revalorización Inmobiliaria Anual (IPV).</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-white mb-2">2. Necesidades de Capital y "Tramos de Vida" (La Sonrisa del Gasto)</h3>
                <p>El modelo asume que el gasto durante la jubilación no es lineal. El algoritmo procesa un array de "Tramos de Vida" definidos por el usuario (ej. de 65 a 75 años: 4.000€/mes; de 76 a 85 años: 2.500€/mes).</p>
                <ul className="list-disc pl-5 mt-2 space-y-1">
                  <li><strong className="text-slate-100">Indexación (Fórmula de Mantenimiento de Poder Adquisitivo):</strong> En cada ciclo anual ($t$), el ingreso deseado mensual ($I_d$) y la pensión pública ($P$) se incrementan exponencialmente según el IPC estimado ($i$).<br/>
                    <code className="text-xs bg-slate-800 p-1 rounded">I_d(t) = I_d(t-1) * (1 + i)</code><br/>
                    <code className="text-xs bg-slate-800 p-1 rounded mt-1 inline-block">P(t) = P(t-1) * (1 + i)</code>
                  </li>
                  <li><strong className="text-slate-100">Déficit Neto a Cubrir ($D$):</strong> Diferencia requerida de los ahorros para alcanzar el estilo de vida deseado. Se calcula como el Ingreso Deseado Neto Anual menos la Pensión Neta Anual (obtenida tras aplicar el IRPF correspondiente de la Base General a la Pensión Bruta anual en 14 pagas).</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-white mb-2">3. Módulo Inmobiliario Avanzado: Rentas, Apreciación y Enajenaciones</h3>
                <p>El sistema clasifica los activos inmobiliarios como ilíquidos pero potencialmente generadores de flujo de caja y ganancias de capital a largo plazo.</p>
                <div className="mt-3">
                  <h4 className="font-semibold text-slate-100">A. Rentas de Alquiler (Rendimientos del Capital Inmobiliario)</h4>
                  <p className="mt-1">Para los inmuebles marcados en régimen de arrendamiento, el sistema realiza la siguiente depuración antes de sumar el capital:</p>
                  <ul className="list-disc pl-5 mt-2 space-y-1">
                    <li><strong className="text-slate-100">Flujo de Caja Neto:</strong> El alquiler bruto se somete a una deducción por gastos deducibles estructurales (IBI, seguros, comunidad), parametrizable por el usuario (estándar 20%-30%).</li>
                    <li><strong className="text-slate-100">Impacto Fiscal (Integración en Base General):</strong> Esta renta neta anual se suma inexcusablemente a la Pensión Pública. Actúa minorando el Déficit Bruto ($D$), pero eleva la tributación del individuo en la Base Imponible General, reduciendo el margen disponible para rescatar Planes de Pensiones de forma óptima.</li>
                    <li><strong className="text-slate-100">Actualización de Rentas:</strong> La renta bruta se actualiza anualmente utilizando la variable separada "Inflación Alquileres" del panel global.</li>
                  </ul>
                </div>
                <div className="mt-3">
                  <h4 className="font-semibold text-slate-100">B. Evento de Enajenación y Revalorización (Venta de Inmuebles)</h4>
                  <p className="mt-1">El motor inyecta el "Valor Actual" del inmueble como capital líquido en el año programado para su venta.</p>
                  <ul className="list-disc pl-5 mt-2 space-y-1">
                    <li><strong className="text-slate-100">Apreciación por Interés Compuesto:</strong> Antes del evento de venta, el valor del inmueble no permanece estático. El motor aplica un interés compuesto anual basado en la "Revalorización Inmobiliaria Anual" configurada (desacoplada del IPC general). Esto proyecta un precio de venta futuro realista y evita subestimar la base imponible.</li>
                    <li><strong className="text-slate-100">Tributación por Plusvalías:</strong> Para segundas residencias o ventas previas a los 65 años, se calcula la Ganancia Patrimonial (Valor Proyectado de Venta - Precio de Adquisición). Dado que la ley actual no permite coeficientes de actualización, este importe se integra automáticamente en la Base Imponible del Ahorro del ejercicio de venta, liquidándose los impuestos según la tabla progresiva.</li>
                    <li><strong className="text-slate-100">Exención por Edad y Residencia Habitual:</strong> Si se cumplen los criterios (Edad &ge; 65 y es vivienda habitual), la plusvalía generada queda totalmente exenta de tributación (art. 33.4.b LIRPF).</li>
                  </ul>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-white mb-2">4. Algoritmo de Extracción Óptima (El Árbol de Decisión Fiscal)</h3>
                <p>Para cubrir el Déficit ($D$) restante, el sistema discrimina el origen del capital para evitar saltos de tramo impositivo.</p>
                <ul className="list-disc pl-5 mt-2 space-y-1">
                  <li><strong className="text-slate-100">Paso 1: Cálculo de la Base General Previa.</strong> Se evalúa el tramo de IRPF actual sumando Pensión Pública + Rentas Netas Inmobiliarias.</li>
                  <li><strong className="text-slate-100">Paso 2: Margen de Tramo (The Buffer).</strong> Se calcula cuánta base imponible puede añadirse antes de que el tipo marginal salte al siguiente escalón (ej. el margen disponible al 30% antes de tributar al 37%).</li>
                  <li><strong className="text-slate-100">Paso 3: Extracción de Plan de Pensiones (Margen de Seguridad).</strong> El sistema rescata fondos del Plan de Pensiones hasta cubrir el Déficit, pero limitado estrictamente por el Margen de Tramo. Mecanismo de seguridad: Si los ingresos pasivos ya sitúan al usuario en un tramo ineficiente (ej. &ge; 37%), el algoritmo bloquea las extracciones del plan (0€) para proteger el capital y evitar el impacto fiscal confiscatorio.</li>
                  <li><strong className="text-slate-100">Paso 4: Extracción de Fondos y Cuentas (Base del Ahorro).</strong> El importe no cubierto por el Plan de Pensiones se extrae de la cartera líquida financiera, gozando de la fiscalidad favorable de la Base del Ahorro (19-28%).</li>
                  <li><strong className="text-slate-100">Paso 5: Override Fiscal (Protocolo de Supervivencia).</strong> El sistema prioriza la solvencia de caja sobre la optimización tributaria. Si tras agotar al 100% los activos líquidos de la Base del Ahorro (Paso 4) aún persiste un déficit anual no cubierto, el algoritmo anula el "Freno de Emergencia" del Paso 3. Automáticamente, forzará el rescate del Plan de Pensiones necesario para cubrir el coste de vida, asumiendo la penalización fiscal en el IRPF, con el fin de evitar la quiebra técnica del usuario.</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-white mb-2">5. Rentabilidad Financiera, Liquidación y Retribución Ejecutiva (RSUs)</h3>
                <p>El capital líquido que sobrevive a la extracción permanece invertido, capitalizando a la rentabilidad bruta configurada.</p>
                <ul className="list-disc pl-5 mt-2 space-y-1">
                  <li><strong className="text-slate-100">Aclaración sobre la Rentabilidad Anual Bruta:</strong> En la configuración de activos (Cuentas, Fondos, Planes), el usuario introduce siempre la Rentabilidad Anual Bruta. El motor prohíbe deducir impuestos a ojo porque transforma la rentabilidad bruta en neta dinámicamente: calcula el beneficio anual, lo pasa por los tramos de la Base del Ahorro, descuenta la retención exacta (tipo medio efectivo) y solo capitaliza el neto.</li>
                  <li><strong className="text-slate-100">Tratamiento de Retribución Ejecutiva (RSUs / Stock Options):</strong> Las acciones consolidadas (vested) de corporaciones multinacionales, sobre las cuales el contribuyente ya ha tributado en nómina (salario en especie en la Base General) en el momento de su liberación, se clasifican explícitamente en el sistema como "Fondos / Acciones / Cuentas". El algoritmo proyectará su rentabilidad y, al realizar ventas para cubrir liquidez, gravará exclusivamente la plusvalía latente (beneficio) en la Base del Ahorro. Esto garantiza el rigor contable y evita simulaciones de doble imposición.</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-white mb-2">6. Oráculo de Viabilidad (Módulo Goal Seek y Robo-Advisor)</h3>
                <p><strong>Propósito del Sistema:</strong> Herramienta de diagnóstico financiero inverso que calcula la Tasa Interna de Retorno (TIR) mínima necesaria en activos líquidos para sostener el nivel de vida sin descapitalización total.</p>
                <p className="mt-2"><strong>Mecanismo (Búsqueda Binaria Iterativa):</strong> El motor lanza hasta 40 simulaciones completas de la vida del usuario (iterando variables fiscales e inflación), probando porcentajes en un rango de 0% a 15%.</p>
                <p className="mt-2"><strong>Condición de Éxito:</strong> Una tasa es válida solo si el saldo líquido se mantiene &gt; 0€ en absolutamente todos los años del horizonte.</p>
                <p className="mt-2"><strong>Termómetro de Riesgo y Perfilado:</strong> La TIR resultante se cruza con una matriz de riesgo, mostrando un semáforo (Conservador, Moderado, Arriesgado, Peligro) con enlaces directos a los portales educativos de la CNMV para orientar la estructuración de la cartera.</p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-white mb-2">7. Arquitectura Dual de Diagnóstico: Solvencia Patrimonial vs. Flujo de Caja</h3>
                <p>El sistema incorpora un doble panel analítico para disociar la riqueza latente de la liquidez operativa (Ingreso Neto Real), previniendo escenarios de insolvencia técnica (House Rich, Cash Poor).</p>
                <ul className="list-disc pl-5 mt-2 space-y-2">
                  <li><strong className="text-slate-100">Gráfico 1: Evolución del Patrimonio (Solvencia):</strong> Monitoriza el balance general. Proyecta el saldo de los activos financieros (liquidez) y el valor latente de los activos inmobiliarios (ladrillo), reflejando la curva de capitalización y los picos de inyección de liquidez tras eventos de enajenación.</li>
                  <li><strong className="text-slate-100">Gráfico 2: Nivel de Vida (Flujo de Caja):</strong> Un indicador dinámico que contrasta el "Ingreso Deseado Mensual" frente al flujo de caja operativo disponible.</li>
                  <li><strong className="text-slate-100">Motor de Cálculo del Ingreso Neto Real:</strong> La métrica crítica del simulador se define mediante la siguiente ecuación integradora:
                    <div className="my-2 p-2.5 bg-slate-950 rounded-lg border border-slate-800 text-xs font-mono text-emerald-400">
                      Ingreso Neto Real (Mes) = (Pensión Neta Anual + Rentas Inmobiliarias Netas Anuales + Rescate Neto Anual de liquidez) / 12
                    </div>
                  </li>
                  <li><strong className="text-slate-100">Detección de Caída de Nivel de Vida:</strong> Mientras exista capital líquido rescatable, el Ingreso Neto Real iguala al Ingreso Deseado. Ante el agotamiento de la liquidez, el motor cancela la extracción y el gráfico evidencia matemáticamente un "acantilado financiero", desplomando el nivel de vida mensual del usuario hasta el suelo vitalicio de la Pensión Neta + Rentas.</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-white mb-2">8. Gestión B2B de Expedientes y Persistencia de Datos</h3>
                <p>El sistema está diseñado para entornos de asesoría (SaaS) integrando conexión directa con bases de datos no relacionales (Firebase/Firestore). Permite archivar el "Estado Global" y la parametrización individual como un Expediente de Cliente, garantizando la recuperación, edición iterativa y seguimiento interanual del plan de jubilación sin pérdida de contexto ni reintroducción de datos.</p>
              </div>

              <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700/50 mt-8">
                <h3 className="text-xl font-bold text-white mb-4">Anexo: Guía de Actualización Anual (Mantenimiento Legal)</h3>
                <p className="mb-4">Para mantener la precisión matemática, se debe realizar una revisión anual en el panel "Ajustes Globales" (preferiblemente entre enero y febrero, tras la aprobación de los PGE).</p>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold text-slate-100">A. Tramos del IRPF (Base General y Base del Ahorro)</h4>
                    <ul className="list-disc pl-5 mt-1 space-y-1">
                      <li><strong className="text-slate-100">Qué es:</strong> Porcentajes de impuestos aplicables a ingresos y ganancias.</li>
                      <li><strong className="text-slate-100">Dónde consultarlo:</strong> Agencia Tributaria (sede.agenciatributaria.gob.es), "Manual Práctico de Renta".</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-100">B. Pensión Pública Estimada (Bruta / 14 pagas)</h4>
                    <ul className="list-disc pl-5 mt-1 space-y-1">
                      <li><strong className="text-slate-100">Qué es:</strong> Importe mensual bruto en 14 pagas estimado por el sistema público de la Seguridad Social. El motor deduce automáticamente su IRPF según los tramos generales para obtener la pensión neta de bolsillo y calcular el déficit con precisión.</li>
                      <li><strong className="text-slate-100">Dónde consultarlo:</strong> Portal Tu Seguridad Social (sede-tu.seg-social.gob.es) o simulador oficial de jubilación.</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-100">C. Inflación (IPC e IPC de Alquileres)</h4>
                    <ul className="list-disc pl-5 mt-1 space-y-1">
                      <li><strong className="text-slate-100">Qué es:</strong> Porcentaje estimado de encarecimiento del coste de vida y topes legales a rentas.</li>
                      <li><strong className="text-slate-100">Dónde consultarlo:</strong> Instituto Nacional de Estadística (ine.es) y previsiones del Banco de España (bde.es).</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-100">D. Revalorización Inmobiliaria Anual (IPV)</h4>
                    <ul className="list-disc pl-5 mt-1 space-y-1">
                      <li><strong className="text-slate-100">Qué es:</strong> Porcentaje de crecimiento anual proyectado para el mercado inmobiliario, utilizado por el motor para aplicar interés compuesto al valor de las propiedades antes de su venta simulada.</li>
                      <li><strong className="text-slate-100">Dónde consultarlo:</strong> Índice de Precios de Vivienda (IPV) publicado por el Instituto Nacional de Estadística (ine.es).</li>
                      <li><strong className="text-slate-100">Cómo actualizarlo:</strong> Se recomienda introducir una Tasa de Variación Anual media histórica (ej. 2% - 4%) en el panel de Ajustes Globales, evitando la volatilidad de los datos trimestrales a corto plazo.</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
