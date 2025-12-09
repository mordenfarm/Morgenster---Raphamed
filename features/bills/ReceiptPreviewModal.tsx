import React, { useEffect, useState, useRef } from 'react';
import { Bill } from '../../types';

interface ReceiptPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  bill: Bill | null;
}

const ReceiptPreviewModal: React.FC<ReceiptPreviewModalProps> = ({ isOpen, onClose, bill }) => {
    const [status, setStatus] = useState<'previewing' | 'printing'>('previewing');
    const modalRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isOpen) {
            // Give a moment for the modal to render, then start printing process
            const printTimeout = setTimeout(() => {
                setStatus('printing');
                window.print();
                
                // Simulate print job completion and close
                const closeTimeout = setTimeout(() => {
                    onClose();
                }, 2000); // Auto-close after 2 seconds

                return () => clearTimeout(closeTimeout);

            }, 500);

            return () => clearTimeout(printTimeout);
        } else {
             // Reset status when modal is closed
            setStatus('previewing');
        }

    }, [isOpen, onClose]);


    if (!isOpen || !bill) return null;

    return (
        <div className="receipt-modal-backdrop" ref={modalRef}>
            <div className="receipt-modal-content">
                 {status === 'printing' && (
                    <div className="printing-overlay">
                        <div className="printing-indicator">
                            <svg className="animate-spin h-8 w-8 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <p className="text-white text-lg font-semibold mt-4">Printing receipt...</p>
                        </div>
                    </div>
                )}
                <div id="receipt-preview" className="receipt-preview">
                    <header className="receipt-header">
                        <img src="https://i.ibb.co/995FCHPR/raphamed.png" alt="Logo" className="receipt-logo" />
                        <p>RAPHAMED SURGERY</p>
                        <p>Morgenster Mission, Masvingo</p>
                        <p>Tel: +263 XX XXX XXXX</p>
                    </header>
                    <section className="receipt-info">
                        <p><strong>Receipt No:</strong> {bill.id}</p>
                        <p><strong>Date:</strong> {new Date(bill.date).toLocaleString()}</p>
                        <p><strong>Patient:</strong> {bill.patientName}</p>
                        <p><strong>Hosp. No:</strong> {bill.patientHospitalNumber}</p>
                    </section>
                    <table className="receipt-items">
                        <thead>
                            <tr>
                                <th>Item</th>
                                <th>Qty</th>
                                <th>Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            {bill.items.map((item, index) => (
                                <tr key={index}>
                                    <td>{item.description}</td>
                                    <td>{item.quantity}</td>
                                    <td>${item.totalPrice.toFixed(2)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                     <section className="receipt-totals">
                        <div>
                            <span>Subtotal</span>
                            <span>${bill.totalBill.toFixed(2)}</span>
                        </div>
                        <div>
                            <span>Paid</span>
                            <span>${bill.amountPaidAtTimeOfBill.toFixed(2)}</span>
                        </div>
                        <div className="grand-total">
                            <span>Balance Due</span>
                            <span>${bill.balance.toFixed(2)}</span>
                        </div>
                    </section>
                    <footer className="receipt-footer">
                        <p>Thank you!</p>
                        <p>Payments to Accounts Office</p>
                    </footer>
                </div>
            </div>
        </div>
    );
};

export default ReceiptPreviewModal;
