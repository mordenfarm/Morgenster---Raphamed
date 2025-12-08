import React, { useEffect, useState } from 'react';
import { db } from '../../services/firebase';
import { Bill, Payment, Patient } from '../../types';

interface FinancialStats {
    monthlySales: number;
    monthlyPaid: number;
    totalUnpaid: number;
}

const FinancialOverview: React.FC = () => {
    const [stats, setStats] = useState<FinancialStats>({ monthlySales: 0, monthlyPaid: 0, totalUnpaid: 0 });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            setLoading(true);
            try {
                const now = new Date();
                const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
                const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999).toISOString();

                // 1. Total Monthly Sales
                const billsSnapshot = await db.collection('bills')
                    .where('date', '>=', startOfMonth)
                    .where('date', '<=', endOfMonth)
                    .get();
                const monthlySales = billsSnapshot.docs.reduce((sum, doc) => sum + (doc.data() as Bill).totalBill, 0);

                // 2. Total Paid This Month
                const paymentsSnapshot = await db.collection('payments')
                    .where('date', '>=', startOfMonth)
                    .where('date', '<=', endOfMonth)
                    .get();
                const monthlyPaid = paymentsSnapshot.docs.reduce((sum, doc) => sum + (doc.data() as Payment).amount, 0);

                // 3. Total Unpaid (Total Balance from all patients)
                const patientsSnapshot = await db.collection('patients').get();
                const totalUnpaid = patientsSnapshot.docs.reduce((sum, doc) => sum + (doc.data() as Patient).financials.balance, 0);

                setStats({ monthlySales, monthlyPaid, totalUnpaid });
            } catch (error) {
                console.error("Error fetching financial overview:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, []);

    if (loading) {
        return (
             <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <div className="bg-gray-800 p-4 rounded-lg animate-pulse h-24"></div>
                <div className="bg-gray-800 p-4 rounded-lg animate-pulse h-24"></div>
                <div className="bg-gray-800 p-4 rounded-lg animate-pulse h-24"></div>
            </div>
        );
    }
    
    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="bg-gray-800 p-4 rounded-lg">
                <h3 className="text-gray-400">Total Monthly Sales</h3>
                <p className="text-2xl font-bold text-sky-400">${stats.monthlySales.toFixed(2)}</p>
            </div>
            <div className="bg-gray-800 p-4 rounded-lg">
                <h3 className="text-gray-400">Total Paid This Month</h3>
                <p className="text-2xl font-bold text-green-400">${stats.monthlyPaid.toFixed(2)}</p>
            </div>
            <div className="bg-gray-800 p-4 rounded-lg">
                <h3 className="text-gray-400">Total Outstanding Balance</h3>
                <p className="text-2xl font-bold text-red-400">${stats.totalUnpaid.toFixed(2)}</p>
            </div>
        </div>
    );
};

export default FinancialOverview;
