import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import Modal from '../../components/utils/Modal';
import LoadingSpinner from '../../components/utils/LoadingSpinner';
import { db } from '../../services/firebase';
import firebase from 'firebase/compat/app';
import { UserProfile, UserActivity, Patient, Bill, Payment } from '../../types';
import { DollarSign, FileText, UserPlus } from 'lucide-react';

interface UserActivityModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile;
}

const UserActivityModal: React.FC<UserActivityModalProps> = ({ isOpen, onClose, user }) => {
    const [activities, setActivities] = useState<UserActivity[]>([]);
    const [loading, setLoading] = useState(false);
    const [filter, setFilter] = useState<'day' | 'week' | 'month' | 'custom'>('week');
    const [customStart, setCustomStart] = useState('');
    const [customEnd, setCustomEnd] = useState('');

    const dateRange = useMemo(() => {
        // FIX: Changed 'end' from const to let to allow reassignment in the 'custom' case.
        let end = new Date();
        end.setHours(23, 59, 59, 999);
        let start = new Date();
        start.setHours(0, 0, 0, 0);

        switch (filter) {
            case 'day':
                break;
            case 'week':
                start.setDate(start.getDate() - start.getDay());
                break;
            case 'month':
                start = new Date(start.getFullYear(), start.getMonth(), 1);
                break;
            case 'custom':
                if (!customStart || !customEnd) return null;
                start = new Date(customStart);
                end = new Date(customEnd);
                end.setHours(23, 59, 59, 999);
                break;
            default:
                return null;
        }
        return { start, end };
    }, [filter, customStart, customEnd]);

    useEffect(() => {
        if (!isOpen || !user) {
            setActivities([]);
            return;
        }

        const fetchActivities = async () => {
            setLoading(true);
            const allActivities: UserActivity[] = [];

            try {
                // Fetch all activities for the user, regardless of date range
                const billsPromise = db.collection('bills').where('processedBy', '==', user.id).get();
                const paymentsPromise = db.collection('payments').where('processedBy', '==', user.id).get();
                const registrationsPromise = db.collection('patients').where('registeredBy', '==', user.id).get();

                const [billsSnap, paymentsSnap, regSnap] = await Promise.all([billsPromise, paymentsPromise, registrationsPromise]);

                billsSnap.forEach(doc => {
                    const bill = { id: doc.id, ...doc.data() } as Bill;
                    allActivities.push({
                        id: `bill-${bill.id}`,
                        originalId: bill.id!,
                        type: 'Billing',
                        date: new Date(bill.date),
                        patientId: bill.patientId,
                        patientName: bill.patientName,
                        details: `Processed bill of $${bill.totalBill.toFixed(2)}`,
                        link: `/bills/${bill.id}`,
                    });
                });

                regSnap.forEach(doc => {
                    const patient = { id: doc.id, ...doc.data() } as Patient;
                    allActivities.push({
                        id: `reg-${patient.id}`,
                        originalId: patient.id!,
                        type: 'Registration',
                        date: new Date(patient.registrationDate),
                        patientId: patient.id!,
                        patientName: `${patient.name} ${patient.surname}`,
                        details: 'Registered a new patient',
                        link: `/patients/${patient.id}`,
                    });
                });

                const paymentActivities = paymentsSnap.docs.map(doc => {
                    const payment = { id: doc.id, ...doc.data() } as Payment;
                    return {
                        id: `payment-${payment.id}`,
                        originalId: payment.id!,
                        type: 'Payment' as const,
                        date: new Date(payment.date),
                        patientId: payment.patientId,
                        patientName: 'Loading...', // Placeholder
                        details: `Recorded a payment of $${payment.amount.toFixed(2)}`,
                        link: `/patients/${payment.patientId}`,
                    };
                });
                
                const patientIdsForPayments = [...new Set(paymentActivities.map(p => p.patientId))];
                if (patientIdsForPayments.length > 0) {
                     const patientsSnapshot = await db.collection('patients').where(firebase.firestore.FieldPath.documentId(), 'in', patientIdsForPayments).get();
                     const patientNameMap = new Map<string, string>();
                     patientsSnapshot.forEach(doc => {
                         const p = doc.data() as Patient;
                         patientNameMap.set(doc.id, `${p.name} ${p.surname}`);
                     });
                     paymentActivities.forEach(act => {
                         act.patientName = patientNameMap.get(act.patientId) || 'Unknown Patient';
                     });
                }
                allActivities.push(...paymentActivities);
                
                // Filter by date range on the client-side
                if (dateRange) {
                    const filtered = allActivities.filter(activity => {
                        const activityDate = activity.date;
                        return activityDate >= dateRange.start && activityDate <= dateRange.end;
                    });
                    filtered.sort((a, b) => b.date.getTime() - a.date.getTime());
                    setActivities(filtered);
                } else {
                    setActivities([]);
                }
                

            } catch (error) {
                console.error("Error fetching user activity:", error);
            } finally {
                setLoading(false);
            }
        };
        
        if (dateRange) {
            fetchActivities();
        } else {
            setActivities([]);
        }

    }, [isOpen, user, dateRange]);

    const ActivityIcon: React.FC<{ type: UserActivity['type'] }> = ({ type }) => {
        const iconProps = { size: 16, className: "text-white" };
        const baseClass = "activity-icon";
        switch (type) {
            case 'Registration': return <div className={`${baseClass} bg-purple-600`}><UserPlus {...iconProps} /></div>;
            case 'Billing': return <div className={`${baseClass} bg-blue-600`}><FileText {...iconProps} /></div>;
            case 'Payment': return <div className={`${baseClass} bg-green-600`}><DollarSign {...iconProps} /></div>;
            default: return null;
        }
    };

    const FilterButton: React.FC<{ value: typeof filter, children: React.ReactNode }> = ({ value, children }) => (
        <button onClick={() => setFilter(value)} className={`activity-filter-buttons button ${filter === value ? 'active' : ''}`}>{children}</button>
    );

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Activity Log: ${user.name} ${user.surname}`} size="lg">
            <div className="activity-filter-buttons">
                <button onClick={() => setFilter('day')} className={filter === 'day' ? 'active' : ''}>Today</button>
                <button onClick={() => setFilter('week')} className={filter === 'week' ? 'active' : ''}>This Week</button>
                <button onClick={() => setFilter('month')} className={filter === 'month' ? 'active' : ''}>This Month</button>
                <button onClick={() => setFilter('custom')} className={filter === 'custom' ? 'active' : ''}>Custom</button>
            </div>

            {filter === 'custom' && (
                <div className="flex flex-col sm:flex-row gap-4 mb-4">
                    <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} className="w-full modern-input" />
                    <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} className="w-full modern-input" />
                </div>
            )}

            <div className="activity-timeline">
                {loading ? <LoadingSpinner /> : (
                    activities.length > 0 ? activities.map(activity => (
                        <div key={activity.id} className="activity-item">
                            <ActivityIcon type={activity.type} />
                            <p className="activity-date">{activity.date.toLocaleString()}</p>
                            <p className="activity-details">
                                {activity.details} for patient <Link to={activity.link} onClick={onClose}>{activity.patientName}</Link>.
                            </p>
                        </div>
                    )) : <p className="text-gray-500 text-center py-8">No activity recorded for this period.</p>
                )}
            </div>
        </Modal>
    );
};

export default UserActivityModal;
