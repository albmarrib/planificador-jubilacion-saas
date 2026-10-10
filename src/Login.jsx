import { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from './firebase';
import { Calculator, Shield } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      setError('Credenciales inválidas o acceso denegado.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex">
      {/* Panel Izquierdo: Imagen y Branding */}
      <div className="hidden lg:flex w-1/2 relative bg-slate-900 overflow-hidden">
        <div className="absolute inset-0 bg-slate-900/60 mix-blend-multiply z-10" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/80 to-transparent z-10" />
        <img 
          src="https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=2070&auto=format&fit=crop" 
          alt="Fondo corporativo profesional" 
          className="absolute inset-0 w-full h-full object-cover"
        />
        
        <div className="relative z-20 flex flex-col justify-end p-16 h-full text-white">
          <div className="flex items-center gap-3 mb-6">
            <Calculator className="w-10 h-10 text-primary-500" />
            <span className="text-2xl font-bold tracking-tight">Retire<span className="text-primary-500">Master</span> Pro</span>
          </div>
          <h2 className="text-4xl font-bold mb-4 leading-tight">Planificación Patrimonial<br/>Avanzada para Gestorías</h2>
          <p className="text-slate-300 text-lg max-w-md leading-relaxed">
            El motor de cálculo fiscal más preciso para proyectar y proteger el futuro financiero de sus clientes corporativos y particulares.
          </p>
        </div>
      </div>

      {/* Panel Derecho: Formulario */}
      <div className="w-full lg:w-1/2 flex flex-col justify-between p-8 lg:p-16">
        <div className="max-w-md w-full mx-auto flex-1 flex flex-col justify-center">
          <div className="lg:hidden flex items-center gap-2 mb-12 justify-center">
            <Calculator className="w-8 h-8 text-primary-500" />
            <span className="text-2xl font-bold text-white tracking-tight">Retire<span className="text-primary-500">Master</span> Pro</span>
          </div>

          <h1 className="text-3xl font-bold text-white mb-2">Acceso Privado</h1>
          <p className="text-slate-400 mb-8">Introduzca sus credenciales profesionales para acceder a la plataforma.</p>
          
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Email Corporativo</label>
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-950/50 border border-slate-700 focus:border-primary-500 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none transition-colors"
                placeholder="asesor@gestoria.com"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Contraseña de acceso</label>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-950/50 border border-slate-700 focus:border-primary-500 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none transition-colors"
                placeholder="••••••••"
                required
              />
            </div>
            
            {error && (
              <div className="bg-red-950/40 border border-red-900/50 rounded-lg p-3">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}
            
            <button 
              type="submit"
              disabled={loading}
              className="w-full bg-primary-600 hover:bg-primary-500 disabled:bg-primary-800 text-white font-semibold py-3 rounded-xl transition-all shadow-lg hover:shadow-primary-500/25 mt-2"
            >
              {loading ? 'Verificando...' : 'Acceder al Panel de Gestión'}
            </button>
          </form>
        </div>

        {/* Footer Legal B2B */}
        <div className="max-w-md w-full mx-auto mt-12 space-y-4 text-center border-t border-slate-800 pt-8">
          <p className="text-xs text-slate-500 leading-relaxed">
            Plataforma B2B de uso exclusivo. El acceso no autorizado está estrictamente prohibido. 
            Contacte con su administrador de sistemas para solicitar credenciales.
          </p>
          
          <div className="flex items-start gap-2 text-left bg-slate-900/50 border border-slate-800 p-3 rounded-lg">
            <Shield className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
            <p className="text-[10px] text-slate-500 leading-relaxed">
              <strong>Aviso Legal (RGPD / LOPDGDD):</strong> Los datos introducidos en esta plataforma están sujetos 
              a confidencialidad. Este software es una herramienta de proyección algorítmica; sus resultados son estimativos 
              y no constituyen asesoramiento financiero vinculante ni garantía de rendimiento.
            </p>
          </div>

          <p className="text-xs text-slate-600 font-medium pt-2">
            © {new Date().getFullYear()} AxonAI Solutions. Todos los derechos reservados.
          </p>
        </div>
      </div>
    </div>
  );
}
