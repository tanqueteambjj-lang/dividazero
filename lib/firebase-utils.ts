import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  serverTimestamp, 
  Timestamp,
  orderBy,
  writeBatch,
  onSnapshot,
  setDoc
} from 'firebase/firestore';
import { db, auth } from './firebase';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Debt Operations
export async function createDebt(data: {
  title: string;
  description?: string;
  totalAmount: number;
  installmentsCount: number;
  category: string;
  color?: string;
}) {
  const userId = auth.currentUser?.uid;
  if (!userId) throw new Error('User not authenticated');

  const path = 'debts';
  try {
    const docRef = await addDoc(collection(db, path), {
      ...data,
      userId,
      status: 'active',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
    throw error;
  }
}

export async function getDebts() {
  const userId = auth.currentUser?.uid;
  if (!userId) return [];

  const path = 'debts';
  try {
    const q = query(
      collection(db, path), 
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}

export function subscribeToDebts(callback: (debts: any[]) => void) {
  const userId = auth.currentUser?.uid;
  if (!userId) return () => {};
  
  const q = query(collection(db, 'debts'), where('userId', '==', userId), orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  });
}

export async function updateDebt(debtId: string, data: {
  title: string;
  description?: string;
  totalAmount: number;
  installmentsCount: number;
  category: string;
  color?: string;
}) {
  const path = `debts/${debtId}`;
  try {
    await updateDoc(doc(db, 'debts', debtId), {
      ...data,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
    throw error;
  }
}

// Installment Operations
export async function deleteInstallmentsByDebtId(debtId: string) {
  const userId = auth.currentUser?.uid;
  if (!userId) return;

  const path = 'installments';
  try {
    const q = query(
      collection(db, path), 
      where('userId', '==', userId),
      where('debtId', '==', debtId)
    );
    const snapshot = await getDocs(q);
    const batch = writeBatch(db);
    snapshot.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function createInstallments(debtId: string, installments: {
  number: number;
  totalInstallments: number;
  amount: number;
  dueDate: Date;
}[]) {
  const userId = auth.currentUser?.uid;
  if (!userId) throw new Error('User not authenticated');

  const path = 'installments';
  try {
    const batch = writeBatch(db);
    installments.forEach(inst => {
      const docRef = doc(collection(db, path));
      batch.set(docRef, {
        ...inst,
        debtId,
        userId,
        status: 'pending',
        createdAt: serverTimestamp(),
        dueDate: Timestamp.fromDate(inst.dueDate)
      });
    });
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export function subscribeToInstallmentsByMonth(month: number, year: number, callback: (installments: any[]) => void) {
  const userId = auth.currentUser?.uid;
  if (!userId) return () => {};

  // Simple way: subscribe to all user installments and filter in memory for efficiency with small datasets
  // Or create specific start/end dates for the month
  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 0, 23, 59, 59);

  const q = query(
    collection(db, 'installments'), 
    where('userId', '==', userId),
    where('dueDate', '>=', Timestamp.fromDate(start)),
    where('dueDate', '<=', Timestamp.fromDate(end))
  );

  return onSnapshot(q, (snapshot) => {
    const results = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    callback(results.sort((a: any, b: any) => a.dueDate.toMillis() - b.dueDate.toMillis()));
  });
}

export async function getInstallments(filters?: { month?: number, year?: number, debtId?: string }) {
  const userId = auth.currentUser?.uid;
  if (!userId) return [];

  const path = 'installments';
  try {
    let q = query(collection(db, path), where('userId', '==', userId));
    
    if (filters?.debtId) {
      q = query(q, where('debtId', '==', filters.debtId));
    }
    
    const snapshot = await getDocs(q);
    let results = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // Filter by month/year in memory if needed, or refine queries
    if (filters?.month !== undefined && filters?.year !== undefined) {
      results = results.filter((item: any) => {
        const date = item.dueDate.toDate();
        return date.getMonth() === filters.month && date.getFullYear() === filters.year;
      });
    }

    return results.sort((a: any, b: any) => a.dueDate.toMillis() - b.dueDate.toMillis());
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}

export async function updateInstallmentStatus(installmentId: string, status: 'paid' | 'pending' | 'overdue') {
  const path = `installments/${installmentId}`;
  try {
    await updateDoc(doc(db, 'installments', installmentId), {
      status,
      paidAt: status === 'paid' ? serverTimestamp() : null
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteDebt(debtId: string) {
  const userId = auth.currentUser?.uid;
  if (!userId) throw new Error('User not authenticated');

  try {
    await deleteDoc(doc(db, 'debts', debtId));
    await deleteInstallmentsByDebtId(debtId);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `debts/${debtId}`);
  }
}

// Income Operations
export async function setIncome(amount: number) {
  const userId = auth.currentUser?.uid;
  if (!userId) return;
  
  try {
    await setDoc(doc(db, 'user_data', userId), {
      income: amount,
      updatedAt: serverTimestamp(),
    }, { merge: true });
  } catch (error) {
    console.error("Error setting income:", error);
    throw error;
  }
}

export function subscribeToIncome(userId: string, callback: (income: number) => void) {
  return onSnapshot(doc(db, 'user_data', userId), (doc) => {
    if (doc.exists()) {
      callback(doc.data().income || 0);
    } else {
      callback(0);
    }
  });
}
