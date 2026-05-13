'use client';

import React, { useState, useEffect } from 'react';
import { useFirebase } from '@/components/FirebaseProvider';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  LogOut, 
  CreditCard, 
  Calendar, 
  TrendingUp, 
  CheckCircle2, 
  AlertCircle,
  Clock,
  ChevronRight,
  Filter,
  MoreVertical,
  Trash2,
  PieChart,
  Sun,
  Moon,
  Calculator,
  Edit2,
  ChevronLeft,
  Wallet,
  Banknote,
  DollarSign,
  Layers,
  Settings2,
  BarChart3,
  ListFilter,
  ShoppingCart,
  Home,
  Car,
  Briefcase,
  Smartphone,
  Utensils,
  Zap
} from 'lucide-react';
import { format, addMonths, startOfMonth, setDate, isAfter, isBefore, isSameMonth, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip,
  BarChart,
  Bar,
  Cell
} from 'recharts';
import { 
  getDebts, 
  getInstallments, 
  createDebt, 
  createInstallments, 
  updateInstallmentStatus,
  deleteDebt,
  updateDebt,
  deleteInstallmentsByDebtId,
  deleteInstallment,
  setIncome,
  subscribeToIncome,
  subscribeToDebts,
  subscribeToInstallmentsByMonth,
  clearAllUserData
} from '@/lib/firebase-utils';
import { useCallback } from 'react';

const CATEGORIES = [
  { name: 'Cartão de Crédito', icon: CreditCard, color: '#6366f1', bg: 'bg-indigo-500/10' },
  { name: 'Moradia', icon: Home, color: '#f59e0b', bg: 'bg-amber-500/10' },
  { name: 'Transporte', icon: Car, color: '#3b82f6', bg: 'bg-blue-500/10' },
  { name: 'Alimentação', icon: Utensils, color: '#ef4444', bg: 'bg-rose-500/10' },
  { name: 'Educação', icon: Briefcase, color: '#8b5cf6', bg: 'bg-violet-500/10' },
  { name: 'Serviços', icon: Zap, color: '#10b981', bg: 'bg-emerald-500/10' },
  { name: 'Lazer', icon: ShoppingCart, color: '#ec4899', bg: 'bg-pink-500/10' },
  { name: 'Outros', icon: Layers, color: '#6b7280', bg: 'bg-zinc-500/10' },
];

const COLORS = [
  '#6366f1', '#f59e0b', '#3b82f6', '#ef4444', 
  '#8b5cf6', '#10b981', '#ec4899', '#6b7280'
];

const formatCurrencyInput = (value: string) => {
  // Removes everything except digits
  let cleanValue = value.replace(/\D/g, '');
  if (!cleanValue) return '';
  
  // Format as decimal
  const numberValue = parseFloat(cleanValue) / 100;
  return numberValue.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const parseCurrencyToNumber = (formattedValue: string) => {
  if (!formattedValue) return 0;
  // Remove formatting characters (dots and commas)
  // Brazilian format: 1.234,56 -> 1234.56
  const clean = formattedValue.replace(/\./g, '').replace(',', '.');
  return parseFloat(clean) || 0;
};

const CurrencyInput = ({ value, onChange, className, placeholder, isDark }: any) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(formatCurrencyInput(e.target.value));
  };

  return (
    <input 
      type="text"
      inputMode="numeric"
      value={value}
      onChange={handleChange}
      className={className}
      placeholder={placeholder}
    />
  );
};

const LoadingScreen = () => (
  <div className="flex items-center justify-center h-screen bg-[#f5f5f5]">
    <motion.div 
      animate={{ scale: [1, 1.1, 1] }} 
      transition={{ repeat: Infinity, duration: 1.5 }}
      className="text-2xl font-bold tracking-tight"
    >
      Dívida<span className="text-zinc-400">Zero</span>
    </motion.div>
  </div>
);

const LoginScreen = ({ 
  onLogin, 
  onRegister,
  onResetPassword
}: { 
  onLogin: (email: string, password: string) => Promise<void>;
  onRegister: (email: string, password: string, name: string) => Promise<void>;
  onResetPassword: (email: string) => Promise<void>;
}) => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (isForgotPassword) {
        await onResetPassword(email);
        setSuccess('E-mail de recuperação enviado! Verifique sua caixa de entrada.');
        setLoading(false);
        return;
      }

      if (isRegistering) {
        if (password !== confirmPassword) {
          throw new Error('As senhas não coincidem.');
        }
        if (name.trim().length < 3) {
          throw new Error('O nome deve ter pelo menos 3 caracteres.');
        }
        await onRegister(email, password, name);
      } else {
        await onLogin(email, password);
      }
    } catch (err: any) {
      console.error('Auth error:', err);
      if (err.message === 'As senhas não coincidem.') {
        setError(err.message);
      } else if (err.code === 'auth/email-already-in-use') {
        setError('Este e-mail já está sendo utilizado por outra conta.');
      } else if (err.code === 'auth/weak-password') {
        setError('A senha deve ter pelo menos 6 caracteres.');
      } else if (err.code === 'auth/invalid-email') {
        setError('O e-mail inserido é inválido.');
      } else if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setError('E-mail ou senha incorretos.');
      } else if (err.code === 'auth/too-many-requests') {
        setError('Muitas tentativas. Tente novamente mais tarde.');
      } else {
        setError(err.message || 'Ocorreu um erro ao autenticar. Verifique seus dados.');
      }
    } finally {
      if (!isForgotPassword || error) {
        setLoading(false);
      }
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#f0f2f5] p-6 relative overflow-hidden">
      {/* Background Animated Blobs */}
      <div className="absolute inset-0 z-0">
        <motion.div 
          animate={{ 
            scale: [1, 1.2, 1],
            rotate: [0, 90, 0],
            x: [0, 50, 0],
            y: [0, -50, 0]
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-emerald-400/20 blur-[120px]"
        />
        <motion.div 
          animate={{ 
            scale: [1, 1.3, 1],
            rotate: [0, -90, 0],
            x: [0, -70, 0],
            y: [0, 80, 0]
          }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
          className="absolute bottom-[-10%] right-[-10%] w-[70%] h-[70%] rounded-full bg-blue-500/10 blur-[120px]"
        />
        <motion.div 
          animate={{ 
            scale: [1, 1.1, 1],
            x: [0, 100, 0],
            y: [0, 100, 0]
          }}
          transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
          className="absolute top-[20%] right-[10%] w-[40%] h-[40%] rounded-full bg-emerald-300/10 blur-[100px]"
        />
      </div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="max-w-md w-full backdrop-blur-xl bg-white/70 p-10 rounded-[40px] shadow-2xl border border-white/50 flex flex-col items-center relative z-10"
      >
        <div className="w-20 h-20 bg-zinc-900 rounded-[28px] flex items-center justify-center mb-8 shadow-2xl shadow-zinc-900/40 rotate-3">
          <TrendingUp className="text-white w-10 h-10" />
        </div>
        
        <h1 className="text-4xl font-black tracking-tighter mb-2 italic">DÍVIDAZERO</h1>
        <p className="text-zinc-500 mb-10 font-medium text-center leading-relaxed">
          {isForgotPassword ? 'Digite seu e-mail para recuperar sua senha.' : 
           isRegistering ? 'Crie sua conta e comece a controlar suas dívidas hoje mesmo.' : 
           'Recupere sua liberdade financeira com controle total e praticidade.'}
        </p>
        
        <form onSubmit={handleSubmit} className="w-full space-y-5">
          {isRegistering && (
            <motion.div 
              initial={{ opacity: 0, x: -10 }} 
              animate={{ opacity: 1, x: 0 }} 
              className="space-y-1"
            >
              <label className="text-[10px] uppercase tracking-[0.2em] font-extrabold text-zinc-400 block mb-1 px-1">Nome Completo</label>
              <input 
                required
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full bg-white/50 border border-zinc-200/50 rounded-2xl p-4 focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all outline-none" 
                placeholder="Como quer ser chamado?"
              />
            </motion.div>
          )}

          <div className="space-y-1">
            <label className="text-[10px] uppercase tracking-[0.2em] font-extrabold text-zinc-400 block mb-1 px-1">Seu Melhor E-mail</label>
            <input 
              required
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full bg-white/50 border border-zinc-200/50 rounded-2xl p-4 focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all outline-none" 
              placeholder="exemplo@email.com"
            />
          </div>

          {!isForgotPassword && (
            <div className="space-y-5">
              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-[0.2em] font-extrabold text-zinc-400 block mb-1 px-1">Sua Senha</label>
                <input 
                  required
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full bg-white/50 border border-zinc-200/50 rounded-2xl p-4 focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all outline-none" 
                  placeholder="••••••••"
                />
              </div>

              {isRegistering && (
                <motion.div 
                  initial={{ opacity: 0, x: 10 }} 
                  animate={{ opacity: 1, x: 0 }} 
                  className="space-y-1"
                >
                  <label className="text-[10px] uppercase tracking-[0.2em] font-extrabold text-zinc-400 block mb-1 px-1">Confirmar Senha</label>
                  <input 
                    required
                    type="password"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    className="w-full bg-white/50 border border-zinc-200/50 rounded-2xl p-4 focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all outline-none" 
                    placeholder="Repita sua senha"
                  />
                </motion.div>
              )}
            </div>
          )}

          {error && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 text-rose-500 text-xs font-bold bg-rose-50 p-4 rounded-xl border border-rose-100"
            >
              <AlertCircle size={14} className="shrink-0" />
              {error}
            </motion.div>
          )}

          {success && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 text-emerald-600 text-xs font-bold bg-emerald-50 p-4 rounded-xl border border-emerald-100"
            >
              <CheckCircle2 size={14} className="shrink-0" />
              {success}
            </motion.div>
          )}

          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-zinc-900 text-white rounded-2xl py-5 font-bold hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 shadow-2xl shadow-zinc-900/40 mt-4 disabled:opacity-50 disabled:hover:scale-100"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <motion.div 
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                />
                Processando...
              </span>
            ) : (
              <>
                {isForgotPassword ? 'Redefinir Senha' : 
                 isRegistering ? 'Começar Agora' : 'Entrar na Plataforma'}
              </>
            )}
          </button>
        </form>

        <div className="mt-10 flex flex-col items-center gap-3">
          {!isForgotPassword && !isRegistering && (
            <button 
              onClick={() => setIsForgotPassword(true)}
              className="text-xs font-bold text-zinc-400 hover:text-zinc-600 transition-colors uppercase tracking-widest"
            >
              Esqueceu sua senha?
            </button>
          )}

          <button 
            onClick={() => {
              if (isForgotPassword) {
                setIsForgotPassword(false);
              } else {
                setIsRegistering(!isRegistering);
              }
              setError('');
              setSuccess('');
            }}
            className="text-sm font-bold text-zinc-600 hover:text-zinc-900 transition-colors px-6 py-2 rounded-full hover:bg-zinc-100"
          >
            {isForgotPassword ? '← Voltar para o Login' : 
             isRegistering ? 'Já tem uma conta? Entrar' : 'Não tem uma conta? Cadastre-se'}
          </button>
        </div>
      </motion.div>

      {/* Decorative Footer Detail */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 text-[10px] font-extrabold text-zinc-300 uppercase tracking-[0.3em] z-10">
        <span>Praticidade</span>
        <div className="w-1 h-1 rounded-full bg-zinc-200" />
        <span>Controle</span>
        <div className="w-1 h-1 rounded-full bg-zinc-200" />
        <span>Liberdade</span>
      </div>
    </div>
  );
};

const StatCard = ({ title, value, icon: Icon, colorClass, delay = 0, isDark }: any) => (
  <motion.div 
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay }}
    className={`${isDark ? 'bg-zinc-800 border-zinc-700' : 'bg-white border-zinc-100'} p-6 rounded-[24px] shadow-sm border flex-1 min-w-[200px]`}
  >
    <div className="flex items-center justify-between mb-4">
      <div className={`p-2 rounded-xl ${colorClass}`}>
        <Icon size={20} />
      </div>
    </div>
    <div className="text-zinc-500 text-xs uppercase tracking-wider font-semibold mb-1">{title}</div>
    <div className="text-2xl font-bold tracking-tight">R$ {value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
  </motion.div>
);

const CalculatorModal = ({ isOpen, onClose, isDark }: any) => {
  const [display, setDisplay] = useState('0');
  const [equation, setEquation] = useState('');

  const handleClear = () => {
    setDisplay('0');
    setEquation('');
  };

  const handleNumber = (n: string) => {
    setDisplay(prev => prev === '0' ? n : prev + n);
  };

  const handleOperator = (op: string) => {
    setEquation(prev => display + ' ' + op + ' ');
    setDisplay('0');
  };

  const handleEqual = () => {
    try {
      const parts = equation.trim().split(' ');
      if (parts.length < 2) return;
      const num1 = parseFloat(parts[0]);
      const op = parts[1];
      const num2 = parseFloat(display);
      let res = 0;
      if (op === '+') res = num1 + num2;
      if (op === '-') res = num1 - num2;
      if (op === '×' || op === '*') res = num1 * num2;
      if (op === '÷' || op === '/') res = num1 / num2;
      setDisplay(res.toString());
      setEquation('');
    } catch {
      setDisplay('Error');
    }
  };

  if (!isOpen) return null;

  const btnClass = `h-14 rounded-2xl text-lg font-bold flex items-center justify-center transition-all ${isDark ? 'bg-zinc-700 hover:bg-zinc-600 text-white' : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-900'}`;
  const opClass = `h-14 rounded-2xl text-lg font-bold flex items-center justify-center transition-all ${isDark ? 'bg-zinc-600 hover:bg-zinc-500 text-white' : 'bg-zinc-900 hover:bg-zinc-800 text-white'}`;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className={`${isDark ? 'bg-zinc-800 text-white' : 'bg-white text-zinc-900'} rounded-[32px] w-full max-w-xs overflow-hidden shadow-2xl p-6`}
      >
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold">Calculadora</h3>
          <button onClick={onClose} className="p-1 hover:bg-zinc-500/20 rounded-full transition-colors">
            <Plus className="rotate-45" size={18} />
          </button>
        </div>

        <div className={`${isDark ? 'bg-zinc-900' : 'bg-zinc-50'} p-6 rounded-2xl mb-4 text-right overflow-hidden`}>
          <div className="text-xs text-zinc-500 h-4 mb-1">{equation}</div>
          <div className="text-3xl font-bold truncate">{display}</div>
        </div>

        <div className="grid grid-cols-4 gap-2">
          <button onClick={handleClear} className={`${btnClass} col-span-2 bg-rose-500/10 text-rose-500 hover:bg-rose-500/20`}>C</button>
          <button onClick={() => handleOperator('/')} className={opClass}>÷</button>
          <button onClick={() => handleOperator('*')} className={opClass}>×</button>

          <button onClick={() => handleNumber('7')} className={btnClass}>7</button>
          <button onClick={() => handleNumber('8')} className={btnClass}>8</button>
          <button onClick={() => handleNumber('9')} className={btnClass}>9</button>
          <button onClick={() => handleOperator('-')} className={opClass}>-</button>

          <button onClick={() => handleNumber('4')} className={btnClass}>4</button>
          <button onClick={() => handleNumber('5')} className={btnClass}>5</button>
          <button onClick={() => handleNumber('6')} className={btnClass}>6</button>
          <button onClick={() => handleOperator('+')} className={opClass}>+</button>

          <button onClick={() => handleNumber('1')} className={btnClass}>1</button>
          <button onClick={() => handleNumber('2')} className={btnClass}>2</button>
          <button onClick={() => handleNumber('3')} className={btnClass}>3</button>
          <button onClick={handleEqual} className={`${opClass} row-span-2 h-auto bg-emerald-600 hover:bg-emerald-700`}>=</button>

          <button onClick={() => handleNumber('0')} className={`${btnClass} col-span-2`}>0</button>
          <button onClick={() => handleNumber('.')} className={btnClass}>.</button>
        </div>
      </motion.div>
    </div>
  );
};

const IncomeModal = ({ isOpen, onClose, currentIncome, isDark }: any) => {
  const [income, setIncomeValue] = useState(
    currentIncome?.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || ''
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);
    try {
      const num = parseCurrencyToNumber(income);
      await setIncome(num);
      setSuccess(true);
      setTimeout(() => onClose(), 1000);
    } catch (err) {
      console.error(err);
      setError('Erro ao salvar renda. Verifique sua conexão.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
      <motion.div 
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className={`${isDark ? 'bg-zinc-800 text-white' : 'bg-white text-zinc-900'} rounded-[32px] w-full max-w-sm overflow-hidden shadow-2xl p-8`}
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Minha Renda</h2>
          <button onClick={onClose} className="p-2 hover:bg-zinc-500/10 rounded-full transition-colors">
            <Plus className="rotate-45" size={20} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs uppercase tracking-wider font-semibold text-zinc-400 block mb-2 px-1">Valor Mensal (R$)</label>
            <CurrencyInput 
              required
              value={income}
              onChange={setIncomeValue}
              className={`w-full ${isDark ? 'bg-emerald-500/10 text-emerald-500' : 'bg-emerald-50 text-emerald-700'} border-none rounded-2xl p-4 focus:ring-2 focus:ring-emerald-500 transition-all outline-none font-bold text-center text-xl`} 
              placeholder="0,00"
              isDark={isDark}
            />
          </div>
          
          {error && <p className="text-rose-500 text-xs font-bold text-center">{error}</p>}
          {success && <p className="text-emerald-500 text-xs font-bold text-center">Salvo com sucesso!</p>}

          <button 
            type="submit"
            disabled={loading || success}
            className={`w-full ${isDark ? 'bg-white text-zinc-900' : 'bg-zinc-900 text-white'} rounded-2xl py-4 font-bold hover:opacity-90 transition-all mt-4 flex items-center justify-center`}
          >
            {loading ? 'Salvando...' : success ? 'Sucesso!' : 'Salvar Renda'}
          </button>
        </form>
      </motion.div>
    </div>
  );
};

const DebtModal = ({ isOpen, onClose, onRefresh, editingDebt, isDark }: any) => {
  const [title, setTitle] = useState(editingDebt?.title || '');
  const [amount, setAmount] = useState(
    editingDebt?.totalAmount?.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || ''
  );
  const [installmentValue, setInstallmentValue] = useState(() => {
    if (editingDebt?.totalAmount && editingDebt?.installmentsCount) {
      const val = editingDebt.totalAmount / editingDebt.installmentsCount;
      return val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    return '';
  });
  const [installmentsCount, setInstallmentsCount] = useState(editingDebt?.installmentsCount?.toString() || '1');
  const [firstDueDate, setFirstDueDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [category, setCategory] = useState(editingDebt?.category || CATEGORIES[0].name);
  const [loading, setLoading] = useState(false);

  const activeCategory = CATEGORIES.find(c => c.name === category) || CATEGORIES[CATEGORIES.length - 1];

  const handleInstallmentValueChange = (val: string) => {
    setInstallmentValue(val);
    const v = parseCurrencyToNumber(val);
    const c = parseInt(installmentsCount);
    if (!isNaN(v) && !isNaN(c)) {
      setAmount((v * c).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
    }
  };

  const handleInstallmentsCountChange = (val: string) => {
    setInstallmentsCount(val);
    const c = parseInt(val);
    const v = parseCurrencyToNumber(installmentValue);
    const t = parseCurrencyToNumber(amount);
    
    if (!isNaN(c) && c > 0) {
      if (v > 0) {
        setAmount((v * c).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
      } else if (t > 0) {
        setInstallmentValue((t / c).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
      }
    }
  };

  const handleTotalAmountChange = (val: string) => {
    setAmount(val);
    const t = parseCurrencyToNumber(val);
    const c = parseInt(installmentsCount);
    if (!isNaN(t) && !isNaN(c) && c > 0) {
      setInstallmentValue((t / c).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const totalAmt = parseCurrencyToNumber(amount);
      const instCount = parseInt(installmentsCount);
      
      let debtId = editingDebt?.id;

      if (editingDebt) {
        await updateDebt(debtId, {
          title,
          totalAmount: totalAmt,
          installmentsCount: instCount,
          category
        });
      } else {
        debtId = await createDebt({
          title,
          totalAmount: totalAmt,
          installmentsCount: instCount,
          category
        });
      }

      // If it's a new debt or if critical values changed, we MUST replace installments
      // To avoid duplicates, we delete existing installments before creating new ones
      const totalChanged = editingDebt && Math.abs(editingDebt.totalAmount - totalAmt) > 0.001;
      const countChanged = editingDebt && parseInt(editingDebt.installmentsCount?.toString() || '0') !== instCount;
      
      if (!editingDebt || totalChanged || countChanged || confirm('Deseja refazer as parcelas com os novos dados?')) {
        await deleteInstallmentsByDebtId(debtId);
        
        const instAmt = totalAmt / instCount;
        const installments = [];
        const baseDate = new Date(firstDueDate + 'T12:00:00');

        for (let i = 0; i < instCount; i++) {
          installments.push({
            number: i + 1,
            totalInstallments: instCount,
            amount: instAmt,
            dueDate: addMonths(baseDate, i)
          });
        }

        await createInstallments(debtId, installments);
      }

      onRefresh();
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className={`${isDark ? 'bg-zinc-800 text-white' : 'bg-white text-zinc-900'} rounded-[32px] w-full max-w-lg overflow-hidden shadow-2xl`}
      >
        <div className="p-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold tracking-tight">{editingDebt ? 'Editar Dívida' : 'Nova Dívida'}</h2>
            <button onClick={onClose} className="p-2 hover:bg-zinc-100/10 rounded-full transition-colors">
              <LogOut className="rotate-45" size={20} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="text-xs uppercase tracking-wider font-semibold text-zinc-400 block mb-2">Título</label>
              <input 
                required
                value={title}
                onChange={e => setTitle(e.target.value)}
                className={`w-full ${isDark ? 'bg-zinc-900' : 'bg-zinc-50'} border-none rounded-2xl p-4 focus:ring-2 focus:ring-zinc-900 transition-all outline-none`} 
                placeholder="Ex: Notebook novo"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs uppercase tracking-wider font-semibold text-zinc-400 block mb-2">Valor da Parcela (R$)</label>
                <CurrencyInput 
                  value={installmentValue}
                  onChange={handleInstallmentValueChange}
                  className={`w-full ${isDark ? 'bg-zinc-900 text-white' : 'bg-zinc-50 text-zinc-900'} border-none rounded-2xl p-4 focus:ring-2 focus:ring-zinc-900 transition-all outline-none`} 
                  placeholder="0,00"
                  isDark={isDark}
                />
              </div>
              <div>
                <label className="text-xs uppercase tracking-wider font-semibold text-zinc-400 block mb-2">Qtd de Parcelas</label>
                <input 
                  required
                  type="number"
                  min="1"
                  value={installmentsCount}
                  onChange={e => handleInstallmentsCountChange(e.target.value)}
                  className={`w-full ${isDark ? 'bg-zinc-900 text-white' : 'bg-zinc-50 text-zinc-900'} border-none rounded-2xl p-4 focus:ring-2 focus:ring-zinc-900 transition-all outline-none`} 
                />
              </div>
            </div>

            <div>
              <label className="text-xs uppercase tracking-wider font-semibold text-zinc-400 block mb-2 text-center">Ou informe o Valor Total</label>
              <CurrencyInput 
                required
                value={amount}
                onChange={handleTotalAmountChange}
                className={`w-full ${isDark ? 'bg-emerald-500/10 text-emerald-500' : 'bg-emerald-50 text-emerald-700'} border-none rounded-2xl p-4 focus:ring-2 focus:ring-emerald-500 transition-all outline-none font-bold text-center text-xl`} 
                placeholder="Total: R$ 0,00"
                isDark={isDark}
              />
            </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs uppercase tracking-wider font-semibold text-zinc-400 block mb-2">Data da 1ª Parcela</label>
                  <input 
                    required
                    type="date"
                    value={firstDueDate}
                    onChange={e => setFirstDueDate(e.target.value)}
                    className={`w-full ${isDark ? 'bg-zinc-900' : 'bg-zinc-50'} border-none rounded-2xl p-4 focus:ring-2 focus:ring-zinc-900 transition-all outline-none`} 
                  />
                </div>
                <div>
                  <label className="text-xs uppercase tracking-wider font-semibold text-zinc-400 block mb-2">Categoria</label>
                  <div className="grid grid-cols-4 gap-2">
                    {CATEGORIES.map((c) => (
                      <button
                        key={c.name}
                        type="button"
                        onClick={() => setCategory(c.name)}
                        title={c.name}
                        className={`aspect-square rounded-xl flex items-center justify-center transition-all ${
                          category === c.name 
                            ? `${isDark ? 'bg-emerald-500' : 'bg-zinc-900'} text-white shadow-lg` 
                            : `${isDark ? 'bg-zinc-900 text-zinc-500' : 'bg-zinc-100 text-zinc-400'} hover:bg-zinc-200`
                        }`}
                      >
                        <c.icon size={20} />
                      </button>
                    ))}
                  </div>
                </div>
              </div>

            <button 
              type="submit"
              disabled={loading}
              className={`w-full ${isDark ? 'bg-white text-zinc-900' : 'bg-zinc-900 text-white'} rounded-2xl py-4 font-bold hover:opacity-90 transition-all mt-4 flex items-center justify-center`}
            >
              {loading ? 'Salvando...' : editingDebt ? 'Atualizar Dívida' : 'Adicionar Dívida'}
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
};

// --- Main Page ---

export default function DashboardPage() {
  const { user, loading, login, register, logout, resetPassword } = useFirebase();
  const [debts, setDebts] = useState<any[]>([]);
  const [installments, setInstallments] = useState<any[]>([]);
  const [income, setIncomeValue] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCalcOpen, setIsCalcOpen] = useState(false);
  const [isIncomeOpen, setIsIncomeOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [editingDebt, setEditingDebt] = useState<any>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  
  const [isDark, setIsDark] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  const getChartData = () => {
    // Generate data for the last 6 months
    const data = [];
    for (let i = 5; i >= 0; i--) {
      const d = subMonths(new Date(), i);
      const m = d.getMonth();
      const y = d.getFullYear();
      
      const monthLabel = format(d, 'MMM', { locale: ptBR });
      
      // We'd ideally sum this from DB, but for now we'll estimate or filter from installments
      // To keep it reactive, let's use the installments we have (might only be current)
      const monthInsts = installments.filter(inst => {
        const instDate = inst.dueDate.toDate();
        return instDate.getMonth() === m && instDate.getFullYear() === y;
      });
      
      const spending = monthInsts.reduce((acc, curr) => acc + curr.amount, 0);
      const paid = monthInsts.filter(inst => inst.status === 'paid').reduce((acc, curr) => acc + curr.amount, 0);
      
      data.push({
        name: monthLabel,
        gastos: spending,
        pago: paid,
        renda: income
      });
    }
    return data;
  };

  useEffect(() => {
    const saved = localStorage.getItem('dividaZero_isDark');
    if (saved === 'true') {
      setTimeout(() => setIsDark(true), 0);
    }
    setTimeout(() => setIsMounted(true), 0);
  }, []);

  useEffect(() => {
    if (isMounted) {
      localStorage.setItem('dividaZero_isDark', isDark.toString());
    }
  }, [isDark, isMounted]);

  useEffect(() => {
    if (!user) return;
    
    const unsubIncome = subscribeToIncome(user.uid, (val) => {
      setIncomeValue(val);
    });

    const unsubDebts = subscribeToDebts((d) => {
      setDebts(d);
    });

    const unsubInst = subscribeToInstallmentsByMonth(
      currentMonth.getMonth(),
      currentMonth.getFullYear(),
      (insts) => {
        setInstallments(insts);
      }
    );

    return () => {
      unsubIncome();
      unsubDebts();
      unsubInst();
    };
  }, [user, currentMonth]);

  const totalDebt = debts.reduce((acc, curr) => acc + (curr.totalAmount || 0), 0);
  const monthPending = installments
    .filter(i => i.status === 'pending')
    .reduce((acc, curr) => acc + (curr.amount || 0), 0);
  const monthPaid = installments
    .filter(i => i.status === 'paid')
    .reduce((acc, curr) => acc + (curr.amount || 0), 0);

  const balance = income - monthPending;

  const handleStatusToggle = async (id: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'paid' ? 'pending' : 'paid';
    await updateInstallmentStatus(id, nextStatus as any);
  };

  const handleDeleteDebt = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir esta dívida? Todas as parcelas serão removidas.')) {
      await deleteDebt(id);
    }
  };

  const handleDeleteInstallment = async (id: string) => {
    if (confirm('Esta parcela parece estar sem uma dívida vinculada. Deseja removê-la?')) {
      await deleteInstallment(id);
    }
  };

  const handleEditDebt = (debtId: string) => {
    const debt = debts.find(d => d.id === debtId);
    if (debt) {
      setEditingDebt(debt);
      setIsModalOpen(true);
    }
  };

  const handleMarkAllPaid = async () => {
    if (confirm('Marcar todas as parcelas deste mês como pagas?')) {
      const pending = installments.filter(i => i.status === 'pending');
      await Promise.all(pending.map(i => updateInstallmentStatus(i.id, 'paid')));
    }
  };

  const handleClearCurrentMonth = async () => {
    if (confirm('Tem certeza que deseja apagar todas as parcelas visíveis neste mês?')) {
      await Promise.all(installments.map(i => deleteInstallment(i.id)));
    }
  };

  const handleClearAll = async () => {
    const confirmed = confirm('ATENÇÃO: Isso apagará TODOS os seus dados. Esta ação não pode ser desfeita. Deseja continuar?');
    if (confirmed) {
      await clearAllUserData();
      window.location.reload();
    }
  };

  if (loading) return <LoadingScreen />;
  if (!user) return <LoginScreen onLogin={login} onRegister={register} onResetPassword={resetPassword} />;

  return (
    <div className={`min-h-screen transition-colors duration-300 relative overflow-hidden ${isDark ? 'bg-zinc-950 text-zinc-100' : 'bg-[#f0f2f5] text-zinc-900'}`}>
      {/* Background Stylized Elements */}
      <div className="absolute inset-0 pointer-events-none opacity-20">
        <div className={`absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full blur-[120px] ${isDark ? 'bg-emerald-900' : 'bg-emerald-200'}`} />
        <div className={`absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full blur-[120px] ${isDark ? 'bg-blue-900' : 'bg-blue-200'}`} />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 relative z-10">
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between mb-12 gap-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className={`w-12 h-12 ${isDark ? 'bg-white text-zinc-900' : 'bg-zinc-900 text-white'} rounded-2xl shadow-xl flex items-center justify-center`}>
                <TrendingUp size={24} />
              </div>
              <h1 className="text-3xl font-black tracking-tight italic">DÍVIDAZERO</h1>
            </div>
            <p className={`${isDark ? 'text-zinc-400' : 'text-zinc-500'} font-medium`}>Bem-vindo, {user.displayName?.split(' ')[0]}.</p>
          </div>

          <div className="flex items-center gap-3 bg-white/5 p-2 rounded-[28px] backdrop-blur-md border border-white/10 shadow-xl">
            <button 
              onClick={() => setIsSettingsOpen(!isSettingsOpen)}
              className={`p-3 rounded-2xl transition-all ${isDark ? 'bg-zinc-800 text-zinc-400 hover:text-white' : 'bg-white text-zinc-400 hover:text-zinc-900 shadow-sm'} border border-transparent hover:border-zinc-500/20`}
            >
              <Settings2 size={20} />
            </button>

            <button 
              onClick={() => setIsDark(!isDark)}
              className={`p-3 rounded-2xl transition-all ${isDark ? 'bg-zinc-800 text-amber-400 hover:bg-zinc-700' : 'bg-white text-zinc-400 hover:text-zinc-900 shadow-sm'}`}
              title={isDark ? "Modo Claro" : "Modo Escuro"}
            >
              {isDark ? <Sun size={20} /> : <Moon size={20} />}
            </button>

            <button 
              onClick={() => setIsCalcOpen(true)}
              className={`p-3 rounded-2xl transition-all ${isDark ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700' : 'bg-white text-zinc-400 hover:text-zinc-900 shadow-sm'}`}
              title="Calculadora"
            >
              <Calculator size={20} />
            </button>

            <button 
              onClick={() => setIsIncomeOpen(true)}
              className={`p-3 rounded-2xl transition-all ${isDark ? 'bg-zinc-800 text-emerald-400 hover:bg-zinc-700' : 'bg-white text-emerald-600 hover:text-emerald-700 shadow-sm'}`}
              title="Minha Renda"
            >
              <Wallet size={20} />
            </button>

            <div className={`h-8 w-[1px] ${isDark ? 'bg-zinc-800' : 'bg-zinc-200'} mx-1 hidden md:block`}></div>

            <button 
              onClick={() => {
                setEditingDebt(null);
                setIsModalOpen(true);
              }}
              className={`${isDark ? 'bg-emerald-500 text-white' : 'bg-zinc-900 text-white'} px-6 py-3 rounded-2xl font-bold hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-2 shadow-xl shadow-emerald-500/20`}
            >
              <Plus size={20} />
              <span className="hidden sm:inline">Nova Dívida</span>
            </button>
            
            <button 
              onClick={logout}
              className={`p-3 rounded-2xl transition-all ${isDark ? 'bg-zinc-800 text-rose-400 hover:bg-zinc-700' : 'bg-white text-zinc-400 hover:text-rose-500 shadow-sm'}`}
              title="Sair"
            >
              <LogOut size={20} />
            </button>
          </div>
        </header>

        <AnimatePresence>
          {isSettingsOpen && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className={`mb-8 p-6 rounded-[32px] border ${isDark ? 'bg-zinc-900/50 border-zinc-800' : 'bg-white border-zinc-100 shadow-sm'} flex items-center justify-between`}
            >
              <div>
                <h3 className="font-bold text-lg">Configurações Avançadas</h3>
                <p className="text-zinc-500 text-sm">Gerencie seus dados e conta de forma global</p>
              </div>
              <div className="flex gap-4">
                <button 
                  onClick={handleClearAll}
                  className="flex items-center gap-2 px-6 py-3 rounded-2xl border-2 border-rose-500/20 text-rose-500 font-bold text-sm hover:bg-rose-500 hover:text-white transition-all"
                >
                  <Trash2 size={18} /> LIMPAR TUDO
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Financial Flow Chart */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`mb-8 p-8 rounded-[32px] border ${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-100 shadow-sm'}`}
        >
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-xl font-bold flex items-center gap-2">
                <BarChart3 className="text-emerald-500" size={24} />
                Fluxo Financeiro
              </h2>
              <p className="text-zinc-500 text-sm">Visualização de gastos vs renda (últimos 6 meses)</p>
            </div>
          </div>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={getChartData()}>
                <defs>
                  <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorSpent" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? '#27272a' : '#f4f4f5'} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#71717a', fontSize: 12}} />
                <YAxis hide />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: isDark ? '#18181b' : '#fff', 
                    borderRadius: '16px', 
                    border: 'none', 
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' 
                  }}
                  itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                />
                <Area type="monotone" dataKey="renda" stroke="#10b981" fillOpacity={1} fill="url(#colorIncome)" strokeWidth={3} />
                <Area type="monotone" dataKey="gastos" stroke="#ef4444" fillOpacity={1} fill="url(#colorSpent)" strokeWidth={3} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <div onClick={() => setIsIncomeOpen(true)} className="cursor-pointer hover:scale-[1.02] transition-transform active:scale-95 flex flex-1">
            <StatCard 
              title="Minha Renda" 
              value={income} 
              icon={Banknote} 
              colorClass="bg-emerald-500/20 text-emerald-500" 
              delay={0}
              isDark={isDark}
            />
          </div>
          <StatCard 
            title="Saldo Disponível" 
            value={balance} 
            icon={DollarSign} 
            colorClass={balance < 0 ? "bg-rose-500/20 text-rose-500" : "bg-blue-500/20 text-blue-500"} 
            delay={0.1}
            isDark={isDark}
          />
          <StatCard 
            title="Pendente (Mês)" 
            value={monthPending} 
            icon={Clock} 
            colorClass="bg-amber-500/20 text-amber-500" 
            delay={0.2}
            isDark={isDark}
          />
          <StatCard 
            title="Dívida Total" 
            value={totalDebt} 
            icon={Layers} 
            colorClass={isDark ? "bg-white/10 text-white" : "bg-zinc-100 text-zinc-900"} 
            delay={0.3}
            isDark={isDark}
          />
        </div>

        <div className="flex justify-center">
          {/* Central Column: Monthly Installments */}
          <div className="w-full max-w-4xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold tracking-tight">Parcelas de {format(currentMonth, 'MMMM', { locale: ptBR })}</h2>
              <div className="flex items-center gap-3">
                <div className="hidden sm:flex items-center gap-2 mr-2">
                  <button 
                    onClick={handleMarkAllPaid}
                    className={`flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest px-3 py-2 rounded-xl transition-all ${isDark ? 'bg-emerald-500/20 text-emerald-500 hover:bg-emerald-500/30' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'}`}
                    title="Marcar todas como pagas"
                  >
                    <CheckCircle2 size={14} /> Pagar Todas
                  </button>
                  <button 
                    onClick={handleClearCurrentMonth}
                    className={`flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest px-3 py-2 rounded-xl transition-all ${isDark ? 'bg-rose-500/20 text-rose-500 hover:bg-rose-500/30' : 'bg-rose-50 text-rose-500 hover:bg-rose-100'}`}
                    title="Remover parcelas deste mês"
                  >
                    <Trash2 size={14} /> Limpar Mês
                  </button>
                </div>

                <div className={`flex items-center gap-2 p-1 rounded-xl border ${isDark ? 'bg-zinc-800 border-zinc-700' : 'bg-white border-zinc-100'}`}>
                  <button 
                    onClick={() => setCurrentMonth(addMonths(currentMonth, -1))}
                    className="p-2 hover:bg-zinc-700/50 rounded-lg transition-colors text-zinc-400 hover:text-zinc-200"
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <span className="text-sm font-bold w-32 text-center capitalize">
                    {format(currentMonth, 'MMM yyyy', { locale: ptBR })}
                  </span>
                  <button 
                    onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                    className="p-2 hover:bg-zinc-700/50 rounded-lg transition-colors text-zinc-400 hover:text-zinc-200"
                  >
                    <ChevronRight size={18} />
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <AnimatePresence mode="popLayout">
                {installments.length === 0 ? (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className={`${isDark ? 'bg-zinc-900/30 border-zinc-800' : 'bg-white/50 border-zinc-200'} border border-dashed rounded-[24px] p-12 text-center`}
                  >
                    <Calendar className="mx-auto text-zinc-500 mb-4 opacity-30" size={48} />
                    <p className="text-zinc-500 font-medium">Nenhuma parcela agendada para este mês.</p>
                  </motion.div>
                ) : (
                  installments.map((inst, idx) => {
                    const debt = debts.find(d => d.id === inst.debtId);
                    const isPaid = inst.status === 'paid';
                    const categoryConfig = CATEGORIES.find(c => c.name === debt?.category);
                    
                    return (
                      <motion.div
                        key={inst.id}
                        layout
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        className={`group flex items-center justify-between p-5 rounded-[32px] border transition-all ${
                          isDark 
                          ? `bg-zinc-900/50 ${isPaid ? 'border-transparent opacity-40' : 'border-zinc-800 hover:border-zinc-700 shadow-xl shadow-black/5'}`
                          : `bg-white ${isPaid ? 'border-zinc-50 opacity-60' : 'border-zinc-100 hover:border-zinc-200 shadow-sm'}`
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          <div 
                            onClick={() => handleStatusToggle(inst.id, inst.status)}
                            className={`w-12 h-12 rounded-2xl flex items-center justify-center cursor-pointer transition-all ${
                              isPaid 
                              ? 'bg-emerald-500/20 text-emerald-500' 
                              : (categoryConfig?.bg || (isDark ? 'bg-zinc-800 text-zinc-500' : 'bg-zinc-50 text-zinc-400')) + ' hover:bg-emerald-500/10 shadow-sm'
                            }`}
                            style={{ color: isPaid ? undefined : categoryConfig?.color }}
                          >
                            {isPaid ? <CheckCircle2 size={24} /> : categoryConfig ? <categoryConfig.icon size={24} /> : <div className={`w-6 h-6 rounded-lg border-2 border-current opacity-50`}></div>}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className={`font-bold leading-tight text-lg ${isPaid ? 'line-through text-zinc-500' : isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
                                {debt?.title || 'Dívida Removida'}
                              </h3>
                              {debt && (
                                <span 
                                  className="text-[8px] font-black uppercase px-2 py-0.5 rounded-full border border-current opacity-60"
                                  style={{ color: categoryConfig?.color }}
                                >
                                  {debt.category}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-3 mt-1">
                              <p className={`text-xs ${isDark ? 'text-zinc-500' : 'text-zinc-400'} font-semibold tracking-wide uppercase flex items-center gap-2`}>
                                <span>Parcela {inst.number}/{inst.totalInstallments}</span> 
                                <span>•</span>
                                <span>Vence dia {format(inst.dueDate.toDate(), 'dd')}</span>
                              </p>
                              <div className="flex items-center gap-3 ml-2 border-l border-zinc-200 dark:border-zinc-800 pl-3">
                                {debt && (
                                  <button 
                                    onClick={(e) => { e.stopPropagation(); handleEditDebt(debt.id); }}
                                    className="flex items-center gap-1 text-[10px] font-bold text-zinc-400 hover:text-emerald-500 transition-colors uppercase bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-md"
                                  >
                                    <Edit2 size={10} /> Editar
                                  </button>
                                )}
                                <button 
                                  onClick={(e) => { 
                                    e.stopPropagation(); 
                                    if (debt) handleDeleteDebt(debt.id);
                                    else handleDeleteInstallment(inst.id);
                                  }}
                                  className="flex items-center gap-1 text-[10px] font-bold text-zinc-400 hover:text-rose-500 transition-colors uppercase bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-md"
                                >
                                  <Trash2 size={10} /> {debt ? 'Excluir' : 'Limpar'}
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`font-black tracking-tight text-xl ${isPaid ? 'text-zinc-500' : isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
                            R$ {inst.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {isModalOpen && (
          <DebtModal 
            key={editingDebt?.id || 'new-debt'}
            isOpen={isModalOpen} 
            onClose={() => {
              setIsModalOpen(false);
              setEditingDebt(null);
            }} 
            onRefresh={() => {}} // Not needed with subscriptions
            editingDebt={editingDebt}
            isDark={isDark}
          />
        )}

        {isCalcOpen && (
          <CalculatorModal 
            isOpen={isCalcOpen}
            onClose={() => setIsCalcOpen(false)}
            isDark={isDark}
          />
        )}

        {isIncomeOpen && (
          <IncomeModal 
            key={`income-${income}`}
            isOpen={isIncomeOpen}
            onClose={() => setIsIncomeOpen(false)}
            currentIncome={income}
            isDark={isDark}
          />
        )}
      </div>
    </div>
  );
}
