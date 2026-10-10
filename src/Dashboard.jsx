import { useState, useEffect } from 'react';
import { collection, query, getDocs, addDoc } from 'firebase/firestore';
import { db, auth } from './firebase';
import { LogOut, Plus, User, FileText, ArrowRight } from 'lucide-react';
import { signOut } from 'firebase/auth';

export default function Dashboard({ onSelectClient }) {
  const [clientes, setClientes] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [newClientAge, setNewClientAge] = useState('');
  const [newClientNotes, setNewClientNotes] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadClientes();
  }, []);

  const loadClientes = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, `gestorias/${auth.currentUser.uid}/clientes`));
      const querySnapshot = await getDocs(q);
      const fetchedClientes = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setClientes(fetchedClientes);
    } catch (err) {
      console.error("Error loading clients:", err);
    }
    setLoading(false);
  };

  const handleAddClient = async (e) => {
    e.preventDefault();
    if (!newClientName) return;
    
    try {
      await addDoc(collection(db, `gestorias/${auth.currentUser.uid}/clientes`), {
        name: newClientName,
        age: parseInt(newClientAge) || 65,
        notes: newClientNotes,
        createdAt: new Date().toISOString()
      });
      setShowAddModal(false);
      setNewClientName('');
      setNewClientAge('');
      setNewClientNotes('');
      loadClientes();
    } catch (err) {
      console.error("Error adding client:", err);
    }
  };

  return (
    <div className="min-h-screen text-slate-200 relative">
      {/* Fondo corporativo visible */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-slate-950/70 z-10" />
        <div className="absolute inset-0 bg-slate-900/40 mix-blend-multiply z-10" />
        <img 
          src="https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=2070&auto=format&fit=crop" 
          alt="Dashboard background" 
          className="absolute inset-0 w-full h-full object-cover opacity-100"
        />
      </div>

      <div className="relative z-10">
        <header className="bg-slate-950/80 backdrop-blur-md border-b border-slate-800 px-6 py-4 flex justify-between items-center sticky top-0 z-20">
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <User className="w-6 h-6 text-primary-500" />
          Panel de Gestoría
        </h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-slate-400">{auth.currentUser?.email}</span>
          <button 
            onClick={() => signOut(auth)}
            className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-colors"
            title="Cerrar sesión"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-6">
        
        {/* Banner Hero Profesional */}
        <div className="relative overflow-hidden rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl mb-8 flex flex-col md:flex-row items-center justify-between">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary-500/10 rounded-full blur-3xl -mr-40 -mt-40 pointer-events-none"></div>
          <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-blue-500/10 rounded-full blur-3xl -ml-20 -mb-20 pointer-events-none"></div>
          
          <div className="relative z-10 p-8 md:p-10 flex-1">
            <h2 className="text-3xl font-bold text-white mb-3">Panel de Asesoramiento</h2>
            <p className="text-slate-400 max-w-xl text-lg leading-relaxed">
              Gestione de forma integral los expedientes de jubilación de sus clientes. 
              Cree proyecciones personalizadas, optimice su fiscalidad y simule eventos de liquidez.
            </p>
          </div>
          
          <div className="relative z-10 p-8 md:p-10 shrink-0 flex flex-col sm:flex-row gap-4 border-t md:border-t-0 md:border-l border-slate-800/50 w-full md:w-auto bg-slate-900/50 backdrop-blur-sm">
            <div className="bg-slate-950/50 border border-slate-800 rounded-2xl p-5 text-center min-w-[140px] shadow-inner">
              <p className="text-4xl font-black text-primary-400 mb-1">{clientes.length}</p>
              <p className="text-xs text-slate-500 uppercase tracking-widest font-semibold">Expedientes</p>
            </div>
            <button 
              onClick={() => setShowAddModal(true)}
              className="bg-primary-600 hover:bg-primary-500 text-white px-6 py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg hover:shadow-primary-500/30 w-full sm:w-auto"
            >
              <Plus className="w-5 h-5" />
              Nuevo Cliente
            </button>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12 text-slate-400">Cargando clientes...</div>
        ) : clientes.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center">
            <User className="w-12 h-12 text-slate-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">No tienes clientes aún</h3>
            <p className="text-slate-400 mb-6">Comienza añadiendo tu primer cliente para crear simulaciones.</p>
            <button 
              onClick={() => setShowAddModal(true)}
              className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-lg font-medium inline-flex items-center gap-2 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Añadir Cliente
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {clientes.map(cliente => (
              <div 
                key={cliente.id} 
                className="bg-slate-900 border border-slate-800 hover:border-primary-500/50 rounded-xl p-6 transition-all cursor-pointer group"
                onClick={() => onSelectClient(cliente)}
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex gap-4 items-center">
                    <div className="w-12 h-12 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0 overflow-hidden">
                      <User className="w-6 h-6 text-slate-400 group-hover:text-primary-400 transition-colors" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-white group-hover:text-primary-400 transition-colors tracking-tight">{cliente.name}</h3>
                      <p className="text-sm text-slate-400 font-medium">{cliente.age} años de edad</p>
                    </div>
                  </div>
                  <div className="p-2.5 bg-slate-800 rounded-xl group-hover:bg-primary-900/40 group-hover:scale-110 transition-all">
                    <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-primary-400" />
                  </div>
                </div>
                {cliente.notes && (
                  <p className="text-sm text-slate-500 line-clamp-2 mt-4 pt-4 border-t border-slate-800/50">
                    {cliente.notes}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </main>

      {showAddModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 rounded-2xl border border-slate-700 shadow-2xl w-full max-w-md p-6">
            <h3 className="text-xl font-bold text-white mb-6">Añadir Nuevo Cliente</h3>
            <form onSubmit={handleAddClient} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Nombre Completo</label>
                <input 
                  type="text" 
                  value={newClientName}
                  onChange={(e) => setNewClientName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-white focus:border-primary-500 focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Edad Actual</label>
                <input 
                  type="number" 
                  value={newClientAge}
                  onChange={(e) => setNewClientAge(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-white focus:border-primary-500 focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Notas / Observaciones</label>
                <textarea 
                  value={newClientNotes}
                  onChange={(e) => setNewClientNotes(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-white focus:border-primary-500 focus:outline-none h-24 resize-none"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button 
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-medium py-2 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="flex-1 bg-primary-600 hover:bg-primary-500 text-white font-medium py-2 rounded-lg transition-colors"
                >
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
