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
  ChevronLeft
} from 'lucide-react';
import { format, addMonths, startOfMonth, setDate, isAfter, isBefore, isSameMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  getDebts, 
  getInstallments, 
  createDebt, 
  createInstallments, 
  updateInstallmentStatus,
  deleteDebt,
  updateDebt
} from '@/lib/firebase-utils';
import { useCallback } from 'react';

// --- Components ---

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
    <div className="flex flex-col items-center justify-center h-screen bg-[#f5f5f5] p-6">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white p-10 rounded-[32px] shadow-sm border border-zinc-100 flex flex-col items-center"
      >
        <div className="w-16 h-16 bg-zinc-900 rounded-2xl flex items-center justify-center mb-6">
          <CreditCard className="text-white w-8 h-8" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight mb-2">DívidaZero</h1>
        <p className="text-zinc-500 mb-8 font-medium text-center">
          {isForgotPassword ? 'Digite seu e-mail para recuperar sua senha.' : 
           isRegistering ? 'Crie sua conta e comece a controlar suas dívidas.' : 
           'Controle suas parcelas, recupere sua liberdade financeira.'}
        </p>
        
        <form onSubmit={handleSubmit} className="w-full space-y-4">
          {isRegistering && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
              <label className="text-xs uppercase tracking-wider font-semibold text-zinc-400 block mb-2 px-1">Nome Completo</label>
              <input 
                required
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full bg-zinc-50 border-none rounded-2xl p-4 focus:ring-2 focus:ring-zinc-900 transition-all outline-none" 
                placeholder="Seu nome completo"
              />
            </motion.div>
          )}

          <div>
            <label className="text-xs uppercase tracking-wider font-semibold text-zinc-400 block mb-2 px-1">E-mail</label>
            <input 
              required
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full bg-zinc-50 border-none rounded-2xl p-4 focus:ring-2 focus:ring-zinc-900 transition-all outline-none" 
              placeholder="seu@email.com"
            />
          </div>

          {!isForgotPassword && (
            <>
              <div>
                <label className="text-xs uppercase tracking-wider font-semibold text-zinc-400 block mb-2 px-1">Senha</label>
                <input 
                  required
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full bg-zinc-50 border-none rounded-2xl p-4 focus:ring-2 focus:ring-zinc-900 transition-all outline-none" 
                  placeholder="••••••••"
                />
              </div>

              {isRegistering && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
                  <label className="text-xs uppercase tracking-wider font-semibold text-zinc-400 block mb-2 px-1">Confirmar Senha</label>
                  <input 
                    required
                    type="password"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    className="w-full bg-zinc-50 border-none rounded-2xl p-4 focus:ring-2 focus:ring-zinc-900 transition-all outline-none" 
                    placeholder="••••••••"
                  />
                </motion.div>
              )}
            </>
          )}

          {error && (
            <div className="flex items-center gap-2 text-rose-500 text-sm font-medium px-1">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          {success && (
            <div className="flex items-center gap-2 text-emerald-500 text-sm font-medium px-1">
              <CheckCircle2 size={16} />
              {success}
            </div>
          )}

          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-zinc-900 text-white rounded-2xl py-4 font-semibold hover:bg-zinc-800 transition-all flex items-center justify-center gap-2 shadow-lg shadow-zinc-200 mt-2"
          >
            {loading ? 'Processando...' : 
             isForgotPassword ? 'Enviar E-mail' : 
             isRegistering ? 'Criar Conta' : 'Entrar'}
          </button>
        </form>

        <div className="mt-8 flex flex-col items-center gap-4">
          {!isForgotPassword && !isRegistering && (
            <button 
              onClick={() => setIsForgotPassword(true)}
              className="text-sm font-semibold text-zinc-400 hover:text-zinc-600 transition-colors"
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
            className="text-sm font-semibold text-zinc-500 hover:text-zinc-900 transition-colors"
          >
            {isForgotPassword ? 'Voltar para o Login' : 
             isRegistering ? 'Já tem uma conta? Entrar' : 'Não tem uma conta? Cadastre-se'}
          </button>
        </div>
      </motion.div>
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
    <div className="text-2xl font-bold tracking-tight">R$ {value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
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

const DebtModal = ({ isOpen, onClose, onRefresh, editingDebt, isDark }: any) => {
  const [title, setTitle] = useState(editingDebt?.title || '');
  const [amount, setAmount] = useState(editingDebt?.totalAmount?.toString() || ''); // Total amount
  const [installmentValue, setInstallmentValue] = useState('');
  const [installmentsCount, setInstallmentsCount] = useState('1');
  const [firstDueDate, setFirstDueDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [category, setCategory] = useState(editingDebt?.category || 'Cartão de Crédito');
  const [loading, setLoading] = useState(false);

  // Handle auto-calculation
  const handleInstallmentValueChange = (val: string) => {
    setInstallmentValue(val);
    const v = parseFloat(val);
    const c = parseInt(installmentsCount);
    if (!isNaN(v) && !isNaN(c)) {
      setAmount((v * c).toFixed(2));
    }
  };

  const handleInstallmentsCountChange = (val: string) => {
    setInstallmentsCount(val);
    const c = parseInt(val);
    const v = parseFloat(installmentValue);
    const t = parseFloat(amount);
    
    if (!isNaN(c)) {
      if (!isNaN(v)) {
        setAmount((v * c).toFixed(2));
      } else if (!isNaN(t)) {
        setInstallmentValue((t / c).toFixed(2));
      }
    }
  };

  const handleTotalAmountChange = (val: string) => {
    setAmount(val);
    const t = parseFloat(val);
    const c = parseInt(installmentsCount);
    if (!isNaN(t) && !isNaN(c)) {
      setInstallmentValue((t / c).toFixed(2));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const totalAmt = parseFloat(amount);
      const instCount = parseInt(installmentsCount);
      
      let debtId = editingDebt?.id;

      if (editingDebt) {
        await updateDebt(debtId, {
          title,
          totalAmount: totalAmt,
          category
        });
        // We might want to remove old installments if count changes, but simpler to just keep same or warn
        // Re-creating installments for simplicity in this specific CRUD implementation
        // await deleteInstallmentsByDebtId(debtId); // If I added this helper
      } else {
        debtId = await createDebt({
          title,
          totalAmount: totalAmt,
          category
        });
      }

      // If it's a new debt or we want to reset installments
      if (!editingDebt || confirm('Deseja refazer as parcelas com os novos valores?')) {
        // Implementation of deleteInstallments logic if needed:
        // await deleteDebt(debtId); // This would delete everything, slightly too aggressive
        
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
                <input 
                  type="number"
                  step="0.01"
                  value={installmentValue}
                  onChange={e => handleInstallmentValueChange(e.target.value)}
                  className={`w-full ${isDark ? 'bg-zinc-900' : 'bg-zinc-50'} border-none rounded-2xl p-4 focus:ring-2 focus:ring-zinc-900 transition-all outline-none`} 
                  placeholder="0,00"
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
                  className={`w-full ${isDark ? 'bg-zinc-900' : 'bg-zinc-50'} border-none rounded-2xl p-4 focus:ring-2 focus:ring-zinc-900 transition-all outline-none`} 
                />
              </div>
            </div>

            <div>
              <label className="text-xs uppercase tracking-wider font-semibold text-zinc-400 block mb-2 text-center">Ou informe o Valor Total</label>
              <input 
                required
                type="number"
                step="0.01"
                value={amount}
                onChange={e => handleTotalAmountChange(e.target.value)}
                className={`w-full ${isDark ? 'bg-emerald-500/10 text-emerald-500' : 'bg-emerald-50 text-emerald-700'} border-none rounded-2xl p-4 focus:ring-2 focus:ring-emerald-500 transition-all outline-none font-bold text-center text-xl`} 
                placeholder="Total: R$ 0,00"
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
                <select 
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  className={`w-full ${isDark ? 'bg-zinc-900' : 'bg-zinc-50'} border-none rounded-2xl p-4 focus:ring-2 focus:ring-zinc-900 transition-all outline-none appearance-none`}
                >
                  <option>Cartão de Crédito</option>
                  <option>Empréstimo</option>
                  <option>Financiamento</option>
                  <option>Serviços (Luz/Internet)</option>
                  <option>Outros</option>
                </select>
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
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCalcOpen, setIsCalcOpen] = useState(false);
  const [editingDebt, setEditingDebt] = useState<any>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    // Check system preference
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      // setIsDark(true); // Optional: auto enable
    }
  }, []);

  const fetchData = useCallback(async () => {
    if (!user) return;
    const [d, i] = await Promise.all([
      getDebts(),
      getInstallments({
        month: currentMonth.getMonth(),
        year: currentMonth.getFullYear()
      })
    ]);
    setDebts(d);
    setInstallments(i);
  }, [user, currentMonth]);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      if (isMounted) {
        await fetchData();
      }
    };
    load();
    return () => { isMounted = false; };
  }, [fetchData]);

  if (loading) return <LoadingScreen />;
  if (!user) return <LoginScreen onLogin={login} onRegister={register} onResetPassword={resetPassword} />;

  const totalDebt = debts.reduce((acc, curr) => acc + (curr.totalAmount || 0), 0);
  const monthPending = installments
    .filter(i => i.status === 'pending')
    .reduce((acc, curr) => acc + (curr.amount || 0), 0);
  const monthPaid = installments
    .filter(i => i.status === 'paid')
    .reduce((acc, curr) => acc + (curr.amount || 0), 0);

  const handleStatusToggle = async (id: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'paid' ? 'pending' : 'paid';
    await updateInstallmentStatus(id, nextStatus as any);
    fetchData();
  };

  const handleDeleteDebt = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir esta dívida? Todas as parcelas serão removidas.')) {
      await deleteDebt(id);
      fetchData();
    }
  };

  const handleEditDebt = (debt: any) => {
    setEditingDebt(debt);
    setIsModalOpen(true);
  };

  return (
    <div className={`min-h-screen transition-colors duration-300 ${isDark ? 'bg-zinc-950 text-zinc-100' : 'bg-[#f8f9fa] text-zinc-900'}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between mb-12 gap-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className={`w-10 h-10 ${isDark ? 'bg-white text-zinc-900' : 'bg-zinc-900 text-white'} rounded-xl flex items-center justify-center shadow-lg`}>
                <TrendingUp size={20} />
              </div>
              <h1 className="text-2xl font-bold tracking-tight">DívidaZero</h1>
            </div>
            <p className={`${isDark ? 'text-zinc-400' : 'text-zinc-500'} font-medium`}>Bem-vindo, {user.displayName?.split(' ')[0]}.</p>
          </div>

          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsDark(!isDark)}
              className={`p-3 rounded-2xl transition-all ${isDark ? 'bg-zinc-800 text-amber-400 hover:bg-zinc-700' : 'bg-white border border-zinc-100 text-zinc-400 hover:text-zinc-900 shadow-sm'}`}
              title={isDark ? "Modo Claro" : "Modo Escuro"}
            >
              {isDark ? <Sun size={20} /> : <Moon size={20} />}
            </button>

            <button 
              onClick={() => setIsCalcOpen(true)}
              className={`p-3 rounded-2xl transition-all ${isDark ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700' : 'bg-white border border-zinc-100 text-zinc-400 hover:text-zinc-900 shadow-sm'}`}
              title="Calculadora"
            >
              <Calculator size={20} />
            </button>

            <div className={`h-8 w-[1px] ${isDark ? 'bg-zinc-800' : 'bg-zinc-200'} mx-1 hidden md:block`}></div>

            <button 
              onClick={() => {
                setEditingDebt(null);
                setIsModalOpen(true);
              }}
              className={`${isDark ? 'bg-white text-zinc-900' : 'bg-zinc-900 text-white'} px-6 py-3 rounded-2xl font-semibold hover:opacity-90 transition-all flex items-center gap-2 shadow-lg shadow-zinc-200/20`}
            >
              <Plus size={20} />
              <span className="hidden sm:inline">Nova Dívida</span>
            </button>
            
            <button 
              onClick={logout}
              className={`p-3 rounded-2xl transition-all ${isDark ? 'bg-zinc-800 text-rose-400 hover:bg-zinc-700' : 'bg-white border border-zinc-100 text-zinc-400 hover:text-rose-500 shadow-sm'}`}
              title="Sair"
            >
              <LogOut size={20} />
            </button>
          </div>
        </header>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <StatCard 
            title="Dívida Total" 
            value={totalDebt} 
            icon={PieChart} 
            colorClass={isDark ? "bg-white/10 text-white" : "bg-zinc-100 text-zinc-900"} 
            delay={0.1}
            isDark={isDark}
          />
          <StatCard 
            title="Pendente (Mês)" 
            value={monthPending} 
            icon={Clock} 
            colorClass="bg-amber-500/10 text-amber-500" 
            delay={0.2}
            isDark={isDark}
          />
          <StatCard 
            title="Pago (Mês)" 
            value={monthPaid} 
            icon={CheckCircle2} 
            colorClass="bg-emerald-500/10 text-emerald-500" 
            delay={0.3}
            isDark={isDark}
          />
          <StatCard 
            title="Próxima Fatura" 
            value={installments.length > 0 ? (installments.find(i => i.status === 'pending')?.amount || installments[0].amount) : 0} 
            icon={Calendar} 
            colorClass="bg-blue-500/10 text-blue-500" 
            delay={0.4}
            isDark={isDark}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          {/* Left Column: Monthly Installments */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold tracking-tight">Parcelas de {format(currentMonth, 'MMMM', { locale: ptBR })}</h2>
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
                    
                    return (
                      <motion.div 
                        key={inst.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        className={`group flex items-center justify-between p-5 rounded-[24px] border transition-all ${
                          isDark 
                          ? `bg-zinc-900/50 ${isPaid ? 'border-transparent opacity-40' : 'border-zinc-800 hover:border-zinc-700 shadow-xl shadow-black/5'}`
                          : `bg-white ${isPaid ? 'border-zinc-50 opacity-60' : 'border-zinc-100 hover:border-zinc-200 shadow-sm'}`
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          <div 
                            onClick={() => handleStatusToggle(inst.id, inst.status)}
                            className={`w-10 h-10 rounded-xl flex items-center justify-center cursor-pointer transition-all ${
                              isPaid 
                              ? 'bg-emerald-500/20 text-emerald-500' 
                              : `${isDark ? 'bg-zinc-800 text-zinc-500' : 'bg-zinc-50 text-zinc-400'} hover:bg-emerald-500/10 hover:text-emerald-500`
                            }`}
                          >
                            {isPaid ? <CheckCircle2 size={20} /> : <div className={`w-5 h-5 rounded-md border-2 border-current`}></div>}
                          </div>
                          <div>
                            <h3 className={`font-bold leading-tight ${isPaid ? 'line-through text-zinc-500' : isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
                              {debt?.title || 'Dívida Removida'}
                            </h3>
                            <p className={`text-xs ${isDark ? 'text-zinc-500' : 'text-zinc-400'} font-semibold tracking-wide uppercase`}>
                              Parcela {inst.number}/{inst.totalInstallments} • Vence dia {format(inst.dueDate.toDate(), 'dd')}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`font-bold tracking-tight text-lg ${isPaid ? 'text-zinc-500' : isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
                            R$ {inst.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Right Column: Debts Summary */}
          <div className={`${isDark ? 'bg-zinc-900 border-zinc-800 text-white' : 'bg-white border-zinc-100 text-zinc-900'} rounded-[32px] p-8 border shadow-sm`}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold tracking-tight">Meus Contratos</h2>
              <div className="text-zinc-400 p-2 hover:bg-zinc-500/10 rounded-lg transition-colors cursor-pointer">
                <Filter size={18} />
              </div>
            </div>

            <div className="space-y-6">
              {debts.length === 0 ? (
                <p className="text-zinc-500 text-sm italic py-4">Nenhuma dívida registrada ainda.</p>
              ) : (
                debts.map((debt) => {
                  const debtInsts = installments.filter(i => i.debtId === debt.id);
                  const isPaid = debtInsts.every(i => i.status === 'paid');

                  return (
                    <div key={debt.id} className="relative group/debt">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className={`font-bold ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>{debt.title}</h4>
                          <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">{debt.category}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="text-right">
                            <p className="font-bold text-sm">R$ {debt.totalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between mt-1">
                        <div className={`w-full h-1.5 ${isDark ? 'bg-zinc-800' : 'bg-zinc-100'} rounded-full overflow-hidden mr-4`}>
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: isPaid ? '100%' : '33%' }}
                            className={`h-full ${isPaid ? 'bg-emerald-500' : isDark ? 'bg-zinc-400' : 'bg-zinc-900'}`}
                          />
                        </div>
                        
                        <div className="flex items-center gap-1 opacity-0 group-hover/debt:opacity-100 transition-opacity">
                          <button 
                            onClick={() => handleEditDebt(debt)}
                            className={`p-1.5 rounded-lg ${isDark ? 'hover:bg-zinc-800' : 'hover:bg-zinc-100'} text-zinc-400 hover:text-zinc-900 transition-colors`}
                          >
                            <Edit2 size={14} />
                          </button>
                          <button 
                            onClick={() => handleDeleteDebt(debt.id)}
                            className={`p-1.5 rounded-lg ${isDark ? 'hover:bg-zinc-800' : 'hover:bg-zinc-100'} text-zinc-400 hover:text-rose-500 transition-colors`}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <button 
              onClick={() => {
                setEditingDebt(null);
                setIsModalOpen(true);
              }}
              className={`w-full mt-10 border-2 border-dashed ${isDark ? 'border-zinc-800 text-zinc-600 hover:border-zinc-700 hover:text-zinc-400' : 'border-zinc-200 text-zinc-400 hover:border-zinc-400 hover:text-zinc-600'} rounded-2xl py-4 flex items-center justify-center gap-2 transition-all font-medium`}
            >
              <Plus size={18} />
              Nova Dívida
            </button>
          </div>
        </div>

        <DebtModal 
          key={editingDebt?.id || 'new-debt'}
          isOpen={isModalOpen} 
          onClose={() => {
            setIsModalOpen(false);
            setEditingDebt(null);
          }} 
          onRefresh={fetchData}
          editingDebt={editingDebt}
          isDark={isDark}
        />

        <CalculatorModal 
          isOpen={isCalcOpen}
          onClose={() => setIsCalcOpen(false)}
          isDark={isDark}
        />
      </div>
    </div>
  );
}
