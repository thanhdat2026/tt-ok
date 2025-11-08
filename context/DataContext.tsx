import React, { createContext, useState, ReactNode, useEffect, useCallback } from 'react';
import { Student, Teacher, Staff, Class, AttendanceRecord, Invoice, ProgressReport, Income, Expense, CenterSettings, Payroll, Announcement, Transaction, UserRole } from '../types';
import * as api from '../services/api';
import { AppData } from '../services/api';
import { MOCK_SETTINGS } from '../services/mockData';


interface AppState extends AppData {
  loading: boolean;
}

const initialState: AppState = {
  students: [],
  teachers: [],
  staff: [],
  classes: [],
  attendance: [],
  invoices: [],
  progressReports: [],
  transactions: [],
  income: [],
  expenses: [],
  settings: MOCK_SETTINGS,
  payrolls: [],
  announcements: [],
  loading: true,
};

interface DataContextType {
    state: AppState;
    error: string | null;
    isInitialOffline: boolean;
    isInitialLoad: boolean;
    refreshData: () => Promise<void>;
    addStudent: (payload: { student: Student, classIds: string[] }) => Promise<void>;
    updateStudent: (payload: { originalId: string, updatedStudent: Student, classIds: string[] }) => Promise<void>;
    deleteStudent: (studentId: string) => Promise<void>;
    addTeacher: (data: Teacher) => Promise<void>;
    updateTeacher: (payload: { originalId: string, updatedTeacher: Teacher }) => Promise<void>;
    deleteTeacher: (teacherId: string) => Promise<void>;
    addStaff: (data: Staff) => Promise<void>;
    updateStaff: (payload: { originalId: string, updatedStaff: Staff }) => Promise<void>;
    deleteStaff: (staffId: string) => Promise<void>;
    addClass: (data: Class) => Promise<void>;
    updateClass: (payload: { originalId: string, updatedClass: Class }) => Promise<void>;
    deleteClass: (classId: string) => Promise<void>;
    updateAttendance: (records: AttendanceRecord[]) => Promise<void>;
    addProgressReport: (data: Omit<ProgressReport, 'id'>) => Promise<void>;
    generateInvoices: (payload: { month: number, year: number }) => Promise<void>;
    cancelInvoice: (invoiceId: string) => Promise<void>;
    addAdjustment: (payload: { studentId: string; amount: number; date: string; description: string; type: 'CREDIT' | 'DEBIT' }) => Promise<void>;
    updateTransaction: (transaction: Transaction) => Promise<void>;
    deleteTransaction: (transactionId: string) => Promise<void>;
    updateInvoiceStatus: (payload: { invoiceId: string, status: 'PAID' | 'UNPAID' | 'CANCELLED' }) => Promise<void>;
    generatePayrolls: (payload: { month: number, year: number }) => Promise<void>;
    addIncome: (data: Omit<Income, 'id'>) => Promise<void>;
    updateIncome: (item: Income) => Promise<void>;
    deleteIncome: (itemId: string) => Promise<void>;
    addExpense: (data: Omit<Expense, 'id'>) => Promise<void>;
    updateExpense: (item: Expense) => Promise<void>;
    deleteExpense: (itemId: string) => Promise<void>;
    updateSettings: (settings: CenterSettings) => Promise<void>;
    completeOnboardingStep: (step: string) => Promise<void>;
    backupData: () => Promise<AppData>;
    restoreData: (data: Partial<AppData>) => Promise<void>;
    resetToMockData: () => Promise<void>;
    addAnnouncement: (data: Omit<Announcement, 'id'>) => Promise<void>;
    deleteAnnouncement: (id: string) => Promise<void>;
    deleteAttendanceForDate: (payload: { classId: string, date: string }) => Promise<void>;
    updateUserPassword: (payload: { userId: string; role: UserRole; newPassword: string; }) => Promise<void>;
    clearCollections: (collectionKeys: ('students' | 'teachers' | 'staff' | 'classes')[]) => Promise<void>;
    deleteAttendanceByMonth: (payload: { month: number; year: number; }) => Promise<void>;
    clearAllTransactions: () => Promise<void>;
}


export const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AppState>(initialState);
  const [error, setError] = useState<string | null>(null);
  const [isInitialOffline, setIsInitialOffline] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  const refreshData = useCallback(async () => {
    // This function is for subsequent refreshes.
    setState(prev => ({ ...prev, loading: true }));
    setError(null);
    try {
        const data = await api.loadInitialData();
        setState({ ...data, loading: false });
    } catch (err: any) {
        console.error("Không thể tải dữ liệu:", err);
        if (err.message && err.message.startsWith('PERMISSION_ERROR:')) {
            setError(err.message.replace('PERMISSION_ERROR: ', ''));
        } else {
            setError(`Không thể tải dữ liệu cục bộ. Lỗi: ${err.message || 'Không rõ'}.`);
        }
        setState(prev => ({ ...prev, loading: false }));
    }
  }, []);

  useEffect(() => {
    // This effect runs only once for the initial data load.
    const initialLoad = async () => {
        setError(null);
        setIsInitialOffline(false);
        try {
            const data = await api.loadInitialData();
            setState({ ...data, loading: false });
        } catch (err: any) {
            console.error("Không thể tải dữ liệu:", err);
            if (err.message && err.message.startsWith('PERMISSION_ERROR:')) {
                setError(err.message.replace('PERMISSION_ERROR: ', ''));
            } else {
                setIsInitialOffline(true);
                setError(`Không thể tải dữ liệu cục bộ. Lỗi: ${err.message || 'Không rõ'}. Thử phục hồi từ bản sao lưu trong Cài đặt hoặc chọn lại tệp dữ liệu.`);
            }
            setState(prev => ({ ...prev, loading: false }));
        } finally {
            setIsInitialLoad(false);
        }
    };
    initialLoad();
  }, []); // Empty dependency array ensures it runs only once.

  // Helper for functions that are complex and should trigger a full data refresh
  const createRefreshingFunc = <T,>(apiFunc: (payload: T) => Promise<any>) => async (payload: T) => {
    await apiFunc(payload);
    await refreshData();
  };
  
  const createVoidRefreshingFunc = (apiFunc: () => Promise<any>) => async () => {
    await apiFunc();
    await refreshData();
  };

  const value: DataContextType = {
    state,
    error,
    isInitialOffline,
    isInitialLoad,
    refreshData,
    addStudent: createRefreshingFunc(api.addStudent),
    updateStudent: createRefreshingFunc(api.updateStudent),
    deleteStudent: createRefreshingFunc(api.deleteStudent),
    addTeacher: createRefreshingFunc(api.addTeacher),
    updateTeacher: createRefreshingFunc(api.updateTeacher),
    deleteTeacher: createRefreshingFunc(api.deleteTeacher),
    addStaff: createRefreshingFunc(api.addStaff),
    updateStaff: createRefreshingFunc(api.updateStaff),
    deleteStaff: createRefreshingFunc(api.deleteStaff),
    addClass: createRefreshingFunc(api.addClass),
    updateClass: createRefreshingFunc(api.updateClass),
    deleteClass: createRefreshingFunc(api.deleteClass),
    addProgressReport: createRefreshingFunc(api.addProgressReport),
    addIncome: createRefreshingFunc(api.addIncome),
    updateIncome: createRefreshingFunc(api.updateIncome),
    deleteIncome: createRefreshingFunc(api.deleteIncome),
    addExpense: createRefreshingFunc(api.addExpense),
    updateExpense: createRefreshingFunc(api.updateExpense),
    deleteExpense: createRefreshingFunc(api.deleteExpense),
    addAnnouncement: createRefreshingFunc(api.addAnnouncement),
    deleteAnnouncement: createRefreshingFunc(api.deleteAnnouncement),
    updateSettings: createRefreshingFunc(api.updateSettings),
    updateAttendance: createRefreshingFunc(api.updateAttendance),
    generateInvoices: createRefreshingFunc(api.generateInvoices),
    cancelInvoice: createRefreshingFunc(api.cancelInvoice),
    addAdjustment: createRefreshingFunc(api.addAdjustment),
    updateTransaction: createRefreshingFunc(api.updateTransaction),
    deleteTransaction: createRefreshingFunc(api.deleteTransaction),
    updateInvoiceStatus: createRefreshingFunc(api.updateInvoiceStatus),
    generatePayrolls: createRefreshingFunc(api.generatePayrolls),
    completeOnboardingStep: createRefreshingFunc(api.completeOnboardingStep),
    backupData: api.backupData,
    restoreData: createRefreshingFunc(api.restoreData),
    resetToMockData: createVoidRefreshingFunc(api.resetToMockData),
    deleteAttendanceForDate: createRefreshingFunc(api.deleteAttendanceForDate),
    updateUserPassword: api.updateUserPassword, // This does not need a refresh
    clearCollections: createRefreshingFunc(api.clearCollections),
    deleteAttendanceByMonth: createRefreshingFunc(api.deleteAttendanceByMonth),
    clearAllTransactions: createVoidRefreshingFunc(api.clearAllTransactions),
  };

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
};