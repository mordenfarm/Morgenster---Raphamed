
import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { db } from '../../services/firebase';
import firebase from 'firebase/compat/app';
import { 
    Patient, Role, Bill, Payment, DoctorNote, NurseNote, Vitals, LabResult, 
    RadiologyResult, RehabilitationNote, Prescription, DischargeSummary, AdmissionRecord, Ward, BillItem
} from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import LoadingSpinner from '../../components/utils/LoadingSpinner';
import { 
    Edit, Save, X, User, Phone, Heart, DollarSign, FileClock, CreditCard, PlusCircle, 
    UserPlus as RegistrationIcon, Calendar, Briefcase, Stethoscope, HeartPulse, 
    Microscope, Bone, Pill, Clipboard, ClipboardEdit, ClipboardCheck, LogIn, LogOut, Printer, Bed, ChevronDown, FilePlus, AlertCircle, Fingerprint, Check
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
            addNotification('Note added successfully. Notes cannot be edited once saved.', 'success');
            onNoteAdded();
            onClose();
        } catch (error) {
            addNotification('Failed to add note.', 'error');
            console.error(error);
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
                    {/* Navigation Side */}
                    <nav className="flex md:flex-col gap-2 md:w-56 flex-shrink-0 overflow-x-auto md:overflow-visible pb-2 md:pb-0 border-b md:border-b-0 md:border-r border-gray-700/50 pr-0 md:pr-4">
                        <NavItem section="notes"><Clipboard size={18} /> Medical Notes</NavItem>
                        <NavItem section="diagnosis"><Stethoscope size={18} /> Diagnosis</NavItem>
                        <NavItem section="orders"><FilePlus size={18} /> Orders</NavItem>
                    </nav>

                    {/* Content Side */}
                    <div className="flex-1 flex flex-col min-h-0 overflow-y-auto custom-scrollbar pr-2">
                        {activeSection === 'notes' && (
                            <div className="flex flex-col h-full space-y-2">
                                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide">Medical Notes</label>
                                <textarea 
                                    name="medicalNotes" 
                                    value={formData.medicalNotes} 
                                    onChange={handleChange} 
                                    placeholder="Enter general medical notes, observations, and patient history..." 
                                    className="modern-input flex-1 w-full resize-none p-4 min-h-[300px]" 
                                />
                            </div>
                        )}
                        {activeSection === 'diagnosis' && (
                            <div className="flex flex-col h-full space-y-2">
                                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide">Diagnosis</label>
                                <textarea 
                                    name="diagnosis" 
                                    value={formData.diagnosis} 
                                    onChange={handleChange} 
                                    placeholder="Enter primary and secondary diagnosis..." 
                                    className="modern-input flex-1 w-full resize-none p-4 min-h-[300px]" 
                                />
                            </div>
                        )}
                        {activeSection === 'orders' && (
                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <label htmlFor="labTestsOrders" className="flex items-center gap-2 text-sm font-semibold text-yellow-400 uppercase tracking-wide">
                                        <Microscope size={16} /> Laboratory Orders
                                    </label>
                                    <textarea name="labTestsOrders" id="labTestsOrders" value={formData.labTestsOrders} onChange={handleChange} placeholder="e.g., Full Blood Count, Malaria Test..." rows={3} className="modern-input w-full" />
                                </div>
                                <div className="space-y-2">
                                    <label htmlFor="xrayOrders" className="flex items-center gap-2 text-sm font-semibold text-indigo-400 uppercase tracking-wide">
                                        <Bone size={16} /> Radiology Orders
                                    </label>
                                    <textarea name="xrayOrders" id="xrayOrders" value={formData.xrayOrders} onChange={handleChange} placeholder="e.g., Chest X-Ray (PA and Lateral)..." rows={3} className="modern-input w-full" />
                                </div>
                                <div className="space-y-2">
                                    <label htmlFor="prescriptionOrders" className="flex items-center gap-2 text-sm font-semibold text-red-400 uppercase tracking-wide">
                                        <Pill size={16} /> Prescription Orders
                                    </label>
                                    <textarea name="prescriptionOrders" id="prescriptionOrders" value={formData.prescriptionOrders} onChange={handleChange} placeholder="e.g., Paracetamol 500mg, 2 tabs every 6 hours..." rows={3} className="modern-input w-full" />
                                </div>
                            </div>
                        )}
                    </div>
                </div>
                
                <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-700">
                    <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-700/50 rounded-lg hover:bg-gray-700 transition-colors">Cancel</button>
                    <button type="submit" disabled={loading} className="px-6 py-2 text-sm font-medium text-white bg-sky-600 rounded-lg hover:bg-sky-500 shadow-lg shadow-sky-900/20 disabled:bg-sky-800 transition-all">
                        {loading ? 'Saving...' : 'Save Note'}
                    </button>
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
                ...formData,
                recordedById: userProfile.id,
                recordedByName: `${userProfile.name} ${userProfile.surname}`,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            });
            addNotification('Vitals recorded successfully.', 'success');
            onSuccess();
            setFormData(initial);
            onClose();
        } catch (error) {
            addNotification('Failed to record vitals.', 'error');
        } finally {
            setLoading(false);
        }
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
                    <button type="submit" disabled={loading} className="px-4 py-2 text-sm font-medium text-white bg-sky-600 rounded-md hover:bg-sky-700 disabled:bg-sky-800">Save Vitals</button>
                </div>
            </form>
        </Modal>
    )
}

const GenericNoteModal: React.FC<{ isOpen: boolean, onClose: () => void, patientId: string, onSuccess: () => void, collectionName: string, title: string, existingNote?: {id: string, content: string} | {id: string, summary: string} | {id: string, medication: string, dosage: string, instructions: string} }> = 
({ isOpen, onClose, patientId, onSuccess, collectionName, title, existingNote }) => {
    const { userProfile } = useAuth();
    const { addNotification } = useNotification();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState<any>({});
    
    useEffect(() => {
        if (existingNote) {
            setFormData(existingNote);
        } else {
             setFormData({});
        }
    }, [existingNote, isOpen]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setFormData(prev => ({...prev, [e.target.name]: e.target.value}));

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!userProfile) return;
        setLoading(true);

        const noteRef = existingNote 
            ? db.collection('patients').doc(patientId).collection(collectionName).doc(existingNote.id)
            : db.collection('patients').doc(patientId).collection(collectionName).doc();
        
        const data = {
            ...formData,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        };

        if (!existingNote) {
            data.authorId = userProfile.id;
            data.authorName = `${userProfile.name} ${userProfile.surname}`;
            data.createdAt = firebase.firestore.FieldValue.serverTimestamp();
        }

        try {
            if (existingNote) {
                await noteRef.update(data);
            } else {
                await noteRef.set(data);
            }
            addNotification(`${title} saved successfully.`, 'success');
            onSuccess();
            onClose();
        } catch (error) {
            addNotification(`Failed to save ${title.toLowerCase()}.`, 'error');
        } finally {
            setLoading(false);
        }
    }
    
    return (
        <Modal isOpen={isOpen} onClose={onClose} title={existingNote ? `Edit ${title}` : `Add ${title}`}>
            <form onSubmit={handleSubmit} className="space-y-4">
                 {collectionName === 'prescriptions' ? (
                    <>
                        <input type="text" name="medication" placeholder="Medication" value={formData.medication || ''} onChange={handleChange} required className="w-full modern-input" />
                        <input type="text" name="dosage" placeholder="Dosage" value={formData.dosage || ''} onChange={handleChange} required className="w-full modern-input" />
                        <textarea name="instructions" placeholder="Instructions" value={formData.instructions || ''} onChange={handleChange} required rows={3} className="w-full modern-input" />
                    </>
                ) : collectionName === 'labResults' ? (
                    <>
                        <input type="text" name="testName" placeholder="Test Name" value={formData.testName || ''} onChange={handleChange} required className="w-full modern-input" />
                        <input type="text" name="resultValue" placeholder="Result Value" value={formData.resultValue || ''} onChange={handleChange} required className="w-full modern-input" />
                        <textarea name="notes" placeholder="Notes" value={formData.notes || ''} onChange={handleChange} rows={3} className="w-full modern-input" />
                    </>
                ) : collectionName === 'radiologyResults' ? (
                     <>
                        <input type="text" name="imageDescription" placeholder="Image Description" value={formData.imageDescription || ''} onChange={handleChange} required className="w-full modern-input" />
                        <textarea name="findings" placeholder="Findings / Report" value={formData.findings || ''} onChange={handleChange} rows={4} required className="w-full modern-input" />
                    </>
                ) : (
                    <textarea name={collectionName === 'dischargeSummaries' ? 'summary' : 'content'} placeholder="Enter notes here..." value={formData.summary || formData.content || ''} onChange={handleChange} required rows={5} className="w-full modern-input" />
                )}
                 <div className="flex justify-end space-x-4 pt-2">
                    <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-700 rounded-md hover:bg-gray-600">Cancel</button>
                    <button type="submit" disabled={loading} className="px-4 py-2 text-sm font-medium text-white bg-sky-600 rounded-md hover:bg-sky-700 disabled:bg-sky-800">{loading ? 'Saving...' : 'Save'}</button>
                </div>
            </form>
        </Modal>
    )
}

const AdmitPatientModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  patientId: string;
  onSuccess: () => void;
}> = ({ isOpen, onClose, patientId, onSuccess }) => {
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
                    const patient = doc.data() as Patient;
                    if (patient.currentWardId && patient.currentBedNumber) {
                        if (!newOccupancy[patient.currentWardId]) {
                            newOccupancy[patient.currentWardId] = { occupied: 0, beds: [] };
                        }
                        newOccupancy[patient.currentWardId].occupied += 1;
                        newOccupancy[patient.currentWardId].beds.push(patient.currentBedNumber);
                    }
                });
                setOccupancy(newOccupancy);
            } catch (error) {
                addNotification('Failed to load ward data.', 'error');
            } finally {
                setLoading(false);
            }
        };

        fetchWardData();
    }, [isOpen, addNotification]);

    // Reset bed selection when ward changes
    useEffect(() => {
        setSelectedBedNumber(null);
    }, [selectedWardId]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!userProfile || !selectedWardId || !selectedBedNumber) {
            addNotification('Please select a ward and a bed.', 'warning');
            return;
        }

        const selectedWard = wards.find(w => w.id === selectedWardId);
        if (!selectedWard) return;

        if (occupancy[selectedWardId]?.beds.includes(selectedBedNumber)) {
            addNotification(`Bed number ${selectedBedNumber} is already occupied.`, 'error');
            return;
        }
        
        setLoading(true);
        try {
            const batch = db.batch();
            const patientRef = db.collection('patients').doc(patientId);

            // Update patient's main document
            batch.update(patientRef, {
                status: 'Admitted',
                currentWardId: selectedWard.id,
                currentWardName: selectedWard.name,
                currentBedNumber: selectedBedNumber,
            });

            // Create a new admission record
            const admissionRef = patientRef.collection('admissionHistory').doc();
            batch.set(admissionRef, {
                admissionDate: firebase.firestore.FieldValue.serverTimestamp(),
                admittedById: userProfile.id,
                admittedByName: `${userProfile.name} ${userProfile.surname}`,
                wardId: selectedWard.id,
                wardName: selectedWard.name,
                bedNumber: selectedBedNumber,
                lastBilledDate: firebase.firestore.FieldValue.serverTimestamp() 
            });

            await batch.commit();
            addNotification('Patient admitted successfully!', 'success');
            onSuccess();
            onClose();
        } catch (error) {
            console.error("Admission error:", error);
            addNotification('Failed to admit patient.', 'error');
        } finally {
            setLoading(false);
        }
    };

    const selectedWard = wards.find(w => w.id === selectedWardId);

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
                                    <div
                                        key={ward.id}
                                        onClick={() => !isFull && setSelectedWardId(ward.id)}
                                        className={`ward-card ${isSelected ? 'selected' : ''} ${isFull ? 'disabled' : ''}`}
                                    >
                                        <div className="ward-card-radio"></div>
                                        <p className="font-bold text-white text-sm">{ward.name}</p>
                                        <p className="text-xs text-gray-400">
                                            {occupiedCount} / {ward.totalBeds} Beds
                                            {isFull && <span className="text-red-500 font-bold ml-1">FULL</span>}
                                        </p>
                                        <p className="text-sm font-semibold text-green-400 mt-2">${ward.pricePerDay.toFixed(2)}/day</p>
                                    </div>
                                );
                           })}
                        </div>
                    </div>
                    
                    {/* Bed Grid Selection */}
                    {selectedWard && (
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-3">
                                Select Bed in <span className="text-sky-400">{selectedWard.name}</span>
                            </label>
                            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-3 max-h-60 overflow-y-auto custom-scrollbar p-1">
                                {Array.from({ length: selectedWard.totalBeds }, (_, i) => i + 1).map(bedNum => {
                                    const isOccupied = occupancy[selectedWard.id]?.beds.includes(bedNum);
                                    const isSelected = selectedBedNumber === bedNum;
                                    
                                    return (
                                        <button
                                            key={bedNum}
                                            type="button"
                                            disabled={isOccupied}
                                            onClick={() => setSelectedBedNumber(bedNum)}
                                            className={`
                                                relative flex flex-col items-center justify-center p-2 rounded-lg border transition-all duration-200
                                                ${isOccupied 
                                                    ? 'bg-red-900/20 border-red-900/50 text-red-500 opacity-70 cursor-not-allowed' 
                                                    : isSelected
                                                        ? 'bg-sky-600 border-sky-500 text-white shadow-lg shadow-sky-900/50 scale-105'
                                                        : 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700 hover:border-gray-500'
                                                }
                                            `}
                                        >
                                            <Bed size={20} className={isOccupied ? 'text-red-500' : (isSelected ? 'text-white' : 'text-gray-400')} />
                                            <span className="text-xs font-bold mt-1">{bedNum}</span>
                                            {isOccupied && (
                                                <div className="absolute top-0 right-0 -mt-1 -mr-1 bg-red-600 rounded-full p-0.5">
                                                    <X size={8} className="text-white" />
                                                </div>
                                            )}
                                            {isSelected && (
                                                <div className="absolute top-0 right-0 -mt-1 -mr-1 bg-green-500 rounded-full p-0.5">
                                                    <Check size={8} className="text-white" />
                                                </div>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                            <div className="flex gap-4 mt-3 text-xs text-gray-400">
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 bg-gray-800 border border-gray-700 rounded"></div> Available
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 bg-red-900/20 border border-red-900/50 rounded"></div> Occupied
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 bg-sky-600 border border-sky-500 rounded"></div> Selected
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="flex justify-end space-x-4 pt-4 border-t border-gray-700">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-700 rounded-md hover:bg-gray-600">Cancel</button>
                        <button 
                            type="submit" 
                            disabled={loading || !selectedWardId || !selectedBedNumber} 
                            className="px-6 py-2 text-sm font-medium text-white bg-sky-600 rounded-md hover:bg-sky-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-sky-900/20"
                        >
                            Confirm Admission
                        </button>
                    </div>
                </form>
            )}
        </Modal>
    );
};
// #endregion

const PatientProfile: React.FC = () => {
  // ... (Full component state and fetching logic remains the same) ...
  // Re-pasting for context, but modifications are in helper functions and render
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const { addNotification } = useNotification();

  // States
  const [patient, setPatient] = useState<Patient | null>(null);
  const [bills, setBills] = useState<Bill[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [doctorNotes, setDoctorNotes] = useState<DoctorNote[]>([]);
  const [nurseNotes, setNurseNotes] = useState<NurseNote[]>([]);
  const [vitals, setVitals] = useState<Vitals[]>([]);
  const [labResults, setLabResults] = useState<LabResult[]>([]);
  const [radiologyResults, setRadiologyResults] = useState<RadiologyResult[]>([]);
  const [rehabNotes, setRehabNotes] = useState<RehabilitationNote[]>([]);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [dischargeSummaries, setDischargeSummaries] = useState<DischargeSummary[]>([]);
  const [admissionHistory, setAdmissionHistory] = useState<AdmissionRecord[]>([]);

  // UI States
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState<'medical' | 'financials' | 'registration'>('medical');
  const [formData, setFormData] = useState<Partial<Patient>>({});
  const [registrarName, setRegistrarName] = useState<string>('Unknown');
  const isBillingCheckRunningRef = useRef(false);
  const [isDetailsExpanded, setIsDetailsExpanded] = useState(false);
  
  // Modal States
  const [modalState, setModalState] = useState({
      payment: false,
      clinicalNote: false,
      vitals: false,
      labResult: false,
      radiologyResult: false,
      rehabNote: false,
      prescription: false,
      dischargeSummary: false,
      admit: false,
  });
  const [noteTypeToAdd, setNoteTypeToAdd] = useState<'doctor' | 'nurse'>('doctor');
  const [editingItem, setEditingItem] = useState<any | null>(null);

  const statusClasses = {
    Admitted: 'bg-blue-900 text-blue-300',
    PendingDischarge: 'bg-yellow-900 text-yellow-300',
    Discharged: 'bg-gray-700 text-gray-300',
  };
  
  // Auto billing logic...
  const handleAutomaticBedBilling = useCallback(async (patientData: Patient, admissionHistoryData: AdmissionRecord[]) => {
    // ... (same as before) ...
    if (isBillingCheckRunningRef.current) return;

    if (!['Admitted', 'PendingDischarge'].includes(patientData.status) || !patientData.currentWardId) {
        return; 
    }
    const currentAdmission = admissionHistoryData.find(rec => !rec.dischargeDate);
    if (!currentAdmission) {
        return;
    }

    isBillingCheckRunningRef.current = true;
    try {
        const wardDoc = await db.collection('wards').doc(patientData.currentWardId).get({ source: 'default' });
        
        if (!wardDoc.exists) return;
        
        const ward = wardDoc.data() as Ward;
        if (ward.pricePerDay <= 0) return; 

        const now = new Date();
        const admissionDate = currentAdmission.admissionDate.toDate();
        let lastBilledDate = currentAdmission.lastBilledDate ? currentAdmission.lastBilledDate.toDate() : admissionDate;

        const hoursSinceLastBill = (now.getTime() - lastBilledDate.getTime()) / (1000 * 60 * 60);
        const periodsToBill = Math.floor(hoursSinceLastBill / 24);

        if (periodsToBill > 0) {
            const itemsToBill: BillItem[] = [];
            let billDateCursor = new Date(lastBilledDate);
            let newLastBilledDate = new Date(lastBilledDate);

            for (let i = 0; i < periodsToBill; i++) {
                billDateCursor.setDate(billDateCursor.getDate() + 1);
                newLastBilledDate.setDate(newLastBilledDate.getDate() + 1);
                itemsToBill.push({
                    id: `bed-charge-${ward.id}-${billDateCursor.getTime()}`,
                    description: `Bed Charge - ${ward.name} (${billDateCursor.toLocaleDateString()})`,
                    quantity: 1,
                    unitPrice: ward.pricePerDay,
                    totalPrice: ward.pricePerDay,
                });
            }

            const totalNewBill = itemsToBill.reduce((sum, item) => sum + item.totalPrice, 0);
            
            const batch = db.batch();
            const patientRef = db.collection('patients').doc(patientData.id!);
            const billRef = db.collection('bills').doc();
            const admissionRef = patientRef.collection('admissionHistory').doc(currentAdmission.id);

            const billData: Omit<Bill, 'id'> = {
                patientId: patientData.id!,
                patientName: `${patientData.name} ${patientData.surname}`,
                patientHospitalNumber: patientData.hospitalNumber,
                items: itemsToBill,
                totalBill: totalNewBill,
                amountPaidAtTimeOfBill: 0,
                balance: totalNewBill,
                paymentMethod: 'CASH', 
                date: new Date().toISOString(),
                processedBy: 'SYSTEM_AUTO_BILL',
                status: 'Unpaid',
            };
            batch.set(billRef, billData);

            batch.update(patientRef, {
                'financials.totalBill': firebase.firestore.FieldValue.increment(totalNewBill),
                'financials.balance': firebase.firestore.FieldValue.increment(totalNewBill),
            });
            
            batch.update(admissionRef, { lastBilledDate: firebase.firestore.Timestamp.fromDate(newLastBilledDate) });
            
            await batch.commit();
            addNotification(`Automatically billed ${periodsToBill} day(s) for bed charges.`, 'info');
            return true;
        }
        return false;
    } catch (error) {
        console.error("Auto-billing error:", error);
        return false;
    } finally {
        isBillingCheckRunningRef.current = false;
    }
  }, [addNotification]);

  const fetchPatientData = useCallback(async (force = false) => {
    // ... (fetch logic same as before) ...
    if (!id) return;
    if (!force) setLoading(true);
    try {
        const patientRef = db.collection('patients').doc(id);
        const subcollectionPromises = [
            patientRef.get(),
            db.collection('bills').where('patientId', '==', id).get(),
            db.collection('payments').where('patientId', '==', id).get(),
            patientRef.collection('doctorNotes').orderBy('createdAt', 'desc').get(),
            patientRef.collection('nurseNotes').orderBy('createdAt', 'desc').get(),
            patientRef.collection('vitals').orderBy('createdAt', 'desc').get(),
            patientRef.collection('labResults').orderBy('createdAt', 'desc').get(),
            patientRef.collection('radiologyResults').orderBy('createdAt', 'desc').get(),
            patientRef.collection('rehabilitationNotes').orderBy('createdAt', 'desc').get(),
            patientRef.collection('prescriptions').orderBy('createdAt', 'desc').get(),
            patientRef.collection('dischargeSummaries').orderBy('createdAt', 'desc').get(),
            patientRef.collection('admissionHistory').orderBy('admissionDate', 'desc').get(),
        ];
        
        const [
            patientDoc, billsSnapshot, paymentsSnapshot, doctorNotesSnapshot, nurseNotesSnapshot,
            vitalsSnapshot, labResultsSnapshot, radiologyResultsSnapshot, rehabNotesSnapshot,
            prescriptionsSnapshot, dischargeSummariesSnapshot, admissionHistorySnapshot
        ] = await Promise.all(subcollectionPromises);

        let patientData: Patient | null = null;
        if (patientDoc.exists) {
            patientData = { id: patientDoc.id, ...patientDoc.data() } as Patient;
            setPatient(patientData);
            setFormData(patientData);

             if (patientData.registeredBy && patientData.registeredBy !== 'dummy_user_id') {
                try {
                    const userDoc = await db.collection('users').doc(patientData.registeredBy).get();
                    setRegistrarName(userDoc.exists ? `${userDoc.data()?.name} ${userDoc.data()?.surname}` : 'Unknown Staff');
                } catch (e) { console.error("Could not fetch registrar name", e); }
            } else if (patientData.registeredBy === 'dummy_user_id') {
                setRegistrarName('Seeded Patient Data');
            }
        } else {
            addNotification('Patient not found.', 'error');
            navigate('/accounts/patients');
            return;
        }

        const admissions = admissionHistorySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AdmissionRecord));
        setAdmissionHistory(admissions);

        if (patientData) {
            await handleAutomaticBedBilling(patientData, admissions);
        }

        setBills(billsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Bill)).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
        setPayments(paymentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Payment)).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
        setDoctorNotes(doctorNotesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as DoctorNote)));
        setNurseNotes(nurseNotesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as NurseNote)));
        setVitals(vitalsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Vitals)));
        setLabResults(labResultsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as LabResult)));
        setRadiologyResults(radiologyResultsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as RadiologyResult)));
        setRehabNotes(rehabNotesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as RehabilitationNote)));
        setPrescriptions(prescriptionsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Prescription)));
        setDischargeSummaries(dischargeSummariesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as DischargeSummary)));

    } catch (err) {
        console.error("Error fetching patient data:", err);
        addNotification('Failed to fetch patient data.', 'error');
    } finally {
        if (!force) setLoading(false);
    }
  }, [id, navigate, addNotification, handleAutomaticBedBilling]);

  useEffect(() => {
    fetchPatientData();
  }, [fetchPatientData]);

  // ... (Edit/Save Logic) ...
  useEffect(() => {
    if (isEditing) {
      setIsDetailsExpanded(true);
    }
  }, [isEditing]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    if (!id) return;
    try {
        const updateData: any = {
            phoneNumber: formData.phoneNumber,
            residentialAddress: formData.residentialAddress,
            nokName: formData.nokName,
            nokSurname: formData.nokSurname,
            nokPhoneNumber: formData.nokPhoneNumber,
            nokAddress: formData.nokAddress,
        };
        if (formData.nationalId !== undefined) {
            updateData.nationalId = formData.nationalId;
        }
        await db.collection('patients').doc(id).update(updateData);
        addNotification('Patient profile updated successfully!', 'success');
        setIsEditing(false);
        fetchPatientData(true);
    } catch (error) {
        addNotification('Failed to update profile.', 'error');
    }
  };

  const handleInitiateDischarge = async () => {
    // ... (Logic same as before) ...
    if (!id || !userProfile || !patient || patient.status !== 'Admitted') return;
    try {
      const patientRef = db.collection('patients').doc(id);
      const batch = db.batch();

      batch.update(patientRef, { 
        status: 'PendingDischarge',
        dischargeRequesterId: userProfile.id
      });

      const accountantsQuery = db.collection('users').where('role', '==', Role.Accountant).get();
      const assistantsQuery = db.collection('users').where('role', '==', Role.AccountsAssistant).get();
      const [accountantsSnapshot, assistantsSnapshot] = await Promise.all([accountantsQuery, assistantsQuery]);
      const recipients = [...accountantsSnapshot.docs, ...assistantsSnapshot.docs];

      recipients.forEach(doc => {
          const notificationRef = db.collection('notifications').doc();
          batch.set(notificationRef, {
              recipientId: doc.id,
              senderId: userProfile.id,
              senderName: `${userProfile.name} ${userProfile.surname}`,
              title: 'Discharge Request',
              message: `Discharge requested for patient ${patient?.name} ${patient?.surname} (${patient?.hospitalNumber}). Please review financials.`,
              type: 'system_alert',
              createdAt: firebase.firestore.FieldValue.serverTimestamp(),
              read: false,
          });
      });

      await batch.commit();
      addNotification(`Patient status updated to PendingDischarge.`, 'success');
      fetchPatientData(true);
    } catch (error) {
      addNotification('Failed to update patient status.', 'error');
    }
  };

  const handlePrintFullReport = () => {
      if (!patient) return;

      const styles = `
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; font-size: 10pt; color: #000; background: #fff; }
        .container { width: 100%; padding: 20px; }
        h1 { font-size: 18pt; font-weight: bold; color: #2c3e50; border-bottom: 2px solid #2c3e50; padding-bottom: 10px; margin-bottom: 20px; }
        h2 { font-size: 14pt; font-weight: bold; color: #34495e; margin-top: 20px; margin-bottom: 10px; background-color: #f0f2f5; padding: 5px 10px; }
        h3 { font-size: 12pt; font-weight: bold; color: #555; margin-top: 15px; margin-bottom: 5px; }
        p { margin: 4px 0; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 15px; font-size: 9pt; }
        th, td { border: 1px solid #bdc3c7; padding: 6px; text-align: left; }
        th { background-color: #ecf0f1; font-weight: bold; }
        .section { margin-bottom: 30px; }
        .two-col { display: flex; justify-content: space-between; gap: 20px; }
        .col { flex: 1; }
        .badge { display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 8pt; font-weight: bold; border: 1px solid #ccc; }
        .note { border: 1px solid #eee; padding: 10px; margin-bottom: 10px; background: #fdfdfd; }
      `;

      // Helper to format date for print report in Zimbabwe Time
      const formatDate = (ts: any) => {
          if (!ts) return 'N/A';
          const date = ts.toDate ? ts.toDate() : new Date(ts);
          return date.toLocaleString('en-GB', { 
              timeZone: 'Africa/Harare',
              day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
          });
      };

      let htmlContent = `
        <div class="container">
            <div style="text-align: center; margin-bottom: 30px;">
                <h1>RCZ MORGENSTER HOSPITAL</h1>
                <p style="font-size: 12pt;"><strong>CONFIDENTIAL PATIENT REPORT</strong></p>
                <p>Generated on: ${new Date().toLocaleString('en-GB', { timeZone: 'Africa/Harare' })}</p>
            </div>

            <div class="section two-col">
                <div class="col">
                    <h2>Patient Demographics</h2>
                    <p><strong>Name:</strong> ${patient.name} ${patient.surname}</p>
                    <p><strong>Hospital No:</strong> ${patient.hospitalNumber}</p>
                    <p><strong>DOB:</strong> ${patient.dateOfBirth} (Age: ${patient.age})</p>
                    <p><strong>Gender:</strong> ${patient.gender}</p>
                    <p><strong>National ID:</strong> ${patient.nationalId || 'N/A'}</p>
                    <p><strong>Status:</strong> ${patient.status}</p>
                </div>
                <div class="col">
                    <h2>Contact & NOK</h2>
                    <p><strong>Phone:</strong> ${patient.phoneNumber}</p>
                    <p><strong>Address:</strong> ${patient.residentialAddress}</p>
                    <p><strong>NOK Name:</strong> ${patient.nokName} ${patient.nokSurname}</p>
                    <p><strong>NOK Phone:</strong> ${patient.nokPhoneNumber}</p>
                </div>
            </div>

            <div class="section">
                <h2>Admission History</h2>
                ${admissionHistory.length > 0 ? `
                    <table>
                        <thead>
                            <tr>
                                <th>Admission Date</th>
                                <th>Ward & Bed</th>
                                <th>Admitted By</th>
                                <th>Discharge Date</th>
                                <th>Discharged By</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${admissionHistory.map(a => `
                                <tr>
                                    <td>${formatDate(a.admissionDate)}</td>
                                    <td>${a.wardName} - Bed ${a.bedNumber}</td>
                                    <td>${a.admittedByName}</td>
                                    <td>${formatDate(a.dischargeDate)}</td>
                                    <td>${a.dischargedByName || '-'}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                ` : '<p>No admission history recorded.</p>'}
            </div>
            
            <div class="section">
                <h2>Financial Summary</h2>
                <div class="two-col">
                     <div class="col"><p><strong>Total Bill:</strong> $${patient.financials.totalBill.toFixed(2)}</p></div>
                     <div class="col"><p><strong>Total Paid:</strong> $${patient.financials.amountPaid.toFixed(2)}</p></div>
                     <div class="col"><p><strong>Balance Due:</strong> $${patient.financials.balance.toFixed(2)}</p></div>
                </div>
            </div>

            <div class="section">
                <h2>Clinical Notes</h2>
                ${[...doctorNotes, ...nurseNotes].length > 0 ? [...doctorNotes, ...nurseNotes].sort((a,b) => b.createdAt.toDate() - a.createdAt.toDate()).map(note => `
                    <div class="note">
                        <p><strong>${note.authorName}</strong> <span style="color: #777; font-size: 8pt;">(${formatDate(note.createdAt)})</span></p>
                        ${note.medicalNotes ? `<p><strong>Medical Notes:</strong> ${note.medicalNotes}</p>` : ''}
                        ${note.diagnosis ? `<p><strong>Diagnosis:</strong> ${note.diagnosis}</p>` : ''}
                    </div>
                `).join('') : '<p>No clinical notes found.</p>'}
            </div>
        </div>
      `;

    const finalHTML = `
        <!DOCTYPE html>
        <html>
            <head><meta charset='utf-8'><title>Patient Report</title><style>${styles}</style></head>
            <body>${htmlContent}</body>
        </html>
    `;

    const source = 'data:application/vnd.ms-word;charset=utf-8,' + encodeURIComponent(finalHTML);
    const fileDownload = document.createElement("a");
    document.body.appendChild(fileDownload);
    fileDownload.href = source;
    fileDownload.download = `Report_${patient.name}_${patient.surname}.doc`;
    fileDownload.click();
    document.body.removeChild(fileDownload);

    addNotification('Report downloading. Opening print dialog...', 'info');
    
    const printWindow = window.open('', '_blank');
    if(printWindow) {
        printWindow.document.write(finalHTML);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => { printWindow.print(); printWindow.close(); }, 500);
    }
  };

  const openModal = (modalName: keyof typeof modalState, itemToEdit: any | null = null) => {
    setEditingItem(itemToEdit);
    setModalState(prev => ({ ...prev, [modalName]: true }));
  };

  const openClinicalNoteModal = (type: 'doctor' | 'nurse') => {
    setNoteTypeToAdd(type);
    openModal('clinicalNote');
  };

  const closeModal = (modalName: keyof typeof modalState) => {
    setModalState(prev => ({ ...prev, [modalName]: false }));
    setEditingItem(null);
  };
  
  const canEditProfile = userProfile?.role === Role.Accountant || userProfile?.role === Role.AccountsClerk;
  const canMakePayment = userProfile?.role === Role.Accountant || userProfile?.role === Role.AccountsClerk;
  const canPrintReport = [Role.Admin, Role.Accountant, Role.AccountsAssistant, Role.AccountsClerk].includes(userProfile?.role || '' as Role);
  
  const permissions = {
      canAddDoctorNote: userProfile?.role === Role.Doctor,
      canAddNurseNote: userProfile?.role === Role.Nurse,
      canManageAdmission: userProfile?.role === Role.Doctor || userProfile?.role === Role.Nurse,
      canAddVitals: userProfile?.role === Role.VitalsChecker || userProfile?.role === Role.Nurse,
      canAddLabResult: userProfile?.role === Role.LaboratoryTechnician,
      canAddRadiologyResult: userProfile?.role === Role.Radiologist,
      canAddEditRehabNote: userProfile?.role === Role.RehabilitationTechnician,
      canAddEditPrescription: userProfile?.role === Role.Doctor || userProfile?.role === Role.Nurse,
      canAddEditDischargeSummary: userProfile?.role === Role.Doctor || userProfile?.role === Role.Nurse,
  };


  if (loading) return <LoadingSpinner />;
  if (!patient) return null;

  return (
    <div>
        <div className="flex flex-col sm:flex-row justify-between items-start mb-6 gap-4">
            <div>
                <h1 className="text-3xl font-bold text-white">{patient.name} {patient.surname}</h1>
                <p className="text-sm text-gray-400 mt-1">Hospital No: {patient.hospitalNumber}</p>
                 {patient.status === 'Admitted' && patient.currentWardName && (
                    <p className="text-sm font-semibold text-sky-400 mt-1 flex items-center gap-2"><Bed size={16}/>{patient.currentWardName} - Bed {patient.currentBedNumber}</p>
                )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
                {canPrintReport && (
                    <button onClick={handlePrintFullReport} className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700">
                        <Printer size={16} /> Print Full Report
                    </button>
                )}
                {canMakePayment && (
                    <button onClick={() => openModal('payment')} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700">
                        <PlusCircle size={16} /> Make Payment
                    </button>
                )}
                {canEditProfile && !isEditing && (
                    <button onClick={() => setIsEditing(true)} className="flex items-center gap-2 px-4 py-2 bg-sky-600 text-white rounded-md hover:bg-sky-700">
                        <Edit size={16} /> Edit Profile
                    </button>
                )}
                 {isEditing && (
                    <div className="flex gap-2">
                        <button onClick={handleSave} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700">
                            <Save size={16} /> Save
                        </button>
                        <button onClick={() => { setIsEditing(false); setFormData(patient); }} className="flex items-center gap-2 px-4 py-2 bg-gray-700 text-white rounded-md hover:bg-gray-600">
                           <X size={16} /> Cancel
                        </button>
                    </div>
                )}
            </div>
        </div>
      
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            {/* Left Column: Patient Summary */}
            <div className="lg:col-span-1 bg-[#161B22] border border-gray-700 rounded-lg shadow-md">
                <div className="p-6">
                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center"><User size={18} className="mr-2 text-sky-400"/> Personal Details</h3>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                        {/* ... (Details omitted for brevity, logic unchanged) ... */}
                        <div>
                            <span className="text-gray-400 block">Full Name</span>
                            <p className="font-semibold text-white truncate">{patient.name} {patient.surname}</p>
                        </div>
                        <div>
                            <span className="text-gray-400 block">Hosp. No</span>
                            <p className="font-semibold text-white">{patient.hospitalNumber}</p>
                        </div>
                        <div>
                            <span className="text-gray-400 block">Age</span>
                            <p className="font-semibold text-white">{patient.age}</p>
                        </div>
                        <div>
                            <span className="text-gray-400 block">Gender</span>
                            <p className="font-semibold text-white">{patient.gender}</p>
                        </div>
                        <div className="col-span-2">
                            <span className="text-gray-400 block">Status</span>
                            <p>
                                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${statusClasses[patient.status]}`}>
                                {patient.status === 'PendingDischarge' ? 'Pending Discharge' : patient.status}
                                </span>
                            </p>
                        </div>
                        <div className="col-span-2 border-t border-gray-700 pt-2 mt-2">
                            <span className="text-gray-400 block flex items-center gap-1">
                                <Fingerprint size={14}/> 
                                {patient.passportNumber ? 'Passport Number' : 'National ID'}
                            </span>
                            <p className="font-semibold text-white">
                                {patient.passportNumber ? patient.passportNumber : (patient.nationalId || <span className="text-gray-500 text-xs italic">User created before ID implementation</span>)}
                            </p>
                        </div>
                    </div>
                </div>

                <div className={`details-content ${isDetailsExpanded ? 'expanded' : ''}`}>
                    <div className="px-6 pb-6 space-y-6">
                        <div className="space-y-4 pt-6 border-t border-gray-700">
                            <DetailItem label="Date of Birth" value={patient.dateOfBirth} />
                            <DetailItem label="Marital Status" value={patient.maritalStatus} />
                            {patient.nationality === 'Zimbabwean' ? (
                                <DetailItem label="National ID" name="nationalId" value={formData.nationalId} isEditing={isEditing} onChange={handleChange} icon={<Fingerprint size={16}/>}/>
                            ) : (
                                <DetailItem label="Passport Number" name="passportNumber" value={formData.passportNumber} isEditing={isEditing} onChange={handleChange} icon={<Fingerprint size={16}/>}/>
                            )}
                        </div>
                        <hr className="border-gray-700"/>
                        <div>
                            <h3 className="text-md font-semibold text-white mb-4 flex items-center"><Phone size={16} className="mr-2 text-sky-400"/> Contact Information</h3>
                            <div className="space-y-4">
                                <DetailItem label="Phone Number" name="phoneNumber" value={formData.phoneNumber} isEditing={isEditing} onChange={handleChange} />
                                <DetailItem label="Residential Address" name="residentialAddress" value={formData.residentialAddress} isEditing={isEditing} onChange={handleChange} />
                            </div>
                        </div>
                        <hr className="border-gray-700"/>
                        <div>
                            <h3 className="text-md font-semibold text-white mb-4 flex items-center"><Heart size={16} className="mr-2 text-sky-400"/> Next of Kin</h3>
                            <div className="space-y-4">
                                {isEditing ? (
                                    <>
                                        <DetailItem label="NOK First Name" name="nokName" value={formData.nokName} isEditing={isEditing} onChange={handleChange} />
                                        <DetailItem label="NOK Last Name" name="nokSurname" value={formData.nokSurname} isEditing={isEditing} onChange={handleChange} />
                                    </>
                                ) : (
                                    <DetailItem label="NOK Full Name" value={`${patient.nokName} ${patient.nokSurname}`} />
                                )}
                                <DetailItem label="NOK Phone Number" name="nokPhoneNumber" value={formData.nokPhoneNumber} isEditing={isEditing} onChange={handleChange} />
                                <DetailItem label="NOK Address" name="nokAddress" value={formData.nokAddress} isEditing={isEditing} onChange={handleChange} />
                            </div>
                        </div>
                    </div>
                </div>
                
                <div className="border-t border-gray-700 bg-gray-900/20 rounded-b-lg">
                    <button onClick={() => setIsDetailsExpanded(!isDetailsExpanded)} className="w-full flex justify-between items-center text-sm font-medium text-sky-400 hover:text-sky-300 px-6 py-3">
                        <span>{isDetailsExpanded ? 'Show Less' : 'Show More'}</span>
                        <ChevronDown size={18} className={`details-arrow ${isDetailsExpanded ? 'expanded' : ''}`} />
                    </button>
                </div>
            </div>

            {/* Right Column: Tabbed Content */}
            <div className="lg:col-span-2">
                <div className="border-b border-gray-700">
                    <nav className="-mb-px flex space-x-4" aria-label="Tabs">
                        <TabButton active={activeTab === 'medical'} onClick={() => setActiveTab('medical')}>Medical History</TabButton>
                        <TabButton active={activeTab === 'financials'} onClick={() => setActiveTab('financials')}>Financials</TabButton>
                        <TabButton active={activeTab === 'registration'} onClick={() => setActiveTab('registration')}>Registration</TabButton>
                    </nav>
                </div>
                <div className="mt-6">
                    {activeTab === 'financials' && <FinancialsView patient={patient} bills={bills} payments={payments} />}
                    
                    {activeTab === 'medical' && <MedicalHistoryView patient={patient} permissions={permissions} data={{ doctorNotes, nurseNotes, vitals, labResults, radiologyResults, rehabNotes, prescriptions, dischargeSummaries, admissionHistory }} openModal={openModal} openClinicalNoteModal={openClinicalNoteModal} onInitiateDischarge={handleInitiateDischarge} statusClasses={statusClasses} />}

                    {activeTab === 'registration' && (
                        <div className="bg-[#161B22] border border-gray-700 p-6 rounded-lg shadow-md space-y-6">
                             <DetailItem 
                                label="Registration Date" 
                                value={new Date(patient.registrationDate).toLocaleString('en-GB', { timeZone: 'Africa/Harare' })} 
                                icon={<Calendar size={18}/>} 
                             />
                             <DetailItem label="Registered By" value={registrarName} icon={<RegistrationIcon size={18}/>}/>
                        </div>
                    )}
                </div>
            </div>
        </div>
        
        {/* All Modals */}
        {patient && <AdmitPatientModal isOpen={modalState.admit} onClose={() => closeModal('admit')} patientId={patient.id!} onSuccess={() => fetchPatientData(true)} />}
        {canMakePayment && <MakePaymentModal isOpen={modalState.payment} onClose={() => closeModal('payment')} patient={patient} onPaymentSuccess={() => fetchPatientData(true)} />}
        {patient && <ClinicalNoteModal isOpen={modalState.clinicalNote} onClose={() => closeModal('clinicalNote')} noteType={noteTypeToAdd} patientId={patient.id!} onNoteAdded={() => fetchPatientData(true)} />}
        {patient && permissions.canAddVitals && <AddVitalsModal isOpen={modalState.vitals} onClose={() => closeModal('vitals')} patientId={patient.id!} onSuccess={() => fetchPatientData(true)} />}
        {patient && permissions.canAddLabResult && <GenericNoteModal isOpen={modalState.labResult} onClose={() => closeModal('labResult')} patientId={patient.id!} onSuccess={() => fetchPatientData(true)} collectionName="labResults" title="Lab Result" />}
        {patient && permissions.canAddRadiologyResult && <GenericNoteModal isOpen={modalState.radiologyResult} onClose={() => closeModal('radiologyResult')} patientId={patient.id!} onSuccess={() => fetchPatientData(true)} collectionName="radiologyResults" title="Radiology Result" />}
        {patient && permissions.canAddEditRehabNote && <GenericNoteModal isOpen={modalState.rehabNote} onClose={() => closeModal('rehabNote')} patientId={patient.id!} onSuccess={() => fetchPatientData(true)} collectionName="rehabilitationNotes" title="Rehabilitation Note" existingNote={editingItem} />}
        {patient && permissions.canAddEditPrescription && <GenericNoteModal isOpen={modalState.prescription} onClose={() => closeModal('prescription')} patientId={patient.id!} onSuccess={() => fetchPatientData(true)} collectionName="prescriptions" title="Prescription" existingNote={editingItem} />}
        {patient && permissions.canAddEditDischargeSummary && <GenericNoteModal isOpen={modalState.dischargeSummary} onClose={() => closeModal('dischargeSummary')} patientId={patient.id!} onSuccess={() => fetchPatientData(true)} collectionName="dischargeSummaries" title="Discharge Summary" existingNote={editingItem} />}
    </div>
  );
};

const MedicalHistoryView: React.FC<{patient: Patient, permissions: any, data: any, openModal: any, onInitiateDischarge: () => void, openClinicalNoteModal: (type: 'doctor' | 'nurse') => void, statusClasses: any}> = ({ patient, permissions, data, openModal, onInitiateDischarge, openClinicalNoteModal, statusClasses }) => {
    const { doctorNotes, nurseNotes, vitals, labResults, radiologyResults, rehabNotes, prescriptions, dischargeSummaries, admissionHistory } = data;
    
    // Zimbabwe Date Formatter
    const toZimDate = (timestamp: any) => {
        if (!timestamp) return 'N/A';
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return date.toLocaleString('en-GB', { timeZone: 'Africa/Harare' });
    };

    return (
        <div className="space-y-8">
            <MedicalSection title="Admission & Discharge" icon={<ClipboardCheck size={18} className="mr-2 text-teal-400" />}>
                <div className="bg-gray-800/50 p-3 rounded-md">
                     <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div>
                            <p className="font-semibold text-white">Patient Status</p>
                            <span className={`mt-1 inline-block px-3 py-1 text-sm font-semibold rounded-full ${statusClasses[patient.status]}`}>
                                {patient.status === 'PendingDischarge' ? 'Pending Discharge' : patient.status}
                            </span>
                        </div>
                        {permissions.canManageAdmission && (
                            <div className="flex gap-2">
                                {patient.status === 'Discharged' && (
                                    <button onClick={() => openModal('admit')} className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700">
                                        <LogIn size={16} /> Admit Patient
                                    </button>
                                )}
                                {patient.status === 'Admitted' && (
                                    <button onClick={onInitiateDischarge} className="flex items-center gap-2 px-3 py-2 bg-yellow-600 text-white text-sm rounded-md hover:bg-yellow-700">
                                        <LogOut size={16} /> Initiate Discharge
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </div>
                {permissions.canAddEditDischargeSummary && (
                    <div className="flex justify-end mt-4">
                         <button onClick={() => openModal('dischargeSummary')} className="text-sm flex items-center gap-1 text-sky-500 hover:underline"><PlusCircle size={14}/>Add/Edit Discharge Summary</button>
                    </div>
                )}
                {dischargeSummaries.map((s: DischargeSummary) => (
                    <div key={s.id} className="bg-gray-800/50 p-3 rounded-md">
                         <div className="flex justify-between items-center"><p className="font-semibold text-white">Summary by {s.authorName}</p><EditButton onClick={() => openModal('dischargeSummary', s)} /></div>
                        <p className="text-sm text-gray-300 mt-1">{s.summary}</p>
                    </div>
                ))}

                <div className="mt-4 pt-4 border-t border-gray-700">
                    <h4 className="text-md font-semibold text-gray-300 mb-3">Admission History</h4>
                    <div className="space-y-3 max-h-48 overflow-y-auto pr-2">
                        {admissionHistory && admissionHistory.length > 0 ? (
                            admissionHistory.map((record: AdmissionRecord) => (
                                <div key={record.id} className="text-sm bg-gray-900/50 p-3 rounded-md">
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <p className="font-semibold text-green-400">Admitted: <span className="text-gray-300">{toZimDate(record.admissionDate)}</span></p>
                                            <p className="text-gray-300"> <span className="font-semibold">Location:</span> {record.wardName} - Bed {record.bedNumber}</p>
                                            <p className="text-xs text-gray-500">by {record.admittedByName}</p>
                                        </div>
                                        {record.dischargeDate ? (
                                            <div className="text-right">
                                                <p className="font-semibold text-red-400">Discharged</p>
                                                <p className="text-gray-300">{toZimDate(record.dischargeDate)}</p>
                                                <p className="text-xs text-gray-500">by {record.dischargedByName}</p>
                                            </div>
                                        ) : (
                                            <span className="text-xs px-2 py-1 bg-blue-900 text-blue-300 rounded-full">In-Patient</span>
                                        )}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <p className="text-gray-500 text-center text-sm py-2">No admission history found.</p>
                        )}
                    </div>
                </div>
            </MedicalSection>

            <MedicalSection title="Doctor's Notes" icon={<Stethoscope size={18} className="mr-2 text-sky-400" />} count={doctorNotes.length}
                actionButton={<>
                    {permissions.canAddDoctorNote && <button onClick={() => openClinicalNoteModal('doctor')} className="text-sm flex items-center gap-1 text-sky-500 hover:underline"><PlusCircle size={14}/>Add Doctor Note</button>}
                </>}>
                {doctorNotes.map((note: DoctorNote) => (
                    <ClinicalNoteCard key={note.id} note={note} />
                ))}
            </MedicalSection>

            <MedicalSection title="Nurse's Notes" icon={<Briefcase size={18} className="mr-2 text-lime-400" />} count={nurseNotes.length}
                actionButton={<>
                    {permissions.canAddNurseNote && <button onClick={() => openClinicalNoteModal('nurse')} className="text-sm flex items-center gap-1 text-sky-500 hover:underline"><PlusCircle size={14}/>Add Nurse Note</button>}
                </>}>
                {nurseNotes.map((note: NurseNote) => (
                    <ClinicalNoteCard key={note.id} note={note} />
                ))}
            </MedicalSection>

            <MedicalSection title="Vitals" icon={<HeartPulse size={18} className="mr-2 text-green-400" />} count={vitals.length}
                actionButton={permissions.canAddVitals && <button onClick={() => openModal('vitals')} className="text-sm flex items-center gap-1 text-sky-500 hover:underline"><PlusCircle size={14}/>Add Vitals</button>}>
                 {vitals.map((v: Vitals) => (
                     <div key={v.id} className="bg-gray-800/50 p-3 rounded-md">
                         <div className="flex justify-between items-start"><p className="font-semibold text-white">Recorded by {v.recordedByName}</p><p className="text-xs text-gray-400">{new Date(v.createdAt.toDate()).toLocaleString()}</p></div>
                         <div className="mt-2 grid grid-cols-2 md:grid-cols-3 gap-2 text-sm text-gray-300">
                             <span>BP: {v.bloodPressure}</span><span>HR: {v.heartRate}</span><span>Temp: {v.temperature}°C</span>
                         </div>
                     </div>
                 ))}
            </MedicalSection>

            <MedicalSection title="Lab Results" icon={<Microscope size={18} className="mr-2 text-yellow-400" />} count={labResults.length}
                actionButton={permissions.canAddLabResult && <button onClick={() => openModal('labResult')} className="text-sm flex items-center gap-1 text-sky-500 hover:underline"><PlusCircle size={14}/>Add Result</button>}>
                 {labResults.map((r: LabResult) => (
                     <div key={r.id} className="bg-gray-800/50 p-3 rounded-md">
                         <div className="flex justify-between items-start"><p className="font-semibold text-white">{r.testName}</p><p className="text-xs text-gray-400">{new Date(r.createdAt.toDate()).toLocaleString()}</p></div>
                         <p className="text-sm text-gray-300 mt-1">Result: <span className="font-bold text-white">{r.resultValue}</span></p>
                     </div>
                 ))}
            </MedicalSection>
             <MedicalSection title="Radiology Results" icon={<Bone size={18} className="mr-2 text-indigo-400" />} count={radiologyResults.length}
                actionButton={permissions.canAddRadiologyResult && <button onClick={() => openModal('radiologyResult')} className="text-sm flex items-center gap-1 text-sky-500 hover:underline"><PlusCircle size={14}/>Add Result</button>}>
                {radiologyResults.map((r: RadiologyResult) => (
                    <div key={r.id} className="bg-gray-800/50 p-3 rounded-md">
                        <div className="flex justify-between items-start"><p className="font-semibold text-white">{r.imageDescription}</p><p className="text-xs text-gray-400">{new Date(r.createdAt.toDate()).toLocaleString()}</p></div>
                        <p className="text-sm text-gray-300 mt-1">Findings: {r.findings}</p>
                    </div>
                ))}
            </MedicalSection>
             <MedicalSection title="Rehabilitation Notes" icon={<ClipboardEdit size={18} className="mr-2 text-purple-400" />} count={rehabNotes.length}
                actionButton={permissions.canAddEditRehabNote && <button onClick={() => openModal('rehabNote')} className="text-sm flex items-center gap-1 text-sky-500 hover:underline"><PlusCircle size={14}/>Add Note</button>}>
                {rehabNotes.map((n: RehabilitationNote) => (
                     <div key={n.id} className="bg-gray-800/50 p-3 rounded-md">
                         <div className="flex justify-between items-center"><p className="font-semibold text-white">Note by {n.authorName}</p><EditButton onClick={() => openModal('rehabNote', n)} /></div>
                         <p className="text-sm text-gray-300 mt-1">{n.content}</p>
                     </div>
                ))}
            </MedicalSection>
             <MedicalSection title="Prescriptions" icon={<Pill size={18} className="mr-2 text-red-400" />} count={prescriptions.length}
                actionButton={permissions.canAddEditPrescription && <button onClick={() => openModal('prescription')} className="text-sm flex items-center gap-1 text-sky-500 hover:underline"><PlusCircle size={14}/>Add Rx</button>}>
                 {prescriptions.map((p: Prescription) => (
                    <div key={p.id} className="bg-gray-800/50 p-3 rounded-md">
                        <div className="flex justify-between items-center"><p className="font-semibold text-white">{p.medication} - {p.dosage}</p><EditButton onClick={() => openModal('prescription', p)} /></div>
                        <p className="text-sm text-gray-300 mt-1">Instructions: {p.instructions}</p>
                    </div>
                 ))}
            </MedicalSection>
        </div>
    )
};

// Sub-component for Financials Tab
const FinancialsView: React.FC<{ patient: Patient; bills: Bill[]; payments: Payment[] }> = ({ patient, bills, payments }) => {
    // ... (Financials logic unchanged) ...
    const getStatusBadge = (status: Bill['status']) => {
        switch (status) {
            case 'Paid':
                return <span className="status-badge status-paid">Paid</span>;
            case 'Partially Paid':
                return <span className="status-badge status-partial">Partially Paid</span>;
            case 'Unpaid':
                return <span className="status-badge status-unpaid">On Credit</span>;
            default:
                return null;
        }
    }

    return (
    <div className="space-y-8">
        {/* Financial Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-800 p-4 rounded-lg text-center flex flex-col justify-center items-center">
                <p className="text-sm text-gray-400">Total Bill</p>
                <p className="text-3xl font-bold text-sky-400 mt-1">${patient.financials.totalBill.toFixed(2)}</p>
            </div>
            <div className="bg-gray-800 p-4 rounded-lg text-center flex flex-col justify-center items-center">
                <p className="text-sm text-gray-400">Amount Paid</p>
                <p className="text-3xl font-bold text-green-400 mt-1">${patient.financials.amountPaid.toFixed(2)}</p>
            </div>
            <div className="bg-gray-800 p-4 rounded-lg text-center flex flex-col justify-center items-center">
                <p className="text-sm text-gray-400">Balance Due</p>
                <p className={`text-3xl font-bold mt-1 ${patient.financials.balance > 0 ? 'text-orange-400' : 'text-green-400'}`}>
                    ${patient.financials.balance.toFixed(2)}
                </p>
            </div>
        </div>

        {/* Billing History */}
        <div>
            <h3 className="text-lg font-semibold text-white mb-3 flex items-center"><FileClock size={18} className="mr-2 text-sky-400" /> Billing History</h3>
            <div className="bg-[#161B22] border border-gray-700 rounded-lg p-4 max-h-80 overflow-y-auto">
                {bills.length > 0 ? (
                    <ul className="space-y-3">
                        {bills.map(bill => (
                            <li key={bill.id} className="bg-gray-800/50 p-3 rounded-md flex justify-between items-center transition-colors hover:bg-gray-800">
                                <div>
                                    <p className="font-semibold text-white">Bill from {new Date(bill.date).toLocaleDateString()}</p>
                                    <p className="text-sm text-gray-400">Total: ${bill.totalBill.toFixed(2)} | Paid: ${bill.amountPaidAtTimeOfBill.toFixed(2)}</p>
                                </div>
                                <div className="flex items-center gap-4">
                                    {getStatusBadge(bill.status)}
                                    <Link to={`/bills/${bill.id}`} className="text-sm font-medium text-sky-500 hover:underline">View Details</Link>
                                </div>
                            </li>
                        ))}
                    </ul>
                ) : <p className="text-gray-500 text-center py-4">No billing history found.</p>}
            </div>
        </div>

        {/* Payment History */}
        <div>
            <h3 className="text-lg font-semibold text-white mb-3 flex items-center"><CreditCard size={18} className="mr-2 text-sky-400" /> Payment History</h3>
            <div className="bg-[#161B22] border border-gray-700 rounded-lg p-4 max-h-80 overflow-y-auto">
                {payments.length > 0 ? (
                    <ul className="space-y-3">
                        {payments.map(payment => (
                            <li key={payment.id} className="bg-gray-800/50 p-3 rounded-md transition-colors hover:bg-gray-800">
                                <div className="flex justify-between items-center">
                                    <p className="font-semibold text-green-400">Payment of ${payment.amount.toFixed(2)}</p>
                                    <span className="text-xs px-2 py-1 bg-gray-700 rounded-full">{payment.paymentMethod}</span>
                                </div>
                                <p className="text-sm text-gray-400 mt-1">{new Date(payment.date).toLocaleString()} by {payment.processedByName}</p>
                            </li>
                        ))}
                    </ul>
                ) : <p className="text-gray-500 text-center py-4">No payment history found.</p>}
            </div>
        </div>
    </div>
);
}

export default PatientProfile;
