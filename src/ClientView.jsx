import { useState, useEffect } from 'react';
import { collection, query, getDocs, addDoc, doc, deleteDoc } from 'firebase/firestore';
import { db, auth } from './firebase';
import { ArrowLeft, Plus, FileText, Trash2, Clock, Play } from 'lucide-react';
import Simulator from './Simulator';

export default function ClientView({ cliente, onBack }) {
  const [escenarios, setEscenarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeScenario, setActiveScenario] = useState(null);
  
  useEffect(() => {
    loadEscenarios();
  }, [cliente.id]);

  const loadEscenarios = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, `gestorias/${auth.currentUser.uid}/clientes/${cliente.id}/escenarios`));
      const querySnapshot = await getDocs(q);
      const fetchedEscenarios = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      // Sort by creation date descending
      fetchedEscenarios.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setEscenarios(fetchedEscenarios);
    } catch (err) {
      console.error("Error loading scenarios:", err);
    }
    setLoading(false);
  };

  const createNewScenario = () => {
    setActiveScenario({ isNew: true });
  };

  const handleBackFromSimulator = () => {
    setActiveScenario(null);
    loadEscenarios(); // Reload in case it was saved
  };

  if (activeScenario) {
    return <Simulator client={cliente} scenario={activeScenario} onBack={handleBackFromSimulator} />;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200">
      <header className="bg-slate-900 border-b border-slate-800 px-6 py-4 flex items-center gap-4 sticky top-0 z-10">
        <button 
          onClick={onBack}
          className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            Expediente: {cliente.name}
          </h1>
          <p className="text-sm text-slate-400">Edad: {cliente.age} años {cliente.notes && `• ${cliente.notes}`}</p>
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-6">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-bold text-white">Simulaciones (Escenarios)</h2>
          <button 
            onClick={createNewScenario}
            className="bg-primary-600 hover:bg-primary-500 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Nueva Simulación
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12 text-slate-400">Cargando escenarios...</div>
        ) : escenarios.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center">
            <FileText className="w-12 h-12 text-slate-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">Sin simulaciones guardadas</h3>
            <p className="text-slate-400 mb-6">Abre el planificador y guarda un escenario para este cliente.</p>
            <button 
              onClick={createNewScenario}
              className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-lg font-medium inline-flex items-center gap-2 transition-colors"
            >
              <Play className="w-4 h-4" />
              Iniciar Planificador
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {escenarios.map(escenario => (
              <div 
                key={escenario.id} 
                className="bg-slate-900 border border-slate-800 hover:border-primary-500/50 rounded-xl p-5 transition-all group flex flex-col"
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-white group-hover:text-primary-400 transition-colors">
                      {escenario.name || 'Escenario sin título'}
                    </h3>
                    <p className="text-sm text-slate-400 flex items-center gap-1 mt-1">
                      <Clock className="w-3.5 h-3.5" />
                      {new Date(escenario.createdAt).toLocaleDateString()} - {new Date(escenario.createdAt).toLocaleTimeString()}
                    </p>
                  </div>
                  <button
                    onClick={async (e) => {
                      e.stopPropagation();
                      if (window.confirm('¿Seguro que deseas eliminar este escenario?')) {
                        await deleteDoc(doc(db, `gestorias/${auth.currentUser.uid}/clientes/${cliente.id}/escenarios`, escenario.id));
                        loadEscenarios();
                      }
                    }}
                    className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-950/30 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                    title="Eliminar escenario"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                
                <div className="mt-auto pt-4 border-t border-slate-800 flex justify-end">
                  <button 
                    onClick={() => setActiveScenario(escenario)}
                    className="text-primary-400 hover:text-primary-300 font-medium text-sm flex items-center gap-1"
                  >
                    <Play className="w-4 h-4" />
                    Abrir Simulación
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
