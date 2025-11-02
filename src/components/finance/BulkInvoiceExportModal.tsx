import React, { useState, useEffect, useRef } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { TuitionFeeNotice } from './TuitionFeeNotice';
import { Invoice } from '../../types';
import { ICONS } from '../../constants';

interface BulkInvoiceExportModalProps {
    isOpen: boolean;
    onClose: () => void;
    invoices: Invoice[];
}

export const BulkInvoiceExportModal: React.FC<BulkInvoiceExportModalProps> = ({ isOpen, onClose, invoices }) => {
    const [exportQueue, setExportQueue] = useState<Invoice[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isExporting, setIsExporting] = useState(false);
    const noticeRef = useRef<HTMLDivElement>(null);

    // Start export when modal opens
    useEffect(() => {
        if (isOpen && invoices.length > 0) {
            setExportQueue(invoices);
            setCurrentIndex(0);
            setIsExporting(true);
        } else if (!isOpen) {
            // Reset state on close
            setIsExporting(false);
            setExportQueue([]);
            setCurrentIndex(0);
        }
    }, [isOpen, invoices]);

    // Process one item from the queue
    useEffect(() => {
        if (isExporting && currentIndex < exportQueue.length) {
            const processItem = async () => {
                // Wait for the component to render with the new invoice data
                await new Promise(resolve => setTimeout(resolve, 150));

                if (!noticeRef.current || !window.html2canvas) {
                    console.error("Ref or html2canvas not available.");
                    // Move to next item even if error occurs
                    setCurrentIndex(prev => prev + 1);
                    return;
                }

                try {
                    const invoice = exportQueue[currentIndex];
                    const canvas = await window.html2canvas(noticeRef.current, { scale: 2, useCORS: true });
                    const link = document.createElement('a');
                    link.download = `PhieuHocPhi_${invoice.studentId}_${invoice.month}.png`;
                    link.href = canvas.toDataURL('image/png');
                    link.click();
                } catch (error) {
                    console.error("Error exporting invoice:", error);
                } finally {
                    // Move to the next item in the queue
                    setCurrentIndex(prev => prev + 1);
                }
            };
            processItem();
        } else if (isExporting && currentIndex >= exportQueue.length && exportQueue.length > 0) {
            // Finished
            setIsExporting(false);
        }
    }, [isExporting, currentIndex, exportQueue]);

    const currentInvoice = exportQueue[currentIndex];

    return (
        <>
            {/* Hidden render target for html2canvas */}
            <div style={{ position: 'absolute', left: '-9999px', top: 0 }}>
                {currentInvoice && <TuitionFeeNotice ref={noticeRef} invoice={currentInvoice} />}
            </div>

            <Modal isOpen={isOpen} onClose={isExporting ? () => {} : onClose} title="Xuất Hàng loạt Hóa đơn">
                <div className="text-center p-8">
                    {isExporting ? (
                        <>
                            <div className="flex justify-center items-center mb-4">
                                {ICONS.loading}
                            </div>
                            <h3 className="text-lg font-semibold">Đang xuất hàng loạt...</h3>
                            <p className="text-gray-500">
                                Đã xuất {currentIndex} / {exportQueue.length} hóa đơn.
                            </p>
                            <p className="text-sm mt-2 text-gray-400">Vui lòng không đóng cửa sổ này.</p>
                        </>
                    ) : (
                        <>
                             <div className="flex justify-center items-center mb-4 text-green-500">
                                {React.cloneElement(ICONS.checkCircle, {width: 48, height: 48})}
                            </div>
                            <h3 className="text-lg font-semibold">Hoàn tất!</h3>
                            <p className="text-gray-500">
                                Đã xuất thành công {exportQueue.length} hóa đơn.
                            </p>
                            <Button onClick={onClose} className="mt-6">Đóng</Button>
                        </>
                    )}
                </div>
            </Modal>
        </>
    );
};
