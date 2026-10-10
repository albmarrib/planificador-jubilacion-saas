import { useState } from 'react';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from './firebase';
import { doc, setDoc } from 'firebase/firestore';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    try {
      if (isRegistering) {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        // Create initial gestoria document
        await setDoc(doc(db, 'gestorias', userCredential.user.uid), {
          email: userCredential.user.email,
          createdAt: new Date().toISOString()
        });
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl shadow-2xl w-full max-w-md">
        <h1 className="text-2xl font-bold text-white mb-6 text-center">
          {isRegistering ? 'Alta de Gestoría' : 'Acceso Gestorías'}
        </h1>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1">Email</label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-white focus:border-primary-500 focus:outline-none"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1">Contraseña</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-white focus:border-primary-500 focus:outline-none"
              required
            />
          </div>
          
          {error && <p className="text-red-400 text-sm bg-red-950/50 p-3 rounded-lg">{error}</p>}
          
          <button 
            type="submit"
            className="w-full bg-primary-600 hover:bg-primary-500 text-white font-semibold py-2 rounded-lg transition-colors"
          >
            {isRegistering ? 'Crear Cuenta' : 'Entrar'}
          </button>
        </form>

        <p className="mt-6 text-center text-slate-400 text-sm">
          {isRegistering ? '¿Ya tienes cuenta?' : '¿No estás registrado?'}
          <button 
            onClick={() => setIsRegistering(!isRegistering)}
            className="ml-2 text-primary-400 hover:text-primary-300 font-medium"
          >
            {isRegistering ? 'Inicia sesión' : 'Regístrate aquí'}
          </button>
        </p>
      </div>
    </div>
  );
}
