'use client';

import React, { useState, useEffect } from 'react';
import { useFirebase } from '@/components/FirebaseProvider';
import { motion, AnimatePresence } from 'motion/react';
import Image from 'next/image';
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
  PieChart
} from 'lucide-react';
import { format, addMonths, startOfMonth, setDate, isAfter, isBefore, isSameMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  getDebts, 
  getInstallments, 
  createDebt, 
  createInstallments, 
  updateInstallmentStatus,
  deleteDebt
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

const LoginScreen = ({ onLogin }: { onLogin: () => void }) => (
  <div className="flex flex-col items-center justify-center h-screen bg-[#f5f5f5] p-6">
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-md w-full bg-white p-10 rounded-[32px] shadow-sm border border-zinc-100 flex flex-col items-center text-center"
    >
      <div className="w-16 h-16 bg-zinc-900 rounded-2xl flex items-center justify-center mb-6">
        <CreditCard className="text-white w-8 h-8" />
      </div>
      <h1 className="text-3xl font-bold tracking-tight mb-2">DívidaZero</h1>
      <p className="text-zinc-500 mb-8 font-medium">Controle suas parcelas, recupere sua liberdade financeira.</p>
      
      <button 
        onClick={onLogin}
        className="w-full bg-zinc-900 text-white rounded-2xl py-4 font-semibold hover:bg-zinc-800 transition-all flex items-center justify-center gap-2 shadow-lg shadow-zinc-200"
      >
        <div className="w-5 h-5 relative invert">
          <Image src="https://www.google.com/favicon.ico" alt="Google" fill referrerPolicy="no-referrer" />
        </div>
        Entrar com Google
      </button>
    </motion.div>
  </div>
);

const StatCard = ({ title, value, icon: Icon, colorClass, delay = 0 }: any) => (
  <motion.div 
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay }}
    className="bg-white p-6 rounded-[24px] shadow-sm border border-zinc-100 flex-1 min-w-[200px]"
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

const DebtModal = ({ isOpen, onClose, onRefresh }: any) => {
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [installmentsCount, setInstallmentsCount] = useState('1');
  const [firstDueDate, setFirstDueDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [category, setCategory] = useState('Cartão de Crédito');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const totalAmt = parseFloat(amount);
      const instCount = parseInt(installmentsCount);
      const debtId = await createDebt({
        title,
        totalAmount: totalAmt,
        category
      });

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
        className="bg-white rounded-[32px] w-full max-w-lg overflow-hidden shadow-2xl"
      >
        <div className="p-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold tracking-tight">Nova Dívida</h2>
            <button onClick={onClose} className="p-2 hover:bg-zinc-100 rounded-full transition-colors">
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
                className="w-full bg-zinc-50 border-none rounded-2xl p-4 focus:ring-2 focus:ring-zinc-900 transition-all outline-none" 
                placeholder="Ex: Notebook novo"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs uppercase tracking-wider font-semibold text-zinc-400 block mb-2">Valor Total</label>
                <input 
                  required
                  type="number"
                  step="0.01"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  className="w-full bg-zinc-50 border-none rounded-2xl p-4 focus:ring-2 focus:ring-zinc-900 transition-all outline-none" 
                  placeholder="0,00"
                />
              </div>
              <div>
                <label className="text-xs uppercase tracking-wider font-semibold text-zinc-400 block mb-2">Parcelas</label>
                <input 
                  required
                  type="number"
                  min="1"
                  value={installmentsCount}
                  onChange={e => setInstallmentsCount(e.target.value)}
                  className="w-full bg-zinc-50 border-none rounded-2xl p-4 focus:ring-2 focus:ring-zinc-900 transition-all outline-none" 
                />
              </div>
            </div>

            <div>
              <label className="text-xs uppercase tracking-wider font-semibold text-zinc-400 block mb-2">Data da 1ª Parcela</label>
              <input 
                required
                type="date"
                value={firstDueDate}
                onChange={e => setFirstDueDate(e.target.value)}
                className="w-full bg-zinc-50 border-none rounded-2xl p-4 focus:ring-2 focus:ring-zinc-900 transition-all outline-none" 
              />
            </div>

            <div>
              <label className="text-xs uppercase tracking-wider font-semibold text-zinc-400 block mb-2">Categoria</label>
              <select 
                value={category}
                onChange={e => setCategory(e.target.value)}
                className="w-full bg-zinc-50 border-none rounded-2xl p-4 focus:ring-2 focus:ring-zinc-900 transition-all outline-none appearance-none"
              >
                <option>Cartão de Crédito</option>
                <option>Empréstimo</option>
                <option>Financiamento</option>
                <option>Serviços (Luz/Internet)</option>
                <option>Outros</option>
              </select>
            </div>

            <button 
              type="submit"
              disabled={loading}
              className="w-full bg-zinc-900 text-white rounded-2xl py-4 font-bold hover:bg-zinc-800 transition-all mt-4 flex items-center justify-center"
            >
              {loading ? 'Salvando...' : 'Adicionar Dívida'}
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
};

// --- Main Page ---

export default function DashboardPage() {
  const { user, loading, login, logout } = useFirebase();
  const [debts, setDebts] = useState<any[]>([]);
  const [installments, setInstallments] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());

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
    fetchData();
  }, [fetchData]);

  if (loading) return <LoadingScreen />;
  if (!user) return <LoginScreen onLogin={login} />;

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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between mb-12 gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-zinc-900 rounded-xl flex items-center justify-center">
              <TrendingUp className="text-white w-5 h-5" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">DívidaZero</h1>
          </div>
          <p className="text-zinc-500 font-medium">Bem-vindo, {user.displayName?.split(' ')[0]}.</p>
        </div>

        <div className="flex items-center gap-4">
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-zinc-900 text-white px-6 py-3 rounded-2xl font-semibold hover:bg-zinc-800 transition-all flex items-center gap-2 shadow-lg shadow-zinc-200"
          >
            <Plus size={20} />
            Nova Dívida
          </button>
          
          <div className="h-10 w-[1px] bg-zinc-200 hidden md:block"></div>

          <button 
            onClick={logout}
            className="p-3 bg-white border border-zinc-100 rounded-2xl hover:bg-zinc-50 transition-colors text-zinc-400 hover:text-zinc-600"
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
          colorClass="bg-zinc-100 text-zinc-900" 
          delay={0.1}
        />
        <StatCard 
          title="Pendente (Mês)" 
          value={monthPending} 
          icon={Clock} 
          colorClass="bg-amber-50 text-amber-600" 
          delay={0.2}
        />
        <StatCard 
          title="Pago (Mês)" 
          value={monthPaid} 
          icon={CheckCircle2} 
          colorClass="bg-emerald-50 text-emerald-600" 
          delay={0.3}
        />
        <StatCard 
          title="Próxima Fatura" 
          value={installments.length > 0 ? installments[0].amount : 0} 
          icon={Calendar} 
          colorClass="bg-blue-50 text-blue-600" 
          delay={0.4}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Left Column: Monthly Installments */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold tracking-tight">Parcelas de {format(currentMonth, 'MMMM', { locale: ptBR })}</h2>
            <div className="flex items-center gap-2 bg-white p-1 rounded-xl border border-zinc-100">
              <button 
                onClick={() => setCurrentMonth(addMonths(currentMonth, -1))}
                className="p-2 hover:bg-zinc-50 rounded-lg transition-colors text-zinc-400"
              >
                <ChevronRight className="rotate-180" size={18} />
              </button>
              <span className="text-sm font-bold w-32 text-center capitalize">
                {format(currentMonth, 'MMM yyyy', { locale: ptBR })}
              </span>
              <button 
                onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                className="p-2 hover:bg-zinc-50 rounded-lg transition-colors text-zinc-400"
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
                  className="bg-white/50 border border-dashed border-zinc-200 rounded-[24px] p-12 text-center"
                >
                  <Calendar className="mx-auto text-zinc-300 mb-4" size={48} />
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
                      className={`group flex items-center justify-between p-5 rounded-[24px] bg-white border transition-all ${isPaid ? 'border-zinc-50 opacity-60' : 'border-zinc-100 hover:border-zinc-200 shadow-sm'}`}
                    >
                      <div className="flex items-center gap-4">
                        <div 
                          onClick={() => handleStatusToggle(inst.id, inst.status)}
                          className={`w-10 h-10 rounded-xl flex items-center justify-center cursor-pointer transition-all ${isPaid ? 'bg-emerald-50 text-emerald-600' : 'bg-zinc-50 text-zinc-400 hover:bg-zinc-100 group-hover:text-zinc-600'}`}
                        >
                          {isPaid ? <CheckCircle2 size={20} /> : <div className="w-5 h-5 rounded-md border-2 border-current"></div>}
                        </div>
                        <div>
                          <h3 className={`font-bold leading-tight ${isPaid ? 'line-through text-zinc-400' : 'text-zinc-900'}`}>
                            {debt?.title || 'Dívida Removida'}
                          </h3>
                          <p className="text-xs text-zinc-400 font-semibold tracking-wide uppercase">
                            Parcela {inst.number}/{inst.totalInstallments} • Vence dia {format(inst.dueDate.toDate(), 'dd')}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`font-bold tracking-tight text-lg ${isPaid ? 'text-zinc-400' : 'text-zinc-900'}`}>
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
        <div className="bg-white rounded-[32px] p-8 border border-zinc-100 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold tracking-tight">Meus Cartões/Dívidas</h2>
            <div className="text-zinc-400 p-2 hover:bg-zinc-50 rounded-lg transition-colors cursor-pointer">
              <Filter size={18} />
            </div>
          </div>

          <div className="space-y-6">
            {debts.length === 0 ? (
              <p className="text-zinc-400 text-sm italic py-4">Nenhuma dívida registrada ainda.</p>
            ) : (
              debts.map((debt, idx) => {
                const debtInsts = installments.filter(i => i.debtId === debt.id);
                const paidInMonth = debtInsts.some(i => i.status === 'paid');

                return (
                  <div key={debt.id} className="relative">
                    <div className="flex justify-between items-start mb-2 group">
                      <div>
                        <h4 className="font-bold text-zinc-900">{debt.title}</h4>
                        <p className="text-[10px] text-zinc-400 uppercase tracking-widest font-bold">{debt.category}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-right">
                          <p className="font-bold text-sm">R$ {debt.totalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                        </div>
                        <button 
                          onClick={() => handleDeleteDebt(debt.id)}
                          className="opacity-0 group-hover:opacity-100 p-1 text-zinc-300 hover:text-rose-500 transition-all"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                    {/* Progress Bar (Simple representation) */}
                    <div className="w-full h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: paidInMonth ? '100%' : '20%' }}
                        className={`h-full ${paidInMonth ? 'bg-emerald-400' : 'bg-zinc-900'}`}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <button 
            onClick={() => setIsModalOpen(true)}
            className="w-full mt-10 border-2 border-dashed border-zinc-200 text-zinc-400 rounded-2xl py-4 flex items-center justify-center gap-2 hover:border-zinc-400 hover:text-zinc-600 transition-all font-medium"
          >
            <Plus size={18} />
            Nova Dívida
          </button>
        </div>
      </div>

      <DebtModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onRefresh={fetchData}
      />
    </div>
  );
}
