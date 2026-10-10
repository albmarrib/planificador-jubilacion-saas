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
    <div className="min-h-screen bg-slate-950 text-slate-200">
      <header className="bg-slate-900 border-b border-slate-800 px-6 py-4 flex justify-between items-center sticky top-0 z-10">
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
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-bold text-white">Mis Clientes</h2>
          <button 
            onClick={() => setShowAddModal(true)}
            className="bg-primary-600 hover:bg-primary-500 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Nuevo Cliente
          </button>
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
                  <div>
                    <h3 className="text-lg font-bold text-white group-hover:text-primary-400 transition-colors">{cliente.name}</h3>
                    <p className="text-sm text-slate-400">Edad: {cliente.age} años</p>
                  </div>
                  <div className="p-2 bg-slate-800 rounded-lg group-hover:bg-primary-900/30">
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
  );
}
