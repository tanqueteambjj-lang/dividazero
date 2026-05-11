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
  orderBy
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

// Installment Operations
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
    const promises = installments.map(inst => 
      addDoc(collection(db, path), {
        ...inst,
        debtId,
        userId,
        status: 'pending',
        createdAt: serverTimestamp(),
        dueDate: Timestamp.fromDate(inst.dueDate)
      })
    );
    await Promise.all(promises);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
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
    // Delete the debt
    await deleteDoc(doc(db, 'debts', debtId));
    
    // Delete all related installments (simple approach, usually better to batch)
    const q = query(collection(db, 'installments'), where('debtId', '==', debtId));
    const snapshot = await getDocs(q);
    const promises = snapshot.docs.map(d => deleteDoc(doc(db, 'installments', d.id)));
    await Promise.all(promises);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `debts/${debtId}`);
  }
}
