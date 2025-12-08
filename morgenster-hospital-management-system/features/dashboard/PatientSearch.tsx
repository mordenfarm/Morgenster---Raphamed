import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../../services/firebase';
import { Patient } from '../../types';
import { Search, X } from 'lucide-react';
import firebase from 'firebase/compat/app';

const PatientSearch: React.FC = () => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<Patient[]>([]);
    const [loading, setLoading] = useState(false);
    const [isFocused, setIsFocused] = useState(false);
    const navigate = useNavigate();
    const searchContainerRef = useRef<HTMLDivElement>(null);

    const handleSearch = useCallback(async (searchQuery: string) => {
        if (searchQuery.trim().length < 2) {
            setResults([]);
            return;
        }
        setLoading(true);

        try {
            const capitalizedQuery = searchQuery.charAt(0).toUpperCase() + searchQuery.slice(1);
            
            // Queries
            const nameQuery = db.collection('patients').where('name', '>=', capitalizedQuery).where('name', '<=', capitalizedQuery + '\uf8ff').limit(3);
            const surnameQuery = db.collection('patients').where('surname', '>=', capitalizedQuery).where('surname', '<=', capitalizedQuery + '\uf8ff').limit(3);
            const hospitalNumberQuery = db.collection('patients').where('hospitalNumber', '>=', searchQuery.toUpperCase()).where('hospitalNumber', '<=', searchQuery.toUpperCase() + '\uf8ff').limit(3);
            
            const [nameSnap, surnameSnap, hospitalNumSnap] = await Promise.all([
                nameQuery.get(),
                surnameQuery.get(),
                hospitalNumberQuery.get()
            ]);

            const resultsMap = new Map<string, Patient>();
            const processSnap = (snap: firebase.firestore.QuerySnapshot) => {
                snap.docs.forEach(doc => resultsMap.set(doc.id, { id: doc.id, ...doc.data() } as Patient));
            };

            processSnap(nameSnap);
            processSnap(surnameSnap);
            processSnap(hospitalNumSnap);

            setResults(Array.from(resultsMap.values()));

        } catch (error) {
            console.error("Error searching for patients:", error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        const handler = (event: MouseEvent) => {
            if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
                setIsFocused(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const handleSelectPatient = (patientId: string) => {
        setQuery('');
        setResults([]);
        setIsFocused(false);
        navigate(`/patients/${patientId}`);
    };

    return (
        <div className="relative w-full max-w-xl" ref={searchContainerRef}>
            <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input
                    type="text"
                    value={query}
                    onChange={(e) => {
                        setQuery(e.target.value);
                        handleSearch(e.target.value);
                    }}
                    onFocus={() => setIsFocused(true)}
                    placeholder="Search patient by Name or Hospital ID..."
                    className="modern-input pl-10 pr-10 py-3 w-full"
                />
                {query && (
                    <button 
                        onClick={() => { setQuery(''); setResults([]); }} 
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-white"
                    >
                        <X size={18} />
                    </button>
                )}
            </div>
            
            {isFocused && (query.length > 0) && (
                <div className="absolute z-50 w-full mt-2 bg-[#161B22] border border-gray-700 rounded-lg shadow-xl overflow-hidden animate-slide-in-top">
                    {loading ? (
                        <div className="p-4 text-center text-gray-400 text-sm">Searching...</div>
                    ) : results.length > 0 ? (
                        <ul className="divide-y divide-gray-700">
                            {results.map(patient => (
                                <li 
                                    key={patient.id} 
                                    onClick={() => handleSelectPatient(patient.id!)} 
                                    className="p-3 hover:bg-gray-800 cursor-pointer transition-colors"
                                >
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <p className="font-semibold text-white text-sm">{patient.name} {patient.surname}</p>
                                            <p className="text-xs text-gray-400 font-mono">{patient.hospitalNumber}</p>
                                        </div>
                                        <span className={`text-[10px] px-2 py-0.5 rounded-full border ${
                                            patient.status === 'Admitted' ? 'bg-blue-900/30 border-blue-800 text-blue-300' :
                                            patient.status === 'PendingDischarge' ? 'bg-yellow-900/30 border-yellow-800 text-yellow-300' :
                                            'bg-gray-700/50 border-gray-600 text-gray-400'
                                        }`}>
                                            {patient.status}
                                        </span>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    ) : query.length > 1 ? (
                        <div className="p-4 text-center text-gray-500 text-sm">No patients found.</div>
                    ) : null}
                </div>
            )}
        </div>
    );
};

export default PatientSearch;