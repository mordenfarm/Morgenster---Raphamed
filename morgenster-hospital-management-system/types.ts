export enum Role {
  Admin = 'Admin',
  Doctor = 'Doctor',
  Accountant = 'Accountant',
  AccountsAssistant = 'Accounts Assistant',
  AccountsClerk = 'Accounts Clerk',
  VitalsChecker = 'Vitals Checker',
  Nurse = 'Nurse',
  LaboratoryTechnician = 'Laboratory Technician',
  Radiologist = 'Radiologist',
  PharmacyTechnician = 'Pharmacy Technician',
  DispensaryAssistant = 'Dispensary Assistant',
  RehabilitationTechnician = 'Rehabilitation Technician',
}

export interface Ward {
  id: string;
  name: string;
  totalBeds: number;
  pricePerDay: number;
  gender?: 'Male' | 'Female' | 'Mixed';
  maxAge?: number;
}

export interface UserProfile {
  id: string; // uid from Firebase Auth
  name: string;
  surname: string;
  email: string;
  role: Role;
  department: string;
  phone?: string;
  address?: string;
  wardId?: string; // For nurses
  wardName?: string; // For nurses
}

export interface PriceListItem {
  id?: string;
  name: string;
  department: string;
  unitPrice: number;
  createdAt: any; // Firestore Timestamp
  updatedAt: any; // Firestore Timestamp
}

export interface InventoryItem {
  id?: string;
  name: string;
  category: string;
  quantity: number;
  totalStockReceived?: number; // For tracking historical "Stock In"
  unitPrice: number;
  lowStockThreshold: number;
  supplier?: string;
  createdAt: any; // Firestore Timestamp
  updatedAt: any; // Firestore Timestamp
}

export interface InventoryLog {
  id: string;
  itemId: string;
  itemName: string;
  type: 'Restock' | 'Correction' | 'Sale';
  changeAmount: number; // Positive for add, negative for remove
  previousQuantity: number;
  newQuantity: number;
  userId: string;
  userName: string;
  timestamp: any; // Firestore Timestamp
  notes?: string;
}

export interface Patient {
    id?: string;
    hospitalNumber: string;
    name: string;
    surname: string;
    nationalId?: string; // Added National ID
    nationality: string; // Added Nationality
    passportNumber?: string; // Added Passport Number
    dateOfBirth: string;
    age: number;
    maritalStatus: string;
    gender: 'Male' | 'Female' | 'Other';
    countryOfBirth: string;
    phoneNumber: string;
    residentialAddress: string;
    nokName: string;
    nokSurname: string;
    nokPhoneNumber: string;
    nokAddress: string;
    registeredBy: string; // User ID
    registrationDate: string; // ISO string
    status: 'Admitted' | 'PendingDischarge' | 'Discharged';
    dischargeRequesterId?: string;
    financials: {
        totalBill: number;
        amountPaid: number;
        balance: number;
    };
    currentWardId?: string;
    currentWardName?: string;
    currentBedNumber?: number;
}

export interface BillItem {
    id: string;
    description: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
}

export interface Bill {
    id?: string;
    patientId: string;
    patientName: string;
    patientHospitalNumber: string;
    items: BillItem[];
    totalBill: number;
    amountPaidAtTimeOfBill: number; // The amount paid against this specific bill
    balance: number;
    paymentMethod: 'CASH' | 'EFT' | 'Mixed' | 'Credit';
    date: string; // ISO string
    processedBy: string; // User ID
    status: 'Paid' | 'Partially Paid' | 'Unpaid';
}

export interface Payment {
    id?: string;
    patientId: string;
    amount: number;
    paymentMethod: 'CASH' | 'EFT' | 'Mixed';
    date: string; // ISO string
    processedBy: string; // User ID
    processedByName: string;
}

export interface Notification {
  id: string;
  recipientId: string;
  senderId: string;
  senderName: string;
  title: string;
  message: string;
  createdAt: any; // Firestore Timestamp
  read: boolean;
  type: 'message' | 'password_change' | 'system_alert';
  link?: string;
}

export interface ChatMessage {
  id: string;
  chatId: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: any; // Firestore Timestamp
  read: boolean;
  attachment?: {
    name: string;
    type: 'image' | 'document';
    url: string; 
  }
}

export interface ChatConversation {
  id: string;
  participants: string[];
  participantProfiles: {
    [key: string]: {
      name: string;
      surname: string;
      role?: Role;
    }
  }
  lastMessage: {
    id: string;
    text: string;
    timestamp: any;
    senderId: string;
    read: boolean;
  } | null;
  unreadCounts: {
    [key: string]: number;
  };
}


// Medical History Types
export interface DoctorNote {
  id: string;
  medicalNotes: string;
  diagnosis: string;
  labTestsOrders: string;
  xrayOrders: string;
  prescriptionOrders: string;
  authorId: string;
  authorName: string;
  createdAt: any; // Firestore Timestamp
}

export interface NurseNote extends DoctorNote {}

export interface RehabilitationNote {
  id: string;
  content: string;
  authorId: string;
  authorName: string;
  createdAt: any; // Firestore Timestamp
  updatedAt: any; // Firestore Timestamp
}

export interface DischargeSummary {
  id: string;
  summary: string;
  authorId: string;
  authorName: string;
  createdAt: any; // Firestore Timestamp
  updatedAt: any; // Firestore Timestamp
}

export interface Prescription {
  id: string;
  medication: string;
  dosage: string;
  instructions: string;
  authorId: string;
  authorName: string;
  createdAt: any; // Firestore Timestamp
  updatedAt: any; // Firestore Timestamp
}

export interface Vitals {
  id: string;
  temperature: string;
  bloodPressure: string;
  heartRate: string;
  respiratoryRate: string;
  weight: string;
  height: string;
  recordedById: string;
  recordedByName: string;
  createdAt: any; // Firestore Timestamp
}

export interface LabResult {
  id: string;
  testName: string;
  resultValue: string;
  notes: string;
  technicianId: string;
  technicianName: string;
  createdAt: any; // Firestore Timestamp
}

export interface RadiologyResult {
  id: string;
  imageDescription: string;
  findings: string;
  radiologistId: string;
  radiologistName: string;
  createdAt: any; // Firestore Timestamp
}

export interface AdmissionRecord {
  id: string;
  admissionDate: any; // Firestore Timestamp
  admittedById: string;
  admittedByName: string;
  wardId: string;
  wardName: string;
  bedNumber: number;
  dischargeDate?: any; // Firestore Timestamp
  dischargedById?: string;
  dischargedByName?: string;
  lastBilledDate?: any; // Firestore Timestamp
}

export interface UserActivity {
  id: string; // Unique ID for the activity item
  originalId: string; // ID of the source document (bill, patient, etc.)
  type: 'Registration' | 'Billing' | 'Payment';
  date: Date;
  patientId: string;
  patientName: string;
  details: string;
  link: string;
}