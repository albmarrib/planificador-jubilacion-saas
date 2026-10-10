import { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './firebase';
import Login from './Login';
import Dashboard from './Dashboard';
import ClientView from './ClientView';

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedClient, setSelectedClient] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
      // If user logs out, clear selected client
      if (!currentUser) {
        setSelectedClient(null);
      }
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-primary-500 text-xl font-semibold animate-pulse">Cargando Plataforma...</div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  if (selectedClient) {
    return <ClientView cliente={selectedClient} onBack={() => setSelectedClient(null)} />;
  }

  return <Dashboard onSelectClient={setSelectedClient} />;
}
