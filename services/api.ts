// Fix: Add definitions for File System Access API to fix TypeScript errors.
type FileSystemPermissionMode = 'read' | 'readwrite';

declare global {
  interface Window {
    showSaveFilePicker(options?: any): Promise<FileSystemFileHandle>;
  }

  interface FileSystemHandle {
    queryPermission(descriptor?: { mode: FileSystemPermissionMode }): Promise<PermissionState>;
    requestPermission(descriptor?: { mode: FileSystemPermissionMode }): Promise<PermissionState>;
  }

  interface FileSystemFileHandle extends FileSystemHandle {
    createWritable(): Promise<FileSystemWritableFileStream>;
  }

  interface FileSystemWritableFileStream extends WritableStream {
    write(data: any): Promise<void>;
    close(): Promise<void>;
  }
}
// End of fix

import {
    Student, Teacher, Staff, Class, AttendanceRecord, Invoice, PersonStatus, FeeType, AttendanceStatus, ProgressReport, Income, Expense, CenterSettings, Payroll, SalaryType, Announcement, UserRole, Transaction, TransactionType
} from '../types';
import { MOCK_STUDENTS, MOCK_TEACHERS, MOCK_STAFF, MOCK_CLASSES, MOCK_ATTENDANCE, MOCK_INVOICES, MOCK_PROGRESS_REPORTS, MOCK_TRANSACTIONS, MOCK_INCOME, MOCK_EXPENSES, MOCK_PAYROLLS, MOCK_ANNOUNCEMENTS, MOCK_SETTINGS } from './mockData';

const APP_DATA_KEY = 'educenter_pro_data';

export interface AppData {
  students: Student[];
  teachers: Teacher[];
  staff: Staff[];
  classes: Class[];
  attendance: AttendanceRecord[];
  invoices: Invoice[];
  progressReports: ProgressReport[];
  transactions: Transaction[];
  income: Income[];
  expenses: Expense[];
  settings: CenterSettings;
  payrolls: Payroll[];
  announcements: Announcement[];
}

// --- IndexedDB for File Handle ---
const DB_NAME = 'EduCenterFSA_DB';
const STORE_NAME = 'FileSystemHandles';
const HANDLE_KEY = 'dataFileHandle';

const getDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onerror = () => reject("Không thể mở IndexedDB");
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE_NAME);
    };
  });
};

const idbGet = async (key: string) => {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const request = tx.objectStore(STORE_NAME).get(key);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

const idbSet = async (key: string, value: any) => {
  const db = await getDB();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const request = tx.objectStore(STORE_NAME).put(value, key);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

const idbClear = async (key: string) => {
  const db = await getDB();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const request = tx.objectStore(STORE_NAME).delete(key);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

// --- File System Access API Helpers ---
async function verifyPermission(fileHandle: FileSystemFileHandle, withWrite: boolean = false) {
  const options = { mode: (withWrite ? 'readwrite' : 'read') as FileSystemPermissionMode };
  if ((await fileHandle.queryPermission(options)) === 'granted') {
    return true;
  }
  if ((await fileHandle.requestPermission(options)) === 'granted') {
    return true;
  }
  return false;
}

// --- Storage Method Detection ---
export const isFileSystemSupported = () => 'showSaveFilePicker' in window;

export async function checkStorageMethod(): Promise<{ method: 'fs' | 'local'; handle?: FileSystemFileHandle }> {
    if (!isFileSystemSupported()) return { method: 'local' };
    try {
        const handle = await idbGet(HANDLE_KEY) as FileSystemFileHandle | null;
        if (handle) {
            return { method: 'fs', handle };
        }
    } catch(e) {
        console.error("Lỗi khi kiểm tra phương thức lưu trữ:", e);
    }
    return { method: 'local' };
}


function getMockDataState(): AppData {
    return {
        students: MOCK_STUDENTS,
        teachers: MOCK_TEACHERS,
        staff: MOCK_STAFF,
        classes: MOCK_CLASSES,
        attendance: MOCK_ATTENDANCE,
        invoices: MOCK_INVOICES,
        progressReports: MOCK_PROGRESS_REPORTS,
        transactions: MOCK_TRANSACTIONS,
        income: MOCK_INCOME,
        expenses: MOCK_EXPENSES,
        payrolls: MOCK_PAYROLLS,
        announcements: MOCK_ANNOUNCEMENTS,
        settings: MOCK_SETTINGS,
    };
}


// --- Data Store Management ---

async function getLocalData(): Promise<AppData> {
    const { method, handle } = await checkStorageMethod();
    
    if (method === 'fs' && handle) {
        try {
            const hasPermission = await verifyPermission(handle, false);
            if (!hasPermission) {
                throw new Error("PERMISSION_ERROR: Quyền truy cập tệp dữ liệu đã bị từ chối. Vui lòng tải lại trang và cấp quyền, hoặc chọn phương thức lưu trữ khác trong Cài đặt.");
            }
            const file = await handle.getFile();
            const contents = await file.text();
            if (!contents) {
                const mockData = getMockDataState();
                await setLocalData(mockData);
                return mockData;
            }
            return JSON.parse(contents);
        } catch (err) {
            console.error("Lỗi đọc tệp, không thể tiếp tục:", err);
            if (err instanceof Error && err.message.startsWith('PERMISSION_ERROR')) {
                 throw err;
            }
            throw new Error(`Lỗi khi đọc tệp dữ liệu: ${err instanceof Error ? err.message : String(err)}. Dữ liệu có thể bị hỏng hoặc tệp đã bị di chuyển.`);
        }
    }

    const data = localStorage.getItem(APP_DATA_KEY);
    if (data) return JSON.parse(data);

    const mockData = getMockDataState();
    localStorage.setItem(APP_DATA_KEY, JSON.stringify(mockData));
    return mockData;
}

async function setLocalData(data: AppData) {
     const { method, handle } = await checkStorageMethod();
     if (method === 'fs' && handle) {
        try {
            const hasPermission = await verifyPermission(handle, true);
            if (!hasPermission) {
                throw new Error("Không thể lưu thay đổi. Quyền ghi vào tệp dữ liệu đã bị từ chối.");
            }
            const writable = await handle.createWritable();
            await writable.write(JSON.stringify(data, null, 2));
            await writable.close();
            return;
        } catch (err) {
            console.error("Lỗi ghi tệp:", err);
            throw err;
        }
     }
     localStorage.setItem(APP_DATA_KEY, JSON.stringify(data));
}

// --- API Functions ---

export async function loadInitialData(): Promise<AppData> {
    return getLocalData();
}

const generateUniqueId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;

async function addDoc<T extends { id: string }>(collectionName: keyof Omit<AppData, 'settings'>, newItem: T): Promise<T> {
    const appData = await getLocalData();
    const collection = appData[collectionName] as unknown as T[];
    if (collection.some(item => item.id === newItem.id)) {
        throw new Error(`An item with ID ${newItem.id} already exists in ${collectionName}.`);
    }
    collection.push(newItem);
    await setLocalData(appData);
    return newItem;
}


async function updateDoc<T extends { id: string }>(collectionName: keyof Omit<AppData, 'settings'>, docId: string, data: T): Promise<void> {
    const appData = await getLocalData();
    const collection = appData[collectionName] as any[];
    
    if (!collection.some((item: any) => item.id === docId)) {
        throw new Error(`Document with id ${docId} not found in collection ${collectionName}.`);
    }

    appData[collectionName] = collection.map((item: any) => item.id === docId ? data : item) as any;
    await setLocalData(appData);
}

async function deleteDoc(collectionName: keyof Omit<AppData, 'settings'>, docId: string): Promise<void> {
    const appData = await getLocalData();
    const collection = appData[collectionName] as any[];
    appData[collectionName] = collection.filter((item: any) => item.id !== docId) as any;
    await setLocalData(appData);
}


// --- Students ---
export async function addStudent({ student, classIds }: { student: Student, classIds: string[] }): Promise<void> {
    const appData = await getLocalData();
    if (appData.students.some(s => s.id === student.id)) {
        throw new Error(`Học viên với mã '${student.id}' đã tồn tại.`);
    }
    const newStudent = { ...student, createdAt: new Date().toISOString().split('T')[0], balance: 0 };
    appData.students.push(newStudent);
    appData.classes = appData.classes.map(c => {
        if (classIds.includes(c.id)) {
            return { ...c, studentIds: [...c.studentIds, newStudent.id] };
        }
        return c;
    });
    await setLocalData(appData);
}

export async function updateStudent({ originalId, updatedStudent, classIds }: { originalId: string, updatedStudent: Student, classIds: string[] }): Promise<void> {
    const appData = await getLocalData();
    const newId = updatedStudent.id;

    if (originalId !== newId) {
        if (appData.students.some(s => s.id === newId)) {
             throw new Error(`Học viên với mã '${newId}' đã tồn tại.`);
        }
        appData.students = appData.students.map(s => s.id === originalId ? updatedStudent : s);
        appData.attendance = appData.attendance.map(a => a.studentId === originalId ? { ...a, studentId: newId } : a);
        appData.invoices = appData.invoices.map(i => i.studentId === originalId ? { ...i, studentId: newId, studentName: updatedStudent.name } : i);
        appData.progressReports = appData.progressReports.map(p => p.studentId === originalId ? { ...p, studentId: newId } : p);
        appData.transactions = appData.transactions.map(t => t.studentId === originalId ? { ...t, studentId: newId } : t);
    } else {
        appData.students = appData.students.map(s => s.id === originalId ? updatedStudent : s);
    }
    
    const finalStudentId = newId;
    const newClassIds = new Set(classIds);
    appData.classes = appData.classes.map(c => {
        const studentIds = new Set(c.studentIds);
        const wasInClass = studentIds.has(originalId);
        const shouldBeInClass = newClassIds.has(c.id);

        if(wasInClass) studentIds.delete(originalId);
        if(shouldBeInClass) studentIds.add(finalStudentId);
        
        return { ...c, studentIds: Array.from(studentIds) };
    });

    await setLocalData(appData);
}

export async function deleteStudent(studentId: string): Promise<void> {
    const appData = await getLocalData();
    appData.students = appData.students.filter(s => s.id !== studentId);
    appData.classes = appData.classes.map(c => ({ ...c, studentIds: c.studentIds.filter(id => id !== studentId) }));
    appData.attendance = appData.attendance.filter(a => a.studentId !== studentId);
    appData.invoices = appData.invoices.filter(i => i.studentId !== studentId);
    appData.progressReports = appData.progressReports.filter(p => p.studentId !== studentId);
    appData.transactions = appData.transactions.filter(t => t.studentId !== studentId);
    await setLocalData(appData);
}

// --- Teachers, Staff, Classes ---
export async function addTeacher(data: Teacher): Promise<Teacher> {
    const newItem = { ...data, createdAt: new Date().toISOString().split('T')[0] };
    return addDoc('teachers', newItem);
}
export async function addStaff(data: Staff): Promise<Staff> {
    const newItem = { ...data, createdAt: new Date().toISOString().split('T')[0] };
    return addDoc('staff', newItem);
}
export const addClass = (data: Class) => addDoc('classes', data);
export const addProgressReport = (data: Omit<ProgressReport, 'id'>) => addDoc('progressReports', { ...data, id: generateUniqueId('PR') } as ProgressReport);
export const addIncome = (data: Omit<Income, 'id'>) => addDoc('income', { ...data, id: generateUniqueId('INC') } as Income);
export const addExpense = (data: Omit<Expense, 'id'>) => addDoc('expenses', { ...data, id: generateUniqueId('EXP') } as Expense);
export async function addAnnouncement(data: Omit<Announcement, 'id'>): Promise<Announcement> {
    const newItem = { ...data, id: generateUniqueId('ANN'), createdAt: new Date().toISOString().split('T')[0] };
    return addDoc('announcements', newItem);
}

export async function updateTeacher({ originalId, updatedTeacher }: { originalId: string, updatedTeacher: Teacher }): Promise<void> {
    const appData = await getLocalData();
    if (originalId !== updatedTeacher.id) {
        if(appData.teachers.some(t => t.id === updatedTeacher.id)) throw new Error("Mã giáo viên đã tồn tại.");
        appData.classes = appData.classes.map(c => ({...c, teacherIds: c.teacherIds.map(tid => tid === originalId ? updatedTeacher.id : tid)}));
    }
    appData.teachers = appData.teachers.map(t => t.id === originalId ? updatedTeacher : t);
    appData.payrolls = appData.payrolls.filter(p => p.teacherId !== originalId);
    await setLocalData(appData);
}

export async function deleteTeacher(teacherId: string): Promise<void> {
    const appData = await getLocalData();
    appData.teachers = appData.teachers.filter(t => t.id !== teacherId);
    appData.classes = appData.classes.map(c => ({...c, teacherIds: c.teacherIds.filter(id => id !== teacherId)}));
    appData.payrolls = appData.payrolls.filter(p => p.teacherId !== teacherId);
    await setLocalData(appData);
}

export async function updateStaff({ originalId, updatedStaff }: { originalId: string, updatedStaff: Staff }): Promise<void> {
    const appData = await getLocalData();
     if (originalId !== updatedStaff.id && appData.staff.some(s => s.id === updatedStaff.id)) {
        throw new Error("Mã nhân viên đã tồn tại.");
    }
    appData.staff = appData.staff.map(t => t.id === originalId ? updatedStaff : t);
    await setLocalData(appData);
}

export const deleteStaff = (staffId: string) => deleteDoc('staff', staffId);

export async function updateClass({ originalId, updatedClass }: { originalId: string, updatedClass: Class }): Promise<void> {
    const appData = await getLocalData();
     if (originalId !== updatedClass.id && appData.classes.some(c => c.id === updatedClass.id)) {
        throw new Error("Mã lớp đã tồn tại.");
    }
    appData.classes = appData.classes.map(c => c.id === originalId ? updatedClass : c);
    await setLocalData(appData);
}

export async function deleteClass(classId: string): Promise<void> {
    const appData = await getLocalData();
    appData.classes = appData.classes.filter(c => c.id !== classId);
    appData.attendance = appData.attendance.filter(a => a.classId !== classId);
    appData.progressReports = appData.progressReports.filter(pr => pr.classId !== classId);
    appData.announcements = appData.announcements.filter(ann => ann.classId !== classId);
    await setLocalData(appData);
}

export const updateIncome = (item: Income) => updateDoc('income', item.id, item);
export const deleteIncome = (itemId: string) => deleteDoc('income', itemId);
export const updateExpense = (item: Expense) => updateDoc('expenses', item.id, item);
export const deleteExpense = (itemId: string) => deleteDoc('expenses', itemId);
export const deleteAnnouncement = (id: string) => deleteDoc('announcements', id);

// --- Settings ---
export async function updateSettings(settings: CenterSettings): Promise<void> {
    const appData = await getLocalData();
    appData.settings = settings;
    await setLocalData(appData);
}

export async function completeOnboardingStep(step: string): Promise<void> {
    const appData = await getLocalData();
    if (!appData.settings.onboardingStepsCompleted.includes(step)) {
        appData.settings.onboardingStepsCompleted.push(step);
    }
    await setLocalData(appData);
}

// --- Complex Operations ---
export async function updateAttendance(records: AttendanceRecord[]): Promise<void> {
    const appData = await getLocalData();

    // Group records by class and date to handle batch updates correctly
    const recordsByClassDate = new Map<string, AttendanceRecord[]>();
    records.forEach(r => {
        const key = `${r.classId}|${r.date}`;
        if (!recordsByClassDate.has(key)) {
            recordsByClassDate.set(key, []);
        }
        recordsByClassDate.get(key)!.push(r);
    });

    // If no records are passed, do nothing. This prevents accidental data deletion.
    if (recordsByClassDate.size === 0) {
        return;
    }

    // For each class/date group, remove old records and add the new ones
    recordsByClassDate.forEach((newRecords, key) => {
        const [classId, date] = key.split('|');
        
        // Filter out all existing records for this specific class and date
        appData.attendance = appData.attendance.filter(a => !(a.classId === classId && a.date === date));
        
        // Add the new records, ensuring they have unique IDs
        const recordsWithIds = newRecords.map(record => ({
            ...record,
            id: record.id || generateUniqueId('ATT'),
        }));
        appData.attendance.push(...recordsWithIds);
    });
    
    await setLocalData(appData);
}

export async function generateInvoices({ month, year }: { month: number, year: number }): Promise<void> {
    const appData = await getLocalData();
    const monthStr = `${year}-${String(month).padStart(2, '0')}`;
    const activeStudents = appData.students.filter(s => s.status === PersonStatus.ACTIVE);

    for (const student of activeStudents) {
        let totalAmount = 0;
        let details = '';
        const studentClasses = appData.classes.filter(c => c.studentIds.includes(student.id));

        for (const cls of studentClasses) {
            let classFee = 0;
            const studentIsEnrolled = (cls.studentIds || []).includes(student.id);

            if (studentIsEnrolled) {
                if (cls.fee.type === FeeType.MONTHLY || cls.fee.type === FeeType.PER_COURSE) {
                    classFee = cls.fee.amount;
                    if (classFee > 0) {
                        details += `- Lớp ${cls.name}: ${classFee.toLocaleString('vi-VN')} ₫\n`;
                    }
                } else if (cls.fee.type === FeeType.PER_SESSION) {
                    const attendedSessions = appData.attendance.filter(a =>
                        a.studentId === student.id && a.classId === cls.id && a.date.startsWith(monthStr) &&
                        (a.status === AttendanceStatus.PRESENT || a.status === AttendanceStatus.LATE)
                    ).length;
                    if (attendedSessions > 0) {
                        classFee = attendedSessions * cls.fee.amount;
                        details += `- Lớp ${cls.name}: ${attendedSessions} buổi x ${cls.fee.amount.toLocaleString('vi-VN')} ₫ = ${classFee.toLocaleString('vi-VN')} ₫\n`;
                    }
                }
            }
            totalAmount += classFee;
        }

        const transactionDescription = `Hóa đơn học phí tháng ${month}/${year}`;
        const existingInvoice = appData.invoices.find(inv => inv.studentId === student.id && inv.month === monthStr);

        if (existingInvoice) {
            if (existingInvoice.status === 'UNPAID' && (totalAmount !== existingInvoice.amount)) {
                const amountDifference = totalAmount - existingInvoice.amount;
                existingInvoice.amount = totalAmount;
                existingInvoice.details = details.trim();
                const studentToUpdate = appData.students.find(s => s.id === student.id);
                if (studentToUpdate) studentToUpdate.balance -= amountDifference;
                const relatedTransaction = appData.transactions.find(t => t.relatedInvoiceId === existingInvoice.id);
                if(relatedTransaction) relatedTransaction.amount = -totalAmount;
            }
        } else if (totalAmount > 0) {
            const invoiceId = generateUniqueId('INV');
            appData.invoices.push({
                id: invoiceId, studentId: student.id, studentName: student.name, month: monthStr,
                amount: totalAmount, details: details.trim(), status: 'UNPAID',
                generatedDate: new Date().toISOString().split('T')[0], paidDate: null,
            });
            appData.transactions.push({
                id: generateUniqueId('TRX'), studentId: student.id, date: new Date().toISOString().split('T')[0],
                type: TransactionType.INVOICE, description: transactionDescription,
                amount: -totalAmount, relatedInvoiceId: invoiceId,
            });
            const studentToUpdate = appData.students.find(s => s.id === student.id);
            if (studentToUpdate) studentToUpdate.balance -= totalAmount;
        }
    }
    await setLocalData(appData);
}

export async function cancelInvoice(invoiceId: string): Promise<void> {
    const appData = await getLocalData();
    const invoice = appData.invoices.find(inv => inv.id === invoiceId);
    if (!invoice || invoice.status === 'CANCELLED') return;
    if (invoice.status === 'PAID') throw new Error("Không thể hủy hóa đơn đã thanh toán.");

    invoice.status = 'CANCELLED';
    appData.transactions.push({
        id: generateUniqueId('TRX'), studentId: invoice.studentId, date: new Date().toISOString().split('T')[0],
        type: TransactionType.ADJUSTMENT_CREDIT, description: `Hủy hóa đơn #${invoiceId}`,
        amount: invoice.amount, relatedInvoiceId: invoiceId,
    });
    const student = appData.students.find(s => s.id === invoice.studentId);
    if (student) student.balance += invoice.amount;

    await setLocalData(appData);
}

export async function addAdjustment(payload: { studentId: string; amount: number; date: string; description: string; type: 'CREDIT' | 'DEBIT' }): Promise<void> {
    const appData = await getLocalData();
    const finalAmount = payload.type === 'CREDIT' ? payload.amount : -payload.amount;

    appData.transactions.push({
        id: generateUniqueId('TRX'), studentId: payload.studentId, date: payload.date,
        type: payload.type === 'CREDIT' ? TransactionType.PAYMENT : TransactionType.ADJUSTMENT_DEBIT,
        description: payload.description, amount: finalAmount,
    });
    const student = appData.students.find(s => s.id === payload.studentId);
    if (student) student.balance += finalAmount;
    
    await setLocalData(appData);
}

export async function updateTransaction(transaction: Transaction): Promise<void> {
    const appData = await getLocalData();
    const oldTransaction = appData.transactions.find(t => t.id === transaction.id);
    if (!oldTransaction) throw new Error("Giao dịch không tồn tại.");

    const amountDifference = transaction.amount - oldTransaction.amount;
    appData.transactions = appData.transactions.map(t => t.id === transaction.id ? transaction : t);
    const student = appData.students.find(s => s.id === transaction.studentId);
    if (student) student.balance += amountDifference;

    await setLocalData(appData);
}

export async function deleteTransaction(transactionId: string): Promise<void> {
    const appData = await getLocalData();
    const transaction = appData.transactions.find(t => t.id === transactionId);
    if (!transaction) throw new Error("Giao dịch không tồn tại.");

    appData.transactions = appData.transactions.filter(t => t.id !== transactionId);
    const student = appData.students.find(s => s.id === transaction.studentId);
    if (student) student.balance -= transaction.amount;

    await setLocalData(appData);
}

export const updateInvoiceStatus = async ({ invoiceId, status }: { invoiceId: string, status: 'PAID' | 'UNPAID' | 'CANCELLED' }) => {
    const appData = await getLocalData();
    const invoice = appData.invoices.find(inv => inv.id === invoiceId);
    if (invoice) {
        invoice.status = status;
        if (status === 'PAID') invoice.paidDate = new Date().toISOString().split('T')[0];
        await setLocalData(appData);
    }
}

export async function generatePayrolls({ month, year }: { month: number, year: number }): Promise<void> {
    const appData = await getLocalData();
    const monthStr = `${year}-${String(month).padStart(2, '0')}`;

    for(const teacher of appData.teachers.filter(t => t.status === PersonStatus.ACTIVE)) {
        let totalSalary = 0;
        let sessionsTaught = 0;
        
        if (teacher.salaryType === SalaryType.MONTHLY) {
            totalSalary = teacher.rate;
        } else {
            const teacherClasses = appData.classes.filter(c => c.teacherIds.includes(teacher.id));
            const distinctSessions = new Set<string>();
            appData.attendance.forEach(a => {
                if (a.date.startsWith(monthStr) && teacherClasses.some(c => c.id === a.classId)) {
                    distinctSessions.add(`${a.classId}-${a.date}`);
                }
            });
            sessionsTaught = distinctSessions.size;
            totalSalary = sessionsTaught * teacher.rate;
        }

        const payrollId = `PAY-${teacher.id}-${monthStr}`;
        const newPayroll: Payroll = {
            id: payrollId, teacherId: teacher.id, teacherName: teacher.name, month: monthStr,
            sessionsTaught, rate: teacher.rate, baseSalary: teacher.salaryType === SalaryType.MONTHLY ? teacher.rate : 0,
            totalSalary, calculationDate: new Date().toISOString().split('T')[0],
        };

        const existingIndex = appData.payrolls.findIndex(p => p.id === payrollId);
        if (existingIndex !== -1) appData.payrolls[existingIndex] = newPayroll;
        else appData.payrolls.push(newPayroll);
    }
    await setLocalData(appData);
}

// --- Data Management ---
export const backupData = async (): Promise<AppData> => getLocalData();

/**
 * Merges arrays of objects with unique IDs. Backup items overwrite current items.
 * @param current The current array of items.
 * @param backup The backup array of items.
 * @returns A new merged array.
 */
function mergeById<T extends { id: string }>(current: T[] = [], backup?: T[]): T[] {
    if (!backup || !Array.isArray(backup)) {
        return current; // If backup data is missing or not an array, return current data.
    }
    
    const backupMap = new Map(backup.map(item => [item.id, item]));
    const currentMap = new Map(current.map(item => [item.id, item]));

    // Merge maps: items from backup will overwrite items from current with the same ID.
    const mergedMap = new Map([...currentMap, ...backupMap]);
    
    return Array.from(mergedMap.values());
}

/**
 * Merges attendance records using a composite key (classId, studentId, date).
 * @param current The current array of attendance records.
 * @param backup The backup array of attendance records.
 * @returns A new merged array.
 */
function mergeAttendance(current: AttendanceRecord[] = [], backup?: AttendanceRecord[]): AttendanceRecord[] {
    if (!backup || !Array.isArray(backup)) {
        return current; // If backup data is missing, return current data.
    }

    const createKey = (record: AttendanceRecord) => `${record.classId}|${record.studentId}|${record.date}`;

    const backupMap = new Map(backup.map(item => [createKey(item), item]));
    const currentMap = new Map(current.map(item => [createKey(item), item]));

    // Merge maps: records from backup will overwrite records from current with the same composite key.
    const mergedMap = new Map([...currentMap, ...backupMap]);
    
    return Array.from(mergedMap.values());
}


export const restoreData = async (data: Partial<AppData>): Promise<void> => {
    const currentData = await getLocalData();

    // Perform an intelligent merge instead of a simple overwrite.
    const restoredData: AppData = {
        students: mergeById(currentData.students, data.students),
        teachers: mergeById(currentData.teachers, data.teachers),
        staff: mergeById(currentData.staff, data.staff),
        classes: mergeById(currentData.classes, data.classes),
        // Use the specialized merge function for attendance
        attendance: mergeAttendance(currentData.attendance, data.attendance),
        invoices: mergeById(currentData.invoices, data.invoices),
        progressReports: mergeById(currentData.progressReports, data.progressReports),
        transactions: mergeById(currentData.transactions, data.transactions),
        income: mergeById(currentData.income, data.income),
        expenses: mergeById(currentData.expenses, data.expenses),
        payrolls: mergeById(currentData.payrolls, data.payrolls),
        announcements: mergeById(currentData.announcements, data.announcements),
        // Settings are merged to preserve new settings not present in the backup.
        settings: { ...currentData.settings, ...(data.settings || {}) },
    };
    
    await setLocalData(restoredData);
};

export const resetToMockData = async (): Promise<void> => {
    localStorage.removeItem(APP_DATA_KEY);
    await idbClear(HANDLE_KEY);
    const mockData = getMockDataState();
    await setLocalData(mockData);
}

export const deleteAttendanceForDate = async ({ classId, date }: { classId: string, date: string }) => {
    const appData = await getLocalData();
    appData.attendance = appData.attendance.filter(a => !(a.classId === classId && a.date === date));
    await setLocalData(appData);
}

export const updateUserPassword = async ({ userId, role, newPassword }: { userId: string, role: UserRole, newPassword: string }) => {
    const appData = await getLocalData();
    let userList: (Student | Teacher | Staff)[];
    switch (role) {
        case UserRole.PARENT: userList = appData.students; break;
        case UserRole.TEACHER: userList = appData.teachers; break;
        case UserRole.MANAGER: case UserRole.ACCOUNTANT: userList = appData.staff; break;
        default: throw new Error('Vai trò không hợp lệ để cập nhật mật khẩu.');
    }
    const user = userList.find(u => u.id === userId);
    if (user) {
        user.password = newPassword;
        await setLocalData(appData);
    } else {
        throw new Error('Không tìm thấy người dùng.');
    }
}

export const clearCollections = async (collectionKeys: ('students' | 'teachers' | 'staff' | 'classes')[]) => {
    const appData = await getLocalData();
    for (const key of collectionKeys) { (appData[key] as any) = []; }
    if (collectionKeys.includes('students')) {
        appData.attendance = []; appData.invoices = []; appData.progressReports = []; appData.transactions = [];
        appData.classes = appData.classes.map(c => ({...c, studentIds: []}));
    }
    if (collectionKeys.includes('teachers')) {
        appData.payrolls = [];
        appData.classes = appData.classes.map(c => ({...c, teacherIds: []}));
    }
    if (collectionKeys.includes('classes')) { appData.attendance = []; appData.progressReports = []; }
    await setLocalData(appData);
}

export const deleteAttendanceByMonth = async ({ month, year }: { month: number, year: number }) => {
    const appData = await getLocalData();
    const monthStr = `${year}-${String(month).padStart(2, '0')}`;
    appData.attendance = appData.attendance.filter(a => !a.date.startsWith(monthStr));
    await setLocalData(appData);
}

export async function clearAllTransactions(): Promise<void> {
    const appData = await getLocalData();
    appData.students = appData.students.map(student => ({
        ...student,
        balance: 0,
    }));
    appData.transactions = [];
    appData.invoices = [];
    await setLocalData(appData);
}

// --- NEW STORAGE MIGRATION FUNCTIONS ---
export async function migrateToFSA(): Promise<FileSystemFileHandle> {
    const handle = await window.showSaveFilePicker({
      types: [{ description: 'JSON Files', accept: { 'application/json': ['.json'] } }],
      suggestedName: 'EduCenterPro_Data.json',
    });
    const currentData = await getLocalData();
    const writable = await handle.createWritable();
    await writable.write(JSON.stringify(currentData, null, 2));
    await writable.close();
    await idbSet(HANDLE_KEY, handle);
    localStorage.removeItem(APP_DATA_KEY);
    return handle;
}

export async function migrateToLocalStorage() {
    const { method, handle } = await checkStorageMethod();
    if (method === 'fs' && handle) {
        const hasPermission = await verifyPermission(handle, false);
        if (!hasPermission) throw new Error("Không có quyền đọc tệp dữ liệu để di chuyển.");
        const file = await handle.getFile();
        const contents = await file.text();
        localStorage.setItem(APP_DATA_KEY, contents);
        await idbClear(HANDLE_KEY);
    }
}