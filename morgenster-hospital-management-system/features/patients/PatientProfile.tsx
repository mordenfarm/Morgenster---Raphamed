
import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../../services/firebase';
import firebase from 'firebase/compat/app';
import { 
    Patient, Role, Bill, Payment, DoctorNote, NurseNote, Vitals, LabResult, 
    RadiologyResult, RehabilitationNote, Prescription, DischargeSummary, AdmissionRecord, Ward
} from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import LoadingSpinner from '../../components/utils/LoadingSpinner';
import { 
    Edit, User, Phone, DollarSign, PlusCircle, 
    Calendar, Briefcase, Stethoscope, HeartPulse, 
    Microscope, Bone, Pill, Clipboard, ClipboardEdit, ClipboardCheck, LogIn, LogOut, Printer, BedDouble, ChevronDown, ChevronUp, FilePlus, AlertCircle, MapPin, Flag,
    ArrowRight, X, Check, Fingerprint, Heart, ExternalLink, Activity
} from 'lucide-react';
import MakePaymentModal from '../accounts/MakePaymentModal';
import Modal from '../../components/utils/Modal';

// #region Reusable UI Components
const DetailItem: React.FC<{ label: string; value?: string | number; isEditing?: boolean; name?: string; onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void; type?: string; icon?: React.ReactNode }> = 
({ label, value, isEditing = false, name, onChange, type = 'text', icon }) => (
    <div className="flex items-start">
        {icon && <div className="text-gray-500 mt-1 mr-3 flex-shrink-0">{icon}</div>}
        <div className="flex-grow">
            <label className="block text-sm font-medium text-gray-400">{label}</label>
            {isEditing ? (
                <input 
                    type={type} 
                    name={name}
                    value={value || ''} 
                    onChange={onChange}
                    className="mt-1 block w-full modern-input"
                />
            ) : (
                <p className="mt-1 text-md font-semibold text-white">{value || 'N/A'}</p>
            )}
        </div>
    </div>
);

const TabButton: React.FC<{ active: boolean; onClick: () => void; children: React.ReactNode }> = ({ active, onClick, children }) => (
    <button
        onClick={onClick}
        className={`px-4 py-2 text-sm font-medium rounded-t-md focus:outline-none ${
            active 
            ? 'bg-[#161B22] border-b-2 border-sky-500 text-white' 
            : 'text-gray-400 hover:bg-gray-800'
        }`}
    >
        {children}
    </button>
);

const MedicalSection: React.FC<{ title: string; icon: React.ReactNode; actionButton?: React.ReactNode; children: React.ReactNode; count?: number; }> = 
({ title, icon, actionButton, children, count }) => (
    <div>
        <div className="flex justify-between items-center mb-3">
            <h3 className="text-lg font-semibold text-white flex items-center">{icon} {title}</h3>
            {actionButton}
        </div>
        <div className="bg-[#161B22] border border-gray-700 rounded-lg p-4 max-h-96 overflow-y-auto space-y-4">
            {(count === undefined || count > 0) ? children : <p className="text-gray-500 text-center py-4">No {title.toLowerCase()} found.</p>}
        </div>
    </div>
);

const EditButton: React.FC<{ onClick: () => void }> = ({ onClick }) => (
    <button 
        onClick={onClick} 
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-300 bg-gray-700/50 rounded-md hover:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-sky-500"
        aria-label="Edit item"
    >
        <Edit size={12} />
        Edit
    </button>
);

const ClinicalNoteCard: React.FC<{ note: DoctorNote | NurseNote }> = ({ note }) => {
    const NoteSection: React.FC<{ title: string; content?: string; icon: React.ReactNode }> = ({ title, content, icon }) => {
        if (!content || content.trim() === '') return null;
        return (
            <div>
                <h4 className="text-sm font-semibold text-gray-300 flex items-center mb-1">
                    {icon}
                    <span className="ml-2">{title}</span>
                </h4>
                <div className="pl-7">
                    <p className="text-sm text-gray-300 whitespace-pre-wrap bg-gray-900/50 p-3 rounded-md border border-gray-700/50">{content}</p>
                </div>
            </div>
        )
    };

    return (
        <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700/50">
            <div className="flex justify-between items-start mb-4 pb-3 border-b border-gray-700">
                <div>
                    <p className="font-semibold text-white">Note by {note.authorName}</p>
                    <p className="text-xs text-gray-400">{note.createdAt?.toDate ? new Date(note.createdAt.toDate()).toLocaleString() : 'N/A'}</p>
                </div>
            </div>
            <div className="space-y-4">
                <NoteSection title="Medical Notes" content={note.medicalNotes} icon={<Clipboard size={16} className="text-sky-400" />} />
                <NoteSection title="Diagnosis" content={note.diagnosis} icon={<Stethoscope size={16} className="text-green-400" />} />
                <NoteSection title="Laboratory Orders" content={note.labTestsOrders} icon={<Microscope size={16} className="text-yellow-400" />} />
                <NoteSection title="Radiology Orders" content={note.xrayOrders} icon={<Bone size={16} className="text-indigo-400" />} />
                <NoteSection title="Prescription Orders" content={note.prescriptionOrders} icon={<Pill size={16} className="text-red-400" />} />
            </div>
        </div>
    );
};
// #endregion

// #region Modals
const EditPatientModal: React.FC<{ isOpen: boolean, onClose: () => void, patient: Patient, onUpdate: () => void }> = ({ isOpen, onClose, patient, onUpdate }) => {
    const { addNotification } = useNotification();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: patient.name,
        surname: patient.surname,
        nationalId: patient.nationalId || '',
        passportNumber: patient.passportNumber || '',
        nationality: patient.nationality || 'Zimbabwean',
        dateOfBirth: patient.dateOfBirth,
        maritalStatus: patient.maritalStatus,
        gender: patient.gender,
        countryOfBirth: patient.countryOfBirth,
        phoneNumber: patient.phoneNumber,
        residentialAddress: patient.residentialAddress,
        nokName: patient.nokName,
        nokSurname: patient.nokSurname,
        nokPhoneNumber: patient.nokPhoneNumber,
        nokAddress: patient.nokAddress
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const birthDate = new Date(formData.dateOfBirth);
            const today = new Date();
            let age = today.getFullYear() - birthDate.getFullYear();
            const m = today.getMonth() - birthDate.getMonth();
            if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
                age--;
            }

            await db.collection('patients').doc(patient.id).update({
                ...formData,
                age
            });
            addNotification('Patient profile updated successfully', 'success');
            onUpdate();
            onClose();
        } catch (error) {
            console.error("Error updating patient:", error);
            addNotification('Failed to update patient details', 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Edit Patient Details" size="lg">
            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                        <h4 className="text-sm font-bold text-sky-400 uppercase border-b border-gray-700 pb-1">Personal Details</h4>
                        <div>
                            <label className="block text-xs text-gray-400 mb-1">First Name</label>
                            <input name="name" value={formData.name} onChange={handleChange} className="modern-input w-full" required />
                        </div>
                        <div>
                            <label className="block text-xs text-gray-400 mb-1">Last Name</label>
                            <input name="surname" value={formData.surname} onChange={handleChange} className="modern-input w-full" required />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs text-gray-400 mb-1">Gender</label>
                                <select name="gender" value={formData.gender} onChange={handleChange} className="modern-select w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-800 text-white" required>
                                    <option value="Male">Male</option>
                                    <option value="Female">Female</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs text-gray-400 mb-1">Date of Birth</label>
                                <input type="date" name="dateOfBirth" value={formData.dateOfBirth} onChange={handleChange} className="modern-input w-full" required />
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs text-gray-400 mb-1">National ID / Passport</label>
                            <input name="nationalId" value={formData.nationalId} onChange={handleChange} className="modern-input w-full" placeholder="Optional if not applicable" />
                        </div>
                        <div>
                            <label className="block text-xs text-gray-400 mb-1">Phone Number</label>
                            <input name="phoneNumber" value={formData.phoneNumber} onChange={handleChange} className="modern-input w-full" required />
                        </div>
                        <div>
                            <label className="block text-xs text-gray-400 mb-1">Address</label>
                            <input name="residentialAddress" value={formData.residentialAddress} onChange={handleChange} className="modern-input w-full" required />
                        </div>
                    </div>
                    
                    <div className="space-y-4">
                        <h4 className="text-sm font-bold text-sky-400 uppercase border-b border-gray-700 pb-1">Next of Kin</h4>
                        <div>
                            <label className="block text-xs text-gray-400 mb-1">NOK Name</label>
                            <input name="nokName" value={formData.nokName} onChange={handleChange} className="modern-input w-full" required />
                        </div>
                        <div>
                            <label className="block text-xs text-gray-400 mb-1">NOK Surname</label>
                            <input name="nokSurname" value={formData.nokSurname} onChange={handleChange} className="modern-input w-full" required />
                        </div>
                        <div>
                            <label className="block text-xs text-gray-400 mb-1">NOK Phone</label>
                            <input name="nokPhoneNumber" value={formData.nokPhoneNumber} onChange={handleChange} className="modern-input w-full" required />
                        </div>
                        <div>
                            <label className="block text-xs text-gray-400 mb-1">NOK Address</label>
                            <input name="nokAddress" value={formData.nokAddress} onChange={handleChange} className="modern-input w-full" required />
                        </div>
                    </div>
                </div>
                
                <div className="flex justify-end gap-3 pt-4 border-t border-gray-700 mt-4">
                    <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-300 bg-gray-700 rounded hover:bg-gray-600">Cancel</button>
                    <button type="submit" disabled={loading} className="px-4 py-2 text-sm text-white bg-sky-600 rounded hover:bg-sky-700 disabled:opacity-50">
                        {loading ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>
            </form>
        </Modal>
    )
}

const ClinicalNoteModal: React.FC<{ isOpen: boolean, onClose: () => void, noteType: 'doctor' | 'nurse', patientId: string, onNoteAdded: () => void }> = 
({ isOpen, onClose, noteType, patientId, onNoteAdded }) => {
    const { userProfile } = useAuth();
    const { addNotification } = useNotification();
    const [loading, setLoading] = useState(false);
    const [activeSection, setActiveSection] = useState<'notes' | 'diagnosis' | 'orders'>('notes');
    const initialState = { medicalNotes: '', diagnosis: '', labTestsOrders: '', xrayOrders: '', prescriptionOrders: '' };
    const [formData, setFormData] = useState(initialState);
    
    useEffect(() => {
        if (isOpen) {
            setFormData(initialState);
            setActiveSection('notes');
        }
    }, [isOpen]);

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!userProfile || !patientId) return;
        setLoading(true);

        const collectionName = noteType === 'doctor' ? 'doctorNotes' : 'nurseNotes';
        const noteData = {
            ...formData,
            authorId: userProfile.id,
            authorName: `${userProfile.name} ${userProfile.surname} (${userProfile.role})`,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        };

        try {
            await db.collection('patients').doc(patientId).collection(collectionName).add(noteData);
            addNotification('Note added successfully.', 'success');
            onNoteAdded();
            onClose();
        } catch (error) {
            addNotification('Failed to add note.', 'error');
        } finally {
            setLoading(false);
        }
    };
    
    const NavItem: React.FC<{ section: string; children: React.ReactNode; }> = ({ section, children }) => (
        <div 
            onClick={() => setActiveSection(section as any)}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg cursor-pointer transition-all text-sm font-medium ${
                activeSection === section 
                ? 'bg-sky-600 text-white shadow-lg shadow-sky-900/20' 
                : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
            }`}
        >
            {children}
        </div>
    );
    
    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Add New ${noteType === 'doctor' ? "Doctor's" : "Nurse's"} Note`} size="lg">
            <form onSubmit={handleSubmit} className="flex flex-col h-[600px] md:h-auto">
                <div className="flex flex-col md:flex-row gap-6 flex-1 min-h-0">
                    <nav className="flex md:flex-col gap-2 md:w-56 flex-shrink-0 overflow-x-auto md:overflow-visible pb-2 md:pb-0 border-b md:border-b-0 md:border-r border-gray-700/50 pr-0 md:pr-4">
                        <NavItem section="notes"><Clipboard size={18} /> Medical Notes</NavItem>
                        <NavItem section="diagnosis"><Stethoscope size={18} /> Diagnosis</NavItem>
                        <NavItem section="orders"><FilePlus size={18} /> Orders</NavItem>
                    </nav>
                    <div className="flex-1 flex flex-col min-h-0 overflow-y-auto custom-scrollbar pr-2">
                        {activeSection === 'notes' && (
                            <div className="flex flex-col h-full space-y-2">
                                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide">Medical Notes</label>
                                <textarea name="medicalNotes" value={formData.medicalNotes} onChange={handleChange} placeholder="Enter general medical notes..." className="modern-input flex-1 w-full resize-none p-4 min-h-[300px]" />
                            </div>
                        )}
                        {activeSection === 'diagnosis' && (
                            <div className="flex flex-col h-full space-y-2">
                                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide">Diagnosis</label>
                                <textarea name="diagnosis" value={formData.diagnosis} onChange={handleChange} placeholder="Enter diagnosis..." className="modern-input flex-1 w-full resize-none p-4 min-h-[300px]" />
                            </div>
                        )}
                        {activeSection === 'orders' && (
                            <div className="space-y-6">
                                <div className="space-y-2"><label className="flex items-center gap-2 text-sm font-semibold text-yellow-400 uppercase tracking-wide"><Microscope size={16} /> Laboratory Orders</label><textarea name="labTestsOrders" value={formData.labTestsOrders} onChange={handleChange} placeholder="e.g., Full Blood Count..." rows={3} className="modern-input w-full" /></div>
                                <div className="space-y-2"><label className="flex items-center gap-2 text-sm font-semibold text-indigo-400 uppercase tracking-wide"><Bone size={16} /> Radiology Orders</label><textarea name="xrayOrders" value={formData.xrayOrders} onChange={handleChange} placeholder="e.g., Chest X-Ray..." rows={3} className="modern-input w-full" /></div>
                                <div className="space-y-2"><label className="flex items-center gap-2 text-sm font-semibold text-red-400 uppercase tracking-wide"><Pill size={16} /> Prescription Orders</label><textarea name="prescriptionOrders" value={formData.prescriptionOrders} onChange={handleChange} placeholder="e.g., Paracetamol 500mg..." rows={3} className="modern-input w-full" /></div>
                            </div>
                        )}
                    </div>
                </div>
                <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-700">
                    <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-700/50 rounded-lg hover:bg-gray-700 transition-colors">Cancel</button>
                    <button type="submit" disabled={loading} className="px-6 py-2 text-sm font-medium text-white bg-sky-600 rounded-lg hover:bg-sky-500 shadow-lg shadow-sky-900/20 disabled:bg-sky-800 transition-all">{loading ? 'Saving...' : 'Save Note'}</button>
                </div>
            </form>
        </Modal>
    );
};

const AddVitalsModal: React.FC<{ isOpen: boolean, onClose: () => void, patientId: string, onSuccess: () => void }> = ({isOpen, onClose, patientId, onSuccess}) => {
    const { userProfile } = useAuth();
    const { addNotification } = useNotification();
    const [loading, setLoading] = useState(false);
    const initial = { temperature: '', bloodPressure: '', heartRate: '', respiratoryRate: '', weight: '', height: '' };
    const [formData, setFormData] = useState(initial);
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => setFormData(prev => ({...prev, [e.target.name]: e.target.value}));
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!userProfile) return;
        setLoading(true);
        try {
            await db.collection('patients').doc(patientId).collection('vitals').add({
                ...formData, recordedById: userProfile.id, recordedByName: `${userProfile.name} ${userProfile.surname}`, createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            });
            addNotification('Vitals recorded.', 'success'); onSuccess(); setFormData(initial); onClose();
        } catch (error) { addNotification('Failed to record vitals.', 'error'); } finally { setLoading(false); }
    }
    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Record Patient Vitals">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <input type="text" name="temperature" placeholder="Temp (°C)" value={formData.temperature} onChange={handleChange} className="w-full modern-input" />
                    <input type="text" name="bloodPressure" placeholder="BP (mmHg)" value={formData.bloodPressure} onChange={handleChange} className="w-full modern-input" />
                    <input type="text" name="heartRate" placeholder="Heart Rate (bpm)" value={formData.heartRate} onChange={handleChange} className="w-full modern-input" />
                    <input type="text" name="respiratoryRate" placeholder="Resp Rate (bpm)" value={formData.respiratoryRate} onChange={handleChange} className="w-full modern-input" />
                    <input type="text" name="weight" placeholder="Weight (kg)" value={formData.weight} onChange={handleChange} className="w-full modern-input" />
                    <input type="text" name="height" placeholder="Height (cm)" value={formData.height} onChange={handleChange} className="w-full modern-input" />
                </div>
                <div className="flex justify-end space-x-4 pt-2">
                    <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-700 rounded-md hover:bg-gray-600">Cancel</button>
                    <button type="submit" disabled={loading} className="px-4 py-2 text-sm font-medium text-white bg-sky-600 rounded-md hover:bg-sky-700">Save Vitals</button>
                </div>
            </form>
        </Modal>
    )
}

const GenericNoteModal: React.FC<{ isOpen: boolean, onClose: () => void, patientId: string, onSuccess: () => void, collectionName: string, title: string, existingNote?: any }> = 
({ isOpen, onClose, patientId, onSuccess, collectionName, title, existingNote }) => {
    const { userProfile } = useAuth();
    const { addNotification } = useNotification();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState<any>({});
    useEffect(() => { if (existingNote) setFormData(existingNote); else setFormData({}); }, [existingNote, isOpen]);
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setFormData(prev => ({...prev, [e.target.name]: e.target.value}));
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault(); if (!userProfile) return; setLoading(true);
        const noteRef = existingNote ? db.collection('patients').doc(patientId).collection(collectionName).doc(existingNote.id) : db.collection('patients').doc(patientId).collection(collectionName).doc();
        const data = { ...formData, updatedAt: firebase.firestore.FieldValue.serverTimestamp() };
        if (!existingNote) { data.authorId = userProfile.id; data.authorName = `${userProfile.name} ${userProfile.surname}`; data.createdAt = firebase.firestore.FieldValue.serverTimestamp(); }
        try { if (existingNote) await noteRef.update(data); else await noteRef.set(data); addNotification(`${title} saved.`, 'success'); onSuccess(); onClose(); } catch (error) { addNotification(`Failed to save.`, 'error'); } finally { setLoading(false); }
    }
    return (
        <Modal isOpen={isOpen} onClose={onClose} title={existingNote ? `Edit ${title}` : `Add ${title}`}>
            <form onSubmit={handleSubmit} className="space-y-4">
                 {collectionName === 'prescriptions' ? (<><input type="text" name="medication" placeholder="Medication" value={formData.medication || ''} onChange={handleChange} required className="w-full modern-input" /><input type="text" name="dosage" placeholder="Dosage" value={formData.dosage || ''} onChange={handleChange} required className="w-full modern-input" /><textarea name="instructions" placeholder="Instructions" value={formData.instructions || ''} onChange={handleChange} required rows={3} className="w-full modern-input" /></>) : 
                  collectionName === 'labResults' ? (<><input type="text" name="testName" placeholder="Test Name" value={formData.testName || ''} onChange={handleChange} required className="w-full modern-input" /><input type="text" name="resultValue" placeholder="Result Value" value={formData.resultValue || ''} onChange={handleChange} required className="w-full modern-input" /><textarea name="notes" placeholder="Notes" value={formData.notes || ''} onChange={handleChange} rows={3} className="w-full modern-input" /></>) : 
                  collectionName === 'radiologyResults' ? (<><input type="text" name="imageDescription" placeholder="Image Description" value={formData.imageDescription || ''} onChange={handleChange} required className="w-full modern-input" /><textarea name="findings" placeholder="Findings / Report" value={formData.findings || ''} onChange={handleChange} rows={4} required className="w-full modern-input" /></>) : 
                  (<textarea name={collectionName === 'dischargeSummaries' ? 'summary' : 'content'} placeholder="Enter notes here..." value={formData.summary || formData.content || ''} onChange={handleChange} required rows={5} className="w-full modern-input" />)}
                 <div className="flex justify-end space-x-4 pt-2">
                    <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-700 rounded-md hover:bg-gray-600">Cancel</button>
                    <button type="submit" disabled={loading} className="px-4 py-2 text-sm font-medium text-white bg-sky-600 rounded-md hover:bg-sky-700">{loading ? 'Saving...' : 'Save'}</button>
                </div>
            </form>
        </Modal>
    )
}

const AdmitPatientModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  patientId: string;
  patient: Patient; 
  onSuccess: () => void;
}> = ({ isOpen, onClose, patientId, patient, onSuccess }) => {
    const { userProfile } = useAuth();
    const { addNotification } = useNotification();
    const [loading, setLoading] = useState(true);
    const [wards, setWards] = useState<Ward[]>([]);
    const [occupancy, setOccupancy] = useState<Record<string, { occupied: number, beds: number[] }>>({});
    const [selectedWardId, setSelectedWardId] = useState('');
    const [selectedBedNumber, setSelectedBedNumber] = useState<number | null>(null);

    useEffect(() => {
        if (!isOpen) return;
        const fetchWardData = async () => {
            setLoading(true);
            try {
                const wardsSnapshot = await db.collection('wards').orderBy('name').get();
                const wardsData = wardsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Ward));
                setWards(wardsData);
                const admittedPatients = await db.collection('patients').where('status', 'in', ['Admitted', 'PendingDischarge']).get();
                const newOccupancy: Record<string, { occupied: number, beds: number[] }> = {};
                admittedPatients.docs.forEach(doc => {
                    const p = doc.data() as Patient;
                    if (p.currentWardId && p.currentBedNumber) {
                        if (!newOccupancy[p.currentWardId]) {
                            newOccupancy[p.currentWardId] = { occupied: 0, beds: [] };
                        }
                        newOccupancy[p.currentWardId].occupied += 1;
                        newOccupancy[p.currentWardId].beds.push(p.currentBedNumber);
                    }
                });
                setOccupancy(newOccupancy);
            } catch (error) { addNotification('Failed to load ward data.', 'error'); } finally { setLoading(false); }
        };
        fetchWardData();
    }, [isOpen, addNotification]);

    useEffect(() => { setSelectedBedNumber(null); }, [selectedWardId]);
    const selectedWard = wards.find(w => w.id === selectedWardId);
    const validationError = useMemo(() => {
        if (!selectedWard || !patient) return null;
        if (selectedWard.gender && selectedWard.gender !== 'Mixed' && patient.gender !== selectedWard.gender) return { title: "Gender Restriction", message: `This ward is restricted to ${selectedWard.gender} patients.` };
        if (selectedWard.maxAge && selectedWard.maxAge > 0 && patient.age > selectedWard.maxAge) return { title: "Age Limit Exceeded", message: `This ward is for patients under ${selectedWard.maxAge} years.` };
        return null;
    }, [selectedWard, patient]);
    const suggestedWards = useMemo(() => {
        if (!validationError) return [];
        return wards.filter(w => (!w.gender || w.gender === 'Mixed' || w.gender === patient.gender) && (!w.maxAge || patient.age <= w.maxAge) && (occupancy[w.id]?.occupied || 0) < w.totalBeds);
    }, [validationError, wards, patient, occupancy]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!userProfile || !selectedWardId || !selectedBedNumber) { addNotification('Please select a ward and a bed.', 'warning'); return; }
        if (validationError) { addNotification("Cannot admit to this ward due to restrictions.", 'error'); return; }
        const currentWard = wards.find(w => w.id === selectedWardId);
        if (!currentWard) return;
        if (occupancy[selectedWardId]?.beds.includes(selectedBedNumber)) { addNotification(`Bed ${selectedBedNumber} is occupied.`, 'error'); return; }
        setLoading(true);
        try {
            const batch = db.batch();
            const patientRef = db.collection('patients').doc(patientId);
            batch.update(patientRef, { status: 'Admitted', currentWardId: currentWard.id, currentWardName: currentWard.name, currentBedNumber: selectedBedNumber, lastAdmissionDate: firebase.firestore.FieldValue.serverTimestamp() });
            const admissionRef = patientRef.collection('admissionHistory').doc();
            batch.set(admissionRef, { admissionDate: firebase.firestore.FieldValue.serverTimestamp(), admittedById: userProfile.id, admittedByName: `${userProfile.name} ${userProfile.surname}`, wardId: currentWard.id, wardName: currentWard.name, bedNumber: selectedBedNumber, lastBilledDate: firebase.firestore.FieldValue.serverTimestamp() });
            await batch.commit();
            addNotification('Patient admitted successfully!', 'success'); onSuccess(); onClose();
        } catch (error) { addNotification('Failed to admit patient.', 'error'); } finally { setLoading(false); }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Admit Patient to Ward" size="lg">
            {loading ? <LoadingSpinner /> : (
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Select Ward</label>
                        <div className="grid grid-cols-2 gap-3 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                           {wards.map(ward => {
                                const occupiedCount = occupancy[ward.id]?.occupied || 0;
                                const isFull = occupiedCount >= ward.totalBeds;
                                const isSelected = selectedWardId === ward.id;
                                return (
                                    <div key={ward.id} onClick={() => !isFull && setSelectedWardId(ward.id)} className={`ward-card ${isSelected ? 'selected' : ''} ${isFull ? 'disabled' : ''}`}>
                                        <div className="ward-card-radio"></div>
                                        <p className="font-bold text-white text-sm">{ward.name}</p>
                                        <p className="text-xs text-gray-400">{occupiedCount} / {ward.totalBeds} Beds {isFull && <span className="text-red-500 font-bold ml-1">FULL</span>}</p>
                                        <p className="text-sm font-semibold text-green-400 mt-2">${ward.pricePerDay.toFixed(2)}/day</p>
                                    </div>
                                );
                           })}
                        </div>
                    </div>
                    {selectedWard && (
                        <div>
                            {validationError ? (
                                <div className="animate-slide-in-top"><div className="bg-red-900/20 border border-red-800 rounded-lg p-4 mb-4"><div className="flex items-center gap-3 mb-2"><AlertCircle className="text-red-500" size={24} /><h4 className="text-lg font-bold text-red-400">Cannot Admit to {selectedWard.name}</h4></div><p className="text-sm text-gray-300 ml-9">{validationError.message}</p></div>{suggestedWards.length > 0 && (<div><p className="text-sm font-semibold text-gray-400 mb-2 ml-1">Suggested Alternatives:</p><div className="grid grid-cols-2 gap-3">{suggestedWards.map(ward => (<button key={ward.id} type="button" onClick={() => setSelectedWardId(ward.id)} className="flex items-center justify-between p-3 bg-gray-800 hover:bg-gray-700 border border-gray-600 rounded-lg transition-colors text-left group"><div><p className="text-sm font-bold text-white">{ward.name}</p><p className="text-xs text-green-400">${ward.pricePerDay}/day</p></div><ArrowRight className="text-gray-500 group-hover:text-sky-400" size={16} /></button>))}</div></div>)}</div>
                            ) : (
                                <div className="animate-slide-in-top"><label className="block text-sm font-medium text-gray-300 mb-3">Select Bed in <span className="text-sky-400">{selectedWard.name}</span></label><div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-3 max-h-60 overflow-y-auto custom-scrollbar p-1">{Array.from({ length: selectedWard.totalBeds }, (_, i) => i + 1).map(bedNum => { const isOccupied = occupancy[selectedWard.id]?.beds.includes(bedNum); const isSelected = selectedBedNumber === bedNum; return (<button key={bedNum} type="button" disabled={isOccupied} onClick={() => setSelectedBedNumber(bedNum)} className={`relative flex flex-col items-center justify-center p-2 rounded-lg border transition-all duration-200 ${isOccupied ? 'bg-red-900/20 border-red-900/50 text-red-500 opacity-70 cursor-not-allowed' : isSelected ? 'bg-sky-600 border-sky-500 text-white shadow-lg shadow-sky-900/50 scale-105' : 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700 hover:border-gray-500'}`}><BedDouble size={20} className={isOccupied ? 'text-red-500' : (isSelected ? 'text-white' : 'text-gray-400')} /><span className="text-xs font-bold mt-1">{bedNum}</span>{isOccupied && (<div className="absolute top-0 right-0 -mt-1 -mr-1 bg-red-600 rounded-full p-0.5"><X size={8} className="text-white" /></div>)}{isSelected && (<div className="absolute top-0 right-0 -mt-1 -mr-1 bg-green-500 rounded-full p-0.5"><Check size={8} className="text-white" /></div>)}</button>); })}</div><div className="flex gap-4 mt-3 text-xs text-gray-400"><div className="flex items-center gap-2"><div className="w-3 h-3 bg-gray-800 border border-gray-700 rounded"></div> Available</div><div className="flex items-center gap-2"><div className="w-3 h-3 bg-red-900/20 border border-red-900/50 rounded"></div> Occupied</div><div className="flex items-center gap-2"><div className="w-3 h-3 bg-sky-600 border border-sky-500 rounded"></div> Selected</div></div></div>
                            )}
                        </div>
                    )}
                    <div className="flex justify-end space-x-4 pt-4 border-t border-gray-700">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-700 rounded-md hover:bg-gray-600">Cancel</button>
                        <button type="submit" disabled={loading || !selectedWardId || !selectedBedNumber || !!validationError} className="px-6 py-2 text-sm font-medium text-white bg-sky-600 rounded-md hover:bg-sky-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-sky-900/20">Confirm Admission</button>
                    </div>
                </form>
            )}
        </Modal>
    );
};
// #endregion

const statusClasses: Record<string, string> = {
    'Admitted': 'bg-blue-900/30 text-blue-400 border-blue-800',
    'PendingDischarge': 'bg-yellow-900/30 text-yellow-400 border-yellow-800',
    'Discharged': 'bg-green-900/30 text-green-400 border-green-800',
};

const MedicalHistoryView: React.FC<{
    patient: Patient;
    permissions: any;
    data: any;
    openModal: (modal: any, item?: any) => void;
    onInitiateDischarge: () => void;
    openClinicalNoteModal: (type: 'doctor' | 'nurse') => void;
    statusClasses: Record<string, string>;
}> = ({ patient, permissions, data, openModal, onInitiateDischarge, openClinicalNoteModal, statusClasses }) => {
    return (
        <div className="space-y-6 animate-slide-in-top">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <MedicalSection 
                    title="Doctor's Notes" 
                    icon={<Stethoscope className="text-sky-400"/>} 
                    count={data.doctorNotes.length}
                    actionButton={permissions.canAddDoctorNote && <button onClick={() => openClinicalNoteModal('doctor')} className="text-xs flex items-center gap-1 bg-sky-600 px-2 py-1 rounded text-white hover:bg-sky-500 transition-colors"><PlusCircle size={14}/> Add Note</button>}
                >
                    {data.doctorNotes.map((note: DoctorNote) => <ClinicalNoteCard key={note.id} note={note} />)}
                </MedicalSection>

                <MedicalSection 
                    title="Nurse's Notes" 
                    icon={<Clipboard className="text-green-400"/>} 
                    count={data.nurseNotes.length}
                    actionButton={permissions.canAddNurseNote && <button onClick={() => openClinicalNoteModal('nurse')} className="text-xs flex items-center gap-1 bg-green-600 px-2 py-1 rounded text-white hover:bg-green-500 transition-colors"><PlusCircle size={14}/> Add Note</button>}
                >
                    {data.nurseNotes.map((note: NurseNote) => <ClinicalNoteCard key={note.id} note={note} />)}
                </MedicalSection>
            </div>

            <MedicalSection 
                title="Vitals History" 
                icon={<HeartPulse className="text-red-400"/>} 
                count={data.vitals.length}
                actionButton={permissions.canAddVitals && <button onClick={() => openModal('vitals')} className="text-xs flex items-center gap-1 bg-red-600 px-2 py-1 rounded text-white hover:bg-red-500 transition-colors"><PlusCircle size={14}/> Record Vitals</button>}
            >
                <table className="w-full text-sm text-left text-gray-300">
                    <thead className="text-xs text-gray-500 uppercase bg-gray-800">
                        <tr>
                            <th className="px-4 py-2">Date</th>
                            <th className="px-4 py-2">BP</th>
                            <th className="px-4 py-2">HR</th>
                            <th className="px-4 py-2">Temp</th>
                            <th className="px-4 py-2">Resp</th>
                            <th className="px-4 py-2">Recorded By</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.vitals.map((v: Vitals) => (
                            <tr key={v.id} className="border-b border-gray-700 hover:bg-gray-800/50">
                                <td className="px-4 py-2">{v.createdAt?.toDate ? new Date(v.createdAt.toDate()).toLocaleString() : 'N/A'}</td>
                                <td className="px-4 py-2">{v.bloodPressure || '-'}</td>
                                <td className="px-4 py-2">{v.heartRate || '-'}</td>
                                <td className="px-4 py-2">{v.temperature || '-'}</td>
                                <td className="px-4 py-2">{v.respiratoryRate || '-'}</td>
                                <td className="px-4 py-2">{v.recordedByName}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </MedicalSection>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <MedicalSection
                    title="Laboratory Results"
                    icon={<Microscope className="text-yellow-400"/>}
                    count={data.labResults.length}
                    actionButton={permissions.canAddLabResult && <button onClick={() => openModal('labResult')} className="text-xs flex items-center gap-1 bg-yellow-600 px-2 py-1 rounded text-white hover:bg-yellow-500 transition-colors"><PlusCircle size={14}/> Add Result</button>}
                >
                    {data.labResults.map((res: LabResult) => (
                        <div key={res.id} className="bg-gray-800/50 p-3 rounded border border-gray-700">
                            <div className="flex justify-between">
                                <span className="font-semibold text-white">{res.testName}</span>
                                <span className="text-xs text-gray-400">{res.createdAt?.toDate ? new Date(res.createdAt.toDate()).toLocaleDateString() : ''}</span>
                            </div>
                            <p className="text-sm text-sky-300 mt-1">Result: {res.resultValue}</p>
                            {res.notes && <p className="text-xs text-gray-400 mt-1 italic">{res.notes}</p>}
                            <p className="text-xs text-gray-500 mt-2 text-right">Tech: {res.technicianName}</p>
                        </div>
                    ))}
                </MedicalSection>

                <MedicalSection
                    title="Radiology Results"
                    icon={<Bone className="text-indigo-400"/>}
                    count={data.radiologyResults.length}
                    actionButton={permissions.canAddRadiologyResult && <button onClick={() => openModal('radiologyResult')} className="text-xs flex items-center gap-1 bg-indigo-600 px-2 py-1 rounded text-white hover:bg-indigo-500 transition-colors"><PlusCircle size={14}/> Add Result</button>}
                >
                    {data.radiologyResults.map((res: RadiologyResult) => (
                        <div key={res.id} className="bg-gray-800/50 p-3 rounded border border-gray-700">
                            <div className="flex justify-between">
                                <span className="font-semibold text-white">{res.imageDescription}</span>
                                <span className="text-xs text-gray-400">{res.createdAt?.toDate ? new Date(res.createdAt.toDate()).toLocaleDateString() : ''}</span>
                            </div>
                            <p className="text-sm text-gray-300 mt-1 whitespace-pre-wrap">{res.findings}</p>
                            <p className="text-xs text-gray-500 mt-2 text-right">Radiologist: {res.radiologistName}</p>
                        </div>
                    ))}
                </MedicalSection>
            </div>

            <MedicalSection
                title="Prescriptions"
                icon={<Pill className="text-red-400"/>}
                count={data.prescriptions.length}
                actionButton={permissions.canAddEditPrescription && <button onClick={() => openModal('prescription')} className="text-xs flex items-center gap-1 bg-red-600 px-2 py-1 rounded text-white hover:bg-red-500 transition-colors"><PlusCircle size={14}/> Add Prescription</button>}
            >
                {data.prescriptions.map((p: Prescription) => (
                    <div key={p.id} className="bg-gray-800/50 p-3 rounded border border-gray-700 flex justify-between items-start group">
                        <div>
                            <p className="font-bold text-white">{p.medication} <span className="text-sm font-normal text-gray-400">({p.dosage})</span></p>
                            <p className="text-sm text-gray-300 mt-1">{p.instructions}</p>
                            <p className="text-xs text-gray-500 mt-1">Prescribed by {p.authorName} on {p.createdAt?.toDate ? new Date(p.createdAt.toDate()).toLocaleDateString() : ''}</p>
                        </div>
                        {permissions.canAddEditPrescription && <EditButton onClick={() => openModal('prescription', p)} />}
                    </div>
                ))}
            </MedicalSection>

            <MedicalSection
                title="Rehabilitation Notes"
                icon={<Activity className="text-orange-400"/>} // Changed from HeartPulse to Activity as HeartPulse used for Vitals
                count={data.rehabNotes.length}
                actionButton={permissions.canAddEditRehabNote && <button onClick={() => openModal('rehabNote')} className="text-xs flex items-center gap-1 bg-orange-600 px-2 py-1 rounded text-white hover:bg-orange-500 transition-colors"><PlusCircle size={14}/> Add Note</button>}
            >
                {data.rehabNotes.map((note: RehabilitationNote) => (
                    <div key={note.id} className="bg-gray-800/50 p-3 rounded border border-gray-700 group">
                        <div className="flex justify-between items-start">
                            <p className="text-sm text-gray-300 whitespace-pre-wrap">{note.content}</p>
                            {permissions.canAddEditRehabNote && <EditButton onClick={() => openModal('rehabNote', note)} />}
                        </div>
                        <p className="text-xs text-gray-500 mt-2 text-right">Therapist: {note.authorName} | {note.createdAt?.toDate ? new Date(note.createdAt.toDate()).toLocaleDateString() : ''}</p>
                    </div>
                ))}
            </MedicalSection>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <MedicalSection
                    title="Admission History"
                    icon={<BedDouble className="text-blue-400"/>}
                    count={data.admissionHistory.length}
                    actionButton={permissions.canManageAdmission && patient.status !== 'Admitted' && patient.status !== 'PendingDischarge' && <button onClick={() => openModal('admit')} className="text-xs flex items-center gap-1 bg-blue-600 px-2 py-1 rounded text-white hover:bg-blue-500 transition-colors"><LogIn size={14}/> Admit Patient</button>}
                >
                    {data.admissionHistory.map((rec: AdmissionRecord) => (
                        <div key={rec.id} className="bg-gray-800/50 p-3 rounded border border-gray-700 mb-2">
                            <div className="flex justify-between">
                                <span className="font-semibold text-white">{rec.wardName} <span className="text-gray-400 font-normal text-xs">(Bed {rec.bedNumber})</span></span>
                                <span className="text-xs text-gray-400">{rec.admissionDate?.toDate ? new Date(rec.admissionDate.toDate()).toLocaleDateString() : 'N/A'}</span>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">Admitted by: {rec.admittedByName}</p>
                            {rec.dischargeDate && <p className="text-xs text-green-400 mt-1">Discharged: {new Date(rec.dischargeDate.toDate()).toLocaleDateString()} by {rec.dischargedByName}</p>}
                        </div>
                    ))}
                </MedicalSection>

                <MedicalSection
                    title="Discharge Summaries"
                    icon={<LogOut className="text-purple-400"/>}
                    count={data.dischargeSummaries.length}
                    actionButton={
                        <div className="flex gap-2">
                            {permissions.canAddEditDischargeSummary && <button onClick={() => openModal('dischargeSummary')} className="text-xs flex items-center gap-1 bg-purple-600 px-2 py-1 rounded text-white hover:bg-purple-500 transition-colors"><PlusCircle size={14}/> Add Summary</button>}
                            {permissions.canManageAdmission && patient.status === 'Admitted' && <button onClick={onInitiateDischarge} className="text-xs flex items-center gap-1 bg-yellow-600 px-2 py-1 rounded text-white hover:bg-yellow-500 transition-colors"><LogOut size={14}/> Initiate Discharge</button>}
                        </div>
                    }
                >
                    {data.dischargeSummaries.map((summary: DischargeSummary) => (
                        <div key={summary.id} className="bg-gray-800/50 p-3 rounded border border-gray-700 group">
                            <div className="flex justify-between items-start">
                                <p className="text-sm text-gray-300 whitespace-pre-wrap">{summary.summary}</p>
                                {permissions.canAddEditDischargeSummary && <EditButton onClick={() => openModal('dischargeSummary', summary)} />}
                            </div>
                            <p className="text-xs text-gray-500 mt-2 text-right">Author: {summary.authorName} | {summary.createdAt?.toDate ? new Date(summary.createdAt.toDate()).toLocaleDateString() : ''}</p>
                        </div>
                    ))}
                </MedicalSection>
            </div>
        </div>
    );
};

const FinancialsView: React.FC<{
    patient: Patient;
    bills: Bill[];
    payments: Payment[];
}> = ({ patient, bills, payments }) => {
    return (
        <div className="space-y-6 animate-slide-in-top">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
                    <p className="text-gray-400 text-sm">Total Billed</p>
                    <p className="text-2xl font-bold text-white">${patient.financials.totalBill.toFixed(2)}</p>
                </div>
                <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
                    <p className="text-gray-400 text-sm">Total Paid</p>
                    <p className="text-2xl font-bold text-green-400">${patient.financials.amountPaid.toFixed(2)}</p>
                </div>
                <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
                    <p className="text-gray-400 text-sm">Outstanding Balance</p>
                    <p className={`text-2xl font-bold ${patient.financials.balance > 0 ? 'text-red-400' : 'text-green-400'}`}>${patient.financials.balance.toFixed(2)}</p>
                </div>
            </div>

            <div className="bg-[#161B22] border border-gray-700 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center"><DollarSign className="mr-2 text-blue-400"/> Billing History</h3>
                {bills.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left text-gray-300">
                            <thead className="text-xs text-gray-500 uppercase bg-gray-800">
                                <tr>
                                    <th className="px-4 py-3">Date</th>
                                    <th className="px-4 py-3">Description / Items</th>
                                    <th className="px-4 py-3 text-right">Amount</th>
                                    <th className="px-4 py-3 text-right">Paid</th>
                                    <th className="px-4 py-3 text-right">Balance</th>
                                    <th className="px-4 py-3 text-center">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-700">
                                {bills.map(bill => (
                                    <tr key={bill.id} className="hover:bg-gray-800/50">
                                        <td className="px-4 py-3 whitespace-nowrap">{new Date(bill.date).toLocaleDateString()}</td>
                                        <td className="px-4 py-3">
                                            {bill.items.length > 0 ? (
                                                <ul className="list-disc list-inside text-xs text-gray-400">
                                                    {bill.items.slice(0, 2).map((item, i) => (
                                                        <li key={i}>{item.description} (x{item.quantity})</li>
                                                    ))}
                                                    {bill.items.length > 2 && <li>+{bill.items.length - 2} more items</li>}
                                                </ul>
                                            ) : 'General Bill'}
                                        </td>
                                        <td className="px-4 py-3 text-right text-white font-medium">${bill.totalBill.toFixed(2)}</td>
                                        <td className="px-4 py-3 text-right text-green-400">${bill.amountPaidAtTimeOfBill.toFixed(2)}</td>
                                        <td className="px-4 py-3 text-right text-red-400">${bill.balance.toFixed(2)}</td>
                                        <td className="px-4 py-3 text-center">
                                            <span className={`px-2 py-1 rounded-full text-xs border ${
                                                bill.status === 'Paid' ? 'bg-green-900/20 text-green-400 border-green-800' : 
                                                bill.status === 'Partially Paid' ? 'bg-yellow-900/20 text-yellow-400 border-yellow-800' : 
                                                'bg-red-900/20 text-red-400 border-red-800'
                                            }`}>
                                                {bill.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : <p className="text-gray-500 text-center py-4">No bills found.</p>}
            </div>

            <div className="bg-[#161B22] border border-gray-700 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center"><DollarSign className="mr-2 text-green-400"/> Payment History</h3>
                {payments.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left text-gray-300">
                            <thead className="text-xs text-gray-500 uppercase bg-gray-800">
                                <tr>
                                    <th className="px-4 py-3">Date</th>
                                    <th className="px-4 py-3">Payment Method</th>
                                    <th className="px-4 py-3">Processed By</th>
                                    <th className="px-4 py-3 text-right">Amount</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-700">
                                {payments.map(payment => (
                                    <tr key={payment.id} className="hover:bg-gray-800/50">
                                        <td className="px-4 py-3 whitespace-nowrap">{new Date(payment.date).toLocaleString()}</td>
                                        <td className="px-4 py-3">{payment.paymentMethod}</td>
                                        <td className="px-4 py-3">{payment.processedByName}</td>
                                        <td className="px-4 py-3 text-right font-bold text-green-400">${payment.amount.toFixed(2)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : <p className="text-gray-500 text-center py-4">No payments recorded.</p>}
            </div>
        </div>
    );
}

const PatientProfile: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { userProfile } = useAuth();
    const { addNotification } = useNotification();
    const [patient, setPatient] = useState<Patient | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'medical' | 'financials'>('medical');
    const [isDetailsExpanded, setIsDetailsExpanded] = useState(false); 
    const [error, setError] = useState<string | null>(null);

    // Data States
    const [doctorNotes, setDoctorNotes] = useState<DoctorNote[]>([]);
    const [nurseNotes, setNurseNotes] = useState<NurseNote[]>([]);
    const [vitals, setVitals] = useState<Vitals[]>([]);
    const [labResults, setLabResults] = useState<LabResult[]>([]);
    const [radiologyResults, setRadiologyResults] = useState<RadiologyResult[]>([]);
    const [rehabNotes, setRehabNotes] = useState<RehabilitationNote[]>([]);
    const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
    const [dischargeSummaries, setDischargeSummaries] = useState<DischargeSummary[]>([]);
    const [admissionHistory, setAdmissionHistory] = useState<AdmissionRecord[]>([]);
    const [bills, setBills] = useState<Bill[]>([]);
    const [payments, setPayments] = useState<Payment[]>([]);
    
    // Modal States
    const [modalState, setModalState] = useState({ clinicalNote: false, vitals: false, labResult: false, radiologyResult: false, rehabNote: false, prescription: false, dischargeSummary: false, admit: false, payment: false, editPatient: false });
    const [noteTypeToAdd, setNoteTypeToAdd] = useState<'doctor' | 'nurse'>('doctor');
    const [selectedItem, setSelectedItem] = useState<any>(null); 

    const permissions = useMemo(() => {
        if (!userProfile) return {};
        const role = userProfile.role;
        return {
            canAddDoctorNote: role === Role.Doctor || role === Role.Admin,
            canAddNurseNote: role === Role.Nurse || role === Role.Doctor || role === Role.Admin,
            canAddVitals: role === Role.Nurse || role === Role.VitalsChecker || role === Role.Doctor || role === Role.Admin,
            canAddLabResult: role === Role.LaboratoryTechnician || role === Role.Admin,
            canAddRadiologyResult: role === Role.Radiologist || role === Role.Admin,
            canAddEditRehabNote: role === Role.RehabilitationTechnician || role === Role.Admin,
            canAddEditPrescription: role === Role.Doctor || role === Role.Admin,
            canAddEditDischargeSummary: role === Role.Doctor || role === Role.Admin,
            canManageAdmission: role === Role.Nurse || role === Role.Doctor || role === Role.Admin,
            canViewFinancials: [Role.Accountant, Role.AccountsAssistant, Role.AccountsClerk, Role.Admin].includes(role),
            canEditPatient: [Role.Accountant, Role.AccountsAssistant, Role.AccountsClerk, Role.Admin].includes(role),
        };
    }, [userProfile]);

    const canMakePayment = useMemo(() => {
        if (!userProfile) return false;
        return [Role.Accountant, Role.AccountsAssistant, Role.AccountsClerk, Role.Admin].includes(userProfile.role);
    }, [userProfile]);

    const fetchPatientData = useCallback(async (refresh = false) => {
        if (!id) return;
        if (!refresh) setLoading(true);
        setError(null);
        try {
            const patientDoc = await db.collection('patients').doc(id).get();
            if (!patientDoc.exists) { addNotification('Patient not found.', 'error'); navigate('/accounts/patients'); return; }
            setPatient({ id: patientDoc.id, ...patientDoc.data() } as Patient);
            
            const fetchSub = async (col: string, setter: any) => { 
                const snap = await db.collection('patients').doc(id).collection(col).orderBy('createdAt', 'desc').get(); 
                setter(snap.docs.map(d => ({ id: d.id, ...d.data() }))); 
            };
            
            await Promise.all([
                fetchSub('doctorNotes', setDoctorNotes), 
                fetchSub('nurseNotes', setNurseNotes), 
                fetchSub('vitals', setVitals), 
                fetchSub('labResults', setLabResults), 
                fetchSub('radiologyResults', setRadiologyResults), 
                fetchSub('rehabNotes', setRehabNotes), 
                fetchSub('prescriptions', setPrescriptions), 
                fetchSub('dischargeSummaries', setDischargeSummaries),
            ]);
            
            const admissionSnap = await db.collection('patients').doc(id).collection('admissionHistory').orderBy('admissionDate', 'desc').get();
            setAdmissionHistory(admissionSnap.docs.map(d => ({ id: d.id, ...d.data() } as AdmissionRecord)));
            
            // Financials - Use standard orderBy, catching index errors
            const billsSnap = await db.collection('bills').where('patientId', '==', id).orderBy('date', 'desc').get();
            setBills(billsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Bill)));
            
            const paymentsSnap = await db.collection('payments').where('patientId', '==', id).orderBy('date', 'desc').get();
            setPayments(paymentsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Payment)));

        } catch (error: any) { 
            console.error("Error fetching patient profile:", error); 
            if (error.message && error.message.includes('requires an index')) {
                setError(error.message);
            } else {
                addNotification('Error loading patient data.', 'error'); 
            }
        } finally { 
            setLoading(false); 
        }
    }, [id, navigate, addNotification]);

    useEffect(() => { fetchPatientData(); }, [fetchPatientData]);

    const openModal = (modalName: keyof typeof modalState, item?: any) => { setSelectedItem(item || null); setModalState(prev => ({ ...prev, [modalName]: true })); };
    const openClinicalNoteModal = (type: 'doctor' | 'nurse') => { setNoteTypeToAdd(type); setModalState(prev => ({ ...prev, clinicalNote: true })); };
    const closeModal = (modalName: keyof typeof modalState) => { setModalState(prev => ({ ...prev, [modalName]: false })); setSelectedItem(null); };

    const handleInitiateDischarge = async () => {
        if (!patient || !userProfile) return;
        try { await db.collection('patients').doc(patient.id).update({ status: 'PendingDischarge', dischargeRequesterId: userProfile.id }); addNotification('Discharge process initiated. Pending approval.', 'success'); fetchPatientData(true); } catch (error) { console.error("Error initiating discharge:", error); addNotification('Failed to initiate discharge.', 'error'); }
    };

    const handlePrintFullReport = () => {
    if (!patient) return;

    const styles = `
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
        
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Inter', 'Segoe UI', Arial, sans-serif;
            line-height: 1.6;
            color: #1a1a1a;
            background: #ffffff;
            padding: 30px;
            max-width: 1200px;
            margin: 0 auto;
        }
        
        .header {
            text-align: center;
            padding: 30px 0;
            margin-bottom: 40px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border-radius: 12px;
            color: white;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
        }
        
        h1 {
            font-size: 32px;
            font-weight: 700;
            margin-bottom: 10px;
            letter-spacing: -0.5px;
        }
        
        .hospital-name {
            font-size: 18px;
            font-weight: 400;
            opacity: 0.9;
            margin-bottom: 20px;
        }
        
        .generated-date {
            font-size: 14px;
            background: rgba(255, 255, 255, 0.15);
            display: inline-block;
            padding: 8px 20px;
            border-radius: 20px;
            font-weight: 500;
        }
        
        h2 {
            color: #2d3748;
            border-bottom: 2px solid #667eea;
            padding-bottom: 10px;
            margin: 40px 0 25px 0;
            font-size: 22px;
            font-weight: 600;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        
        h2 i {
            color: #667eea;
        }
        
        .section {
            margin-bottom: 40px;
            page-break-inside: avoid;
        }
        
        .section-title {
            display: flex;
            align-items: center;
            gap: 10px;
            margin-bottom: 15px;
        }
        
        .section-title h3 {
            font-size: 18px;
            color: #4a5568;
            font-weight: 600;
        }
        
        .section-title i {
            color: #667eea;
        }
        
        .patient-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        
        .info-card {
            background: #f8f9fa;
            border-radius: 10px;
            padding: 20px;
            border-left: 4px solid #667eea;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
            transition: transform 0.2s ease;
        }
        
        .info-card:hover {
            transform: translateY(-2px);
        }
        
        .info-card .label {
            font-size: 12px;
            color: #718096;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            font-weight: 600;
            margin-bottom: 8px;
            display: flex;
            align-items: center;
            gap: 6px;
        }
        
        .info-card .value {
            font-size: 16px;
            font-weight: 600;
            color: #2d3748;
        }
        
        table {
            width: 100%;
            border-collapse: separate;
            border-spacing: 0;
            margin: 20px 0;
            border-radius: 10px;
            overflow: hidden;
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.08);
        }
        
        th {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            font-weight: 600;
            padding: 16px 12px;
            text-align: left;
            font-size: 13px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        
        td {
            padding: 14px 12px;
            border-bottom: 1px solid #e2e8f0;
            font-size: 14px;
            color: #4a5568;
        }
        
        tr:nth-child(even) {
            background: #f8f9fa;
        }
        
        tr:hover {
            background: #edf2f7;
        }
        
        .note-card {
            background: white;
            border-radius: 10px;
            padding: 20px;
            margin-bottom: 20px;
            border: 1px solid #e2e8f0;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.04);
            page-break-inside: avoid;
        }
        
        .note-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 15px;
            padding-bottom: 15px;
            border-bottom: 1px solid #e2e8f0;
        }
        
        .note-author {
            font-weight: 600;
            color: #2d3748;
            font-size: 15px;
        }
        
        .note-date {
            color: #718096;
            font-size: 13px;
            background: #f1f5f9;
            padding: 4px 12px;
            border-radius: 12px;
        }
        
        .note-content {
            font-size: 14px;
            line-height: 1.7;
            color: #4a5568;
            white-space: pre-wrap;
        }
        
        .section-group {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 30px;
            margin-bottom: 30px;
        }
        
        .financial-summary {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 20px;
            margin: 30px 0;
        }
        
        .financial-card {
            background: white;
            border-radius: 10px;
            padding: 25px;
            text-align: center;
            border: 1px solid #e2e8f0;
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05);
        }
        
        .financial-card .amount {
            font-size: 28px;
            font-weight: 700;
            margin: 10px 0;
        }
        
        .financial-card.total-billed .amount { color: #667eea; }
        .financial-card.total-paid .amount { color: #38a169; }
        .financial-card.balance .amount { color: #e53e3e; }
        
        .financial-card .label {
            font-size: 13px;
            color: #718096;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            font-weight: 600;
        }
        
        .empty-state {
            text-align: center;
            padding: 40px 20px;
            color: #a0aec0;
            font-style: italic;
            background: #f8f9fa;
            border-radius: 10px;
            border: 2px dashed #cbd5e0;
        }
        
        .empty-state i {
            font-size: 24px;
            margin-bottom: 10px;
            display: block;
        }
        
        .badge {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.3px;
        }
        
        .badge.admitted { background: #bee3f8; color: #2c5282; }
        .badge.pending { background: #fed7d7; color: #c53030; }
        .badge.discharged { background: #c6f6d5; color: #276749; }
        
        .footer {
            margin-top: 50px;
            padding-top: 20px;
            border-top: 2px solid #e2e8f0;
            text-align: center;
            color: #718096;
            font-size: 13px;
        }
        
        .footer p {
            margin: 5px 0;
        }
        
        .status-indicator {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            font-weight: 600;
        }
        
        .status-indicator::before {
            content: '';
            width: 10px;
            height: 10px;
            border-radius: 50%;
            display: inline-block;
        }
        
        .admitted::before { background: #3182ce; }
        .pending::before { background: #e53e3e; }
        .discharged::before { background: #38a169; }
        
        .icon {
            font-family: 'Segoe UI Symbol', 'Material Icons', sans-serif;
            vertical-align: middle;
            margin-right: 5px;
        }
        
        @media print {
            body {
                padding: 20px;
                font-size: 12px;
            }
            
            .no-print { display: none; }
            
            .page-break {
                page-break-before: always;
                margin-top: 40px;
                padding-top: 40px;
                border-top: 2px solid #e2e8f0;
            }
        }
    `;

    const iconMap = {
        user: '👤',
        calendar: '📅',
        phone: '📱',
        id: '🆔',
        location: '📍',
        heart: '❤️',
        flag: '🇿🇼',
        nextOfKin: '👨‍👩‍👧‍👦',
        doctor: '👨‍⚕️',
        nurse: '👩‍⚕️',
        stethoscope: '🩺',
        clipboard: '📋',
        heartRate: '❤️',
        microscope: '🔬',
        xray: '🦴',
        pill: '💊',
        activity: '⚡',
        bed: '🛏️',
        discharge: '🚪',
        dollar: '💰',
        lab: '🧪',
        radiology: '📷',
        rehab: '⚕️',
        prescription: '💊'
    };

    const formatDate = (date) => {
        if (!date) return 'N/A';
        if (date.toDate) {
            return new Date(date.toDate()).toLocaleString();
        }
        return new Date(date).toLocaleString();
    };

    const renderSection = (title, icon, content, isEmpty = false) => {
        if (isEmpty) {
            return `
                <div class="section">
                    <div class="section-title">
                        <i class="icon">${icon}</i>
                        <h3>${title}</h3>
                    </div>
                    <div class="empty-state">
                        <i class="icon">📭</i>
                        <p>No ${title.toLowerCase()} recorded</p>
                    </div>
                </div>
            `;
        }
        return `
            <div class="section">
                <div class="section-title">
                    <i class="icon">${icon}</i>
                    <h3>${title}</h3>
                </div>
                ${content}
            </div>
        `;
    };

    const content = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Medical Report - ${patient.name} ${patient.surname}</title>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>${styles}</style>
        </head>
        <body>
            <div class="header">
                <h1>PATIENT MEDICAL REPORT</h1>
                <div class="hospital-name">RCZ MORGENSTER HOSPITAL - COMPREHENSIVE MEDICAL HISTORY</div>
                <div class="generated-date">Generated: ${new Date().toLocaleString()}</div>
            </div>

            <!-- Patient Information -->
            <div class="section">
                <h2><i class="icon">${iconMap.user}</i> Patient Information</h2>
                <div class="patient-grid">
                    <div class="info-card">
                        <div class="label"><i class="icon">${iconMap.user}</i> Full Name</div>
                        <div class="value">${patient.name} ${patient.surname}</div>
                    </div>
                    <div class="info-card">
                        <div class="label"><i class="icon">📋</i> Hospital Number</div>
                        <div class="value">${patient.hospitalNumber}</div>
                    </div>
                    <div class="info-card">
                        <div class="label"><i class="icon">${iconMap.calendar}</i> Age & DOB</div>
                        <div class="value">${patient.age} years (${patient.dateOfBirth})</div>
                    </div>
                    <div class="info-card">
                        <div class="label"><i class="icon">${iconMap.user}</i> Gender</div>
                        <div class="value">${patient.gender}</div>
                    </div>
                    <div class="info-card">
                        <div class="label"><i class="icon">${iconMap.phone}</i> Contact</div>
                        <div class="value">${patient.phoneNumber}</div>
                    </div>
                    <div class="info-card">
                        <div class="label"><i class="icon">${iconMap.id}</i> National ID</div>
                        <div class="value">${patient.nationalId || 'N/A'}</div>
                    </div>
                    <div class="info-card">
                        <div class="label"><i class="icon">${iconMap.flag}</i> Nationality</div>
                        <div class="value">${patient.nationality}</div>
                    </div>
                    <div class="info-card">
                        <div class="label"><i class="icon">${iconMap.location}</i> Address</div>
                        <div class="value">${patient.residentialAddress}</div>
                    </div>
                </div>
                
                <!-- Status and Ward -->
                <div style="display: flex; gap: 20px; margin-top: 20px;">
                    <div class="info-card" style="flex: 1;">
                        <div class="label"><i class="icon">📊</i> Current Status</div>
                        <div class="value">
                            <span class="status-indicator ${patient.status.toLowerCase()}">
                                ${patient.status === 'PendingDischarge' ? 'Pending Discharge' : patient.status}
                            </span>
                        </div>
                    </div>
                    ${patient.currentWardName ? `
                    <div class="info-card" style="flex: 1;">
                        <div class="label"><i class="icon">${iconMap.bed}</i> Current Ward</div>
                        <div class="value">${patient.currentWardName} (Bed ${patient.currentBedNumber})</div>
                    </div>
                    ` : ''}
                </div>
            </div>

            <!-- Next of Kin -->
            <div class="section">
                <h2><i class="icon">${iconMap.nextOfKin}</i> Next of Kin</h2>
                <div class="patient-grid">
                    <div class="info-card">
                        <div class="label"><i class="icon">${iconMap.user}</i> Name</div>
                        <div class="value">${patient.nokName} ${patient.nokSurname}</div>
                    </div>
                    <div class="info-card">
                        <div class="label"><i class="icon">${iconMap.phone}</i> Phone</div>
                        <div class="value">${patient.nokPhoneNumber}</div>
                    </div>
                    <div class="info-card">
                        <div class="label"><i class="icon">${iconMap.location}</i> Address</div>
                        <div class="value">${patient.nokAddress}</div>
                    </div>
                </div>
            </div>

            <!-- Medical History Sections -->
            <div class="page-break"></div>
            
            <!-- Clinical Notes -->
            <div class="section-group">
                ${renderSection(
                    "Doctor's Notes",
                    iconMap.doctor,
                    doctorNotes.length > 0 ? 
                    doctorNotes.map(note => `
                        <div class="note-card">
                            <div class="note-header">
                                <div class="note-author">${note.authorName}</div>
                                <div class="note-date">${formatDate(note.createdAt)}</div>
                            </div>
                            <div class="note-content">
                                ${note.medicalNotes ? `<p><strong>Medical Notes:</strong><br>${note.medicalNotes}</p>` : ''}
                                ${note.diagnosis ? `<p><strong>Diagnosis:</strong><br>${note.diagnosis}</p>` : ''}
                                ${note.labTestsOrders ? `<p><strong>Lab Orders:</strong><br>${note.labTestsOrders}</p>` : ''}
                                ${note.xrayOrders ? `<p><strong>Radiology Orders:</strong><br>${note.xrayOrders}</p>` : ''}
                                ${note.prescriptionOrders ? `<p><strong>Prescriptions:</strong><br>${note.prescriptionOrders}</p>` : ''}
                            </div>
                        </div>
                    `).join('') : '',
                    doctorNotes.length === 0
                )}

                ${renderSection(
                    "Nurse's Notes",
                    iconMap.nurse,
                    nurseNotes.length > 0 ? 
                    nurseNotes.map(note => `
                        <div class="note-card">
                            <div class="note-header">
                                <div class="note-author">${note.authorName}</div>
                                <div class="note-date">${formatDate(note.createdAt)}</div>
                            </div>
                            <div class="note-content">
                                ${note.medicalNotes ? `<p><strong>Medical Notes:</strong><br>${note.medicalNotes}</p>` : ''}
                                ${note.diagnosis ? `<p><strong>Diagnosis:</strong><br>${note.diagnosis}</p>` : ''}
                                ${note.labTestsOrders ? `<p><strong>Lab Orders:</strong><br>${note.labTestsOrders}</p>` : ''}
                                ${note.xrayOrders ? `<p><strong>Radiology Orders:</strong><br>${note.xrayOrders}</p>` : ''}
                                ${note.prescriptionOrders ? `<p><strong>Prescriptions:</strong><br>${note.prescriptionOrders}</p>` : ''}
                            </div>
                        </div>
                    `).join('') : '',
                    nurseNotes.length === 0
                )}
            </div>

            <!-- Vitals History -->
            ${renderSection(
                "Vitals History",
                iconMap.heartRate,
                vitals.length > 0 ? `
                    <table>
                        <thead>
                            <tr>
                                <th>Date & Time</th>
                                <th>Blood Pressure</th>
                                <th>Heart Rate</th>
                                <th>Temperature</th>
                                <th>Respiratory Rate</th>
                                <th>Weight</th>
                                <th>Height</th>
                                <th>Recorded By</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${vitals.map(v => `
                                <tr>
                                    <td>${formatDate(v.createdAt)}</td>
                                    <td>${v.bloodPressure || '-'}</td>
                                    <td>${v.heartRate || '-'}</td>
                                    <td>${v.temperature || '-'}</td>
                                    <td>${v.respiratoryRate || '-'}</td>
                                    <td>${v.weight || '-'}</td>
                                    <td>${v.height || '-'}</td>
                                    <td>${v.recordedByName || '-'}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                ` : '',
                vitals.length === 0
            )}

            <div class="page-break"></div>

            <!-- Lab Results -->
            ${renderSection(
                "Laboratory Results",
                iconMap.lab,
                labResults.length > 0 ? `
                    <table>
                        <thead>
                            <tr>
                                <th>Test Name</th>
                                <th>Result Value</th>
                                <th>Notes</th>
                                <th>Technician</th>
                                <th>Date</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${labResults.map(res => `
                                <tr>
                                    <td><strong>${res.testName}</strong></td>
                                    <td><span style="color: #3182ce; font-weight: 600;">${res.resultValue}</span></td>
                                    <td>${res.notes || '-'}</td>
                                    <td>${res.technicianName || '-'}</td>
                                    <td>${formatDate(res.createdAt)}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                ` : '',
                labResults.length === 0
            )}

            <!-- Radiology Results -->
            ${renderSection(
                "Radiology Results",
                iconMap.radiology,
                radiologyResults.length > 0 ? 
                radiologyResults.map(res => `
                    <div class="note-card">
                        <div class="note-header">
                            <div class="note-author">${res.imageDescription}</div>
                            <div class="note-date">${formatDate(res.createdAt)}</div>
                        </div>
                        <div class="note-content">
                            <p><strong>Findings:</strong><br>${res.findings}</p>
                            <p><strong>Radiologist:</strong> ${res.radiologistName || 'N/A'}</p>
                        </div>
                    </div>
                `).join('') : '',
                radiologyResults.length === 0
            )}

            <div class="page-break"></div>

            <!-- Prescriptions -->
            ${renderSection(
                "Prescriptions",
                iconMap.prescription,
                prescriptions.length > 0 ? `
                    <table>
                        <thead>
                            <tr>
                                <th>Medication</th>
                                <th>Dosage</th>
                                <th>Instructions</th>
                                <th>Prescribed By</th>
                                <th>Date</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${prescriptions.map(p => `
                                <tr>
                                    <td><strong>${p.medication}</strong></td>
                                    <td>${p.dosage}</td>
                                    <td>${p.instructions}</td>
                                    <td>${p.authorName}</td>
                                    <td>${formatDate(p.createdAt)}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                ` : '',
                prescriptions.length === 0
            )}

            <!-- Rehabilitation Notes -->
            ${renderSection(
                "Rehabilitation Notes",
                iconMap.rehab,
                rehabNotes.length > 0 ? 
                rehabNotes.map(note => `
                    <div class="note-card">
                        <div class="note-header">
                            <div class="note-author">${note.authorName}</div>
                            <div class="note-date">${formatDate(note.createdAt)}</div>
                        </div>
                        <div class="note-content">
                            ${note.content}
                        </div>
                    </div>
                `).join('') : '',
                rehabNotes.length === 0
            )}

            <div class="page-break"></div>

            <!-- Admission History -->
            ${renderSection(
                "Admission History",
                iconMap.bed,
                admissionHistory.length > 0 ? `
                    <table>
                        <thead>
                            <tr>
                                <th>Ward</th>
                                <th>Bed #</th>
                                <th>Admission Date</th>
                                <th>Discharge Date</th>
                                <th>Admitted By</th>
                                <th>Discharged By</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${admissionHistory.map(rec => `
                                <tr>
                                    <td><strong>${rec.wardName}</strong></td>
                                    <td>${rec.bedNumber || '-'}</td>
                                    <td>${formatDate(rec.admissionDate)}</td>
                                    <td>${rec.dischargeDate ? formatDate(rec.dischargeDate) : '-'}</td>
                                    <td>${rec.admittedByName || '-'}</td>
                                    <td>${rec.dischargedByName || '-'}</td>
                                    <td>
                                        <span class="badge ${rec.dischargeDate ? 'discharged' : 'admitted'}">
                                            ${rec.dischargeDate ? 'Discharged' : 'Admitted'}
                                        </span>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                ` : '',
                admissionHistory.length === 0
            )}

            <!-- Discharge Summaries -->
            ${renderSection(
                "Discharge Summaries",
                iconMap.discharge,
                dischargeSummaries.length > 0 ? 
                dischargeSummaries.map(summary => `
                    <div class="note-card">
                        <div class="note-header">
                            <div class="note-author">${summary.authorName}</div>
                            <div class="note-date">${formatDate(summary.createdAt)}</div>
                        </div>
                        <div class="note-content">
                            ${summary.summary}
                        </div>
                    </div>
                `).join('') : '',
                dischargeSummaries.length === 0
            )}

            <div class="page-break"></div>

            <!-- Financial Summary -->
            <div class="section">
                <h2><i class="icon">${iconMap.dollar}</i> Financial Summary</h2>
                <div class="financial-summary">
                    <div class="financial-card total-billed">
                        <div class="label">Total Billed</div>
                        <div class="amount">$${patient.financials.totalBill.toFixed(2)}</div>
                    </div>
                    <div class="financial-card total-paid">
                        <div class="label">Total Paid</div>
                        <div class="amount">$${patient.financials.amountPaid.toFixed(2)}</div>
                    </div>
                    <div class="financial-card balance">
                        <div class="label">Outstanding Balance</div>
                        <div class="amount">$${patient.financials.balance.toFixed(2)}</div>
                    </div>
                </div>

                <!-- Billing History -->
                ${bills.length > 0 ? `
                    <h3 style="margin-top: 30px;">Billing History</h3>
                    <table>
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Description</th>
                                <th>Amount</th>
                                <th>Paid</th>
                                <th>Balance</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${bills.map(bill => `
                                <tr>
                                    <td>${new Date(bill.date).toLocaleDateString()}</td>
                                    <td>
                                        ${bill.items && bill.items.length > 0 ? 
                                            bill.items.slice(0, 2).map(item => 
                                                `${item.description} (x${item.quantity})`
                                            ).join(', ') + (bill.items.length > 2 ? ` +${bill.items.length - 2} more` : '') 
                                            : 'General Bill'
                                        }
                                    </td>
                                    <td>$${bill.totalBill.toFixed(2)}</td>
                                    <td>$${bill.amountPaidAtTimeOfBill.toFixed(2)}</td>
                                    <td>$${bill.balance.toFixed(2)}</td>
                                    <td>
                                        <span class="badge ${
                                            bill.status === 'Paid' ? 'discharged' : 
                                            bill.status === 'Partially Paid' ? 'pending' : 
                                            'pending'
                                        }">
                                            ${bill.status}
                                        </span>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                ` : '<div class="empty-state"><p>No billing history recorded</p></div>'}
            </div>

            <!-- Footer -->
            <div class="footer">
                <p>Report ID: ${patient.hospitalNumber}_${new Date().getTime()}</p>
                <p>Confidential - For Medical Use Only</p>
                <p>RCZ Morgenster Hospital Electronic Medical Record System</p>
                <p>Printed on: ${new Date().toLocaleString()}</p>
            </div>

            <script>
                window.onload = function() {
                    // Auto-print if needed
                    setTimeout(() => {
                        window.print();
                    }, 1000);
                }
            </script>
        </body>
        </html>
    `;

    // Create Blob and download
    const blob = new Blob(['\ufeff', content], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Medical_Report_${patient.hospitalNumber}_${new Date().toISOString().split('T')[0]}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    addNotification('Comprehensive medical report generated and downloaded.', 'success');
};

    const extractLink = (text: string) => {
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        const match = text.match(urlRegex);
        return match ? match[0] : null;
    }

    if (loading) return <LoadingSpinner />;
    
    if (error) {
        const link = extractLink(error);
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] p-4">
                <div className="p-8 bg-[#161B22] border border-red-800 rounded-xl text-center max-w-2xl shadow-2xl">
                    <div className="inline-block p-4 bg-red-900/20 rounded-full mb-6 border border-red-500/30">
                        <AlertCircle size={48} className="text-red-500" />
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-2">Database Configuration Required</h2>
                    <p className="text-gray-300 mb-6 text-sm leading-relaxed">
                        This query requires a composite index in Firestore. 
                        <br/>
                        {link ? "Please click the button below to create it automatically in the Firebase Console." : "Check the console for the creation link."}
                    </p>
                    {link && (
                        <a href={link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors font-semibold shadow-lg shadow-red-900/20">
                            Create Index Now <ExternalLink size={18} />
                        </a>
                    )}
                    <div className="mt-6 p-3 bg-black/30 rounded border border-gray-700 text-left overflow-x-auto">
                        <code className="text-xs text-red-300 font-mono whitespace-pre-wrap">{error}</code>
                    </div>
                </div>
            </div>
        );
    }

    if (!patient) return null;

    const medicalData = { doctorNotes, nurseNotes, vitals, labResults, radiologyResults, rehabNotes, prescriptions, dischargeSummaries, admissionHistory };

  return (
    <div>
        {/* Header */}
        <div className="bg-[#161B22] border border-gray-700 rounded-lg p-6 mb-6 shadow-md relative overflow-hidden transition-all duration-300">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative z-10">
                <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-gray-700 flex items-center justify-center text-2xl font-bold text-gray-400">
                        <User />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-white">{patient.name} {patient.surname}</h1>
                        <div className="flex items-center gap-3 text-sm text-gray-400 mt-1">
                            <span className="font-mono bg-gray-800 px-2 py-0.5 rounded text-sky-400 font-medium">{patient.hospitalNumber}</span>
                            <span className="border-l border-gray-600 pl-3">{patient.gender}</span>
                            <span className="border-l border-gray-600 pl-3">{patient.age} yrs</span>
                        </div>
                    </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                     <div className={`px-3 py-1 rounded-full text-sm font-semibold border ${statusClasses[patient.status] || 'bg-gray-800 text-gray-400'}`}>
                        {patient.status === 'PendingDischarge' ? 'Pending Discharge' : patient.status}
                    </div>
                    {patient.currentWardName && (
                        <div className="text-sm text-sky-400 flex items-center gap-1 font-medium bg-sky-900/20 px-3 py-1 rounded-md border border-sky-800">
                            <BedDouble size={14}/> {patient.currentWardName} <span className="mx-1">•</span> Bed {patient.currentBedNumber}
                        </div>
                    )}
                    <div className="flex gap-2 mt-2">
                        {permissions.canEditPatient && (
                             <button onClick={() => openModal('editPatient')} className="flex items-center gap-2 px-3 py-1.5 bg-gray-700 text-white rounded-md hover:bg-gray-600 transition-colors text-xs font-medium">
                                <Edit size={14} /> Edit Profile
                            </button>
                        )}
                        {canMakePayment && (
                             <button onClick={() => openModal('payment')} className="flex items-center gap-2 px-3 py-1.5 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors shadow-lg shadow-green-900/20 text-xs font-medium">
                                <DollarSign size={14} /> Payment
                            </button>
                        )}
                        <button onClick={handlePrintFullReport} className="flex items-center gap-2 px-3 py-1.5 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors text-xs font-medium">
                            <Printer size={14} /> Full Report
                        </button>
                    </div>
                </div>
            </div>

            {/* Primary Details Grid (Always Visible) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-8 pt-6 border-t border-gray-700">
                <DetailItem label="Date of Birth" value={patient.dateOfBirth} icon={<Calendar size={16}/>} />
                <DetailItem label="Phone" value={patient.phoneNumber} icon={<Phone size={16}/>} />
                <DetailItem label="National ID / Passport" value={patient.nationalId || patient.passportNumber || 'N/A'} icon={<Fingerprint size={16}/>} />
                <DetailItem label="Address" value={patient.residentialAddress} icon={<MapPin size={16}/>} /> 
            </div>

            {/* Collapsible Extended Details */}
            <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 transition-all duration-500 ease-in-out overflow-hidden ${isDetailsExpanded ? 'max-h-[500px] opacity-100 mt-6 pt-4 border-t border-gray-700/50' : 'max-h-0 opacity-0 mt-0'}`}>
                <DetailItem label="Marital Status" value={patient.maritalStatus} icon={<Heart size={16}/>} />
                <DetailItem label="Nationality" value={patient.nationality} icon={<Flag size={16}/>} />
                <DetailItem label="Country of Birth" value={patient.countryOfBirth} icon={<Flag size={16}/>} />
                
                <div className="col-span-full border-t border-gray-700/50 pt-4 mt-2">
                    <h4 className="text-sm font-bold text-gray-400 mb-4 uppercase tracking-wider flex items-center gap-2">
                        <User size={14} /> Next of Kin Details
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 bg-gray-800/30 p-4 rounded-lg border border-gray-700/50">
                        <DetailItem label="Name" value={`${patient.nokName} ${patient.nokSurname}`} />
                        <DetailItem label="Phone" value={patient.nokPhoneNumber} icon={<Phone size={16}/>} />
                        <DetailItem label="Address" value={patient.nokAddress} icon={<MapPin size={16}/>} />
                    </div>
                </div>
                
                <div className="col-span-full text-xs text-gray-500 mt-2 flex justify-end">
                    Registered on {new Date(patient.registrationDate).toLocaleString()}
                </div>
            </div>

            {/* Toggle Button */}
            <button 
                onClick={() => setIsDetailsExpanded(!isDetailsExpanded)}
                className="w-full flex items-center justify-center mt-6 pt-2 text-gray-500 hover:text-sky-400 transition-colors text-sm font-medium focus:outline-none group border-t border-gray-800"
            >
                {isDetailsExpanded ? 'Show Less' : 'Show Full Profile'}
                {isDetailsExpanded ? (
                    <ChevronUp size={16} className="ml-1 group-hover:-translate-y-1 transition-transform" />
                ) : (
                    <ChevronDown size={16} className="ml-1 group-hover:translate-y-1 transition-transform" />
                )}
            </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-700 mb-6">
            <TabButton active={activeTab === 'medical'} onClick={() => setActiveTab('medical')}>Medical History</TabButton>
            {permissions.canViewFinancials && <TabButton active={activeTab === 'financials'} onClick={() => setActiveTab('financials')}>Financials</TabButton>}
        </div>

        {/* Content */}
        {activeTab === 'medical' && (
            <MedicalHistoryView 
                patient={patient} 
                permissions={permissions} 
                data={medicalData} 
                openModal={openModal} 
                onInitiateDischarge={handleInitiateDischarge}
                openClinicalNoteModal={openClinicalNoteModal}
                statusClasses={statusClasses}
            />
        )}

        {activeTab === 'financials' && permissions.canViewFinancials && (
            <FinancialsView patient={patient} bills={bills} payments={payments} />
        )}

        {/* Modals */}
        {patient && <AdmitPatientModal isOpen={modalState.admit} onClose={() => closeModal('admit')} patientId={patient.id!} patient={patient} onSuccess={() => fetchPatientData(true)} />}
        {canMakePayment && <MakePaymentModal isOpen={modalState.payment} onClose={() => closeModal('payment')} patient={patient} onPaymentSuccess={() => fetchPatientData(true)} />}
        
        {patient && <EditPatientModal isOpen={modalState.editPatient} onClose={() => closeModal('editPatient')} patient={patient} onUpdate={() => fetchPatientData(true)} />}
        
        {patient && <ClinicalNoteModal isOpen={modalState.clinicalNote} onClose={() => closeModal('clinicalNote')} noteType={noteTypeToAdd} patientId={patient.id!} onNoteAdded={() => fetchPatientData(true)} />}
        {patient && <AddVitalsModal isOpen={modalState.vitals} onClose={() => closeModal('vitals')} patientId={patient.id!} onSuccess={() => fetchPatientData(true)} />}
        
        {patient && <GenericNoteModal isOpen={modalState.labResult} onClose={() => closeModal('labResult')} patientId={patient.id!} collectionName="labResults" title="Lab Result" onSuccess={() => fetchPatientData(true)} />}
        {patient && <GenericNoteModal isOpen={modalState.radiologyResult} onClose={() => closeModal('radiologyResult')} patientId={patient.id!} collectionName="radiologyResults" title="Radiology Result" onSuccess={() => fetchPatientData(true)} />}
        {patient && <GenericNoteModal isOpen={modalState.rehabNote} onClose={() => closeModal('rehabNote')} patientId={patient.id!} collectionName="rehabNotes" title="Rehabilitation Note" existingNote={selectedItem} onSuccess={() => fetchPatientData(true)} />}
        {patient && <GenericNoteModal isOpen={modalState.prescription} onClose={() => closeModal('prescription')} patientId={patient.id!} collectionName="prescriptions" title="Prescription" existingNote={selectedItem} onSuccess={() => fetchPatientData(true)} />}
        {patient && <GenericNoteModal isOpen={modalState.dischargeSummary} onClose={() => closeModal('dischargeSummary')} patientId={patient.id!} collectionName="dischargeSummaries" title="Discharge Summary" existingNote={selectedItem} onSuccess={() => fetchPatientData(true)} />}

    </div>
  );
};

export default PatientProfile;


