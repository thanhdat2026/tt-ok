import React, { useState, useEffect, useRef } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { TuitionFeeNotice } from './TuitionFeeNotice';
import { Invoice } from '../../types';
import { ICONS } from '../../constants';

// Declare global variables from CDN scripts
declare var JSZip: any;
declare var saveAs: any;


interface BulkInvoiceExportModalProps {
    isOpen: boolean;
    onClose: () => void;
    invoices: Invoice[];
}

export const BulkInvoiceExportModal: React.FC<BulkInvoiceExportModalProps> = ({ isOpen, onClose, invoices }) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isExporting, setIsExporting] = useState(false);
    const noticeRef = useRef<HTMLDivElement>(null);
    const zipRef = useRef<any>(null);

    // Start export when modal opens
    useEffect(() => {
        if (isOpen && invoices.length > 0) {
            setCurrentIndex(0);
            setIsExporting(true);
            if (typeof JSZip !== 'undefined') {
                zipRef.current = new JSZip();
            } else {
                console.error("JSZip library is not loaded.");
                setIsExporting(false); 
                onClose(); // Close if lib is missing
            }
        } else if (!isOpen) {
            // Reset state on close
            setIsExporting(false);
            setCurrentIndex(0);
            zipRef.current = null;
        }
    }, [isOpen, invoices, onClose]);

    // Process one item from the queue
    useEffect(() => {
        if (!isExporting || !isOpen) return;

        const processQueue = async () => {
            if (currentIndex >= invoices.length) {
                // Finished processing all items, now generate and download zip
                if (zipRef.current) {
                    try {
                        const zipBlob = await zipRef.current.generateAsync({ type: "blob", compression: "DEFLATE" });
                        if (typeof saveAs !== 'undefined') {
                            saveAs(zipBlob, `Hoa_Don_Hoc_Phi_${new Date().toISOString().split('T')[0]}.zip`);
                        } else {
                            console.error("FileSaver library is not loaded.");
                        }
                    } catch (err) {
                        console.error("Error generating zip file:", err);
                    } finally {
                        setIsExporting(false); // End of process
                    }
                }
                return;
            }

            // Process current item
            // Wait for the component to render with the new invoice data
            await new Promise(resolve => setTimeout(resolve, 150));

            if (!noticeRef.current || !window.html2canvas) {
                console.error("Ref or html2canvas not available.");
                setCurrentIndex(prev => prev + 1); // Skip to next
                return;
            }

            try {
                const invoice = invoices[currentIndex];
                const canvas = await window.html2canvas(noticeRef.current, { scale: 2, useCORS: true });
                
                canvas.toBlob((blob: Blob | null) => {
                    if (blob && zipRef.current) {
                        const filename = `PhieuHocPhi_${invoice.studentId}_${invoice.month}.png`;
                        zipRef.current.file(filename, blob);
                    }
                    // Move to the next item in the queue regardless of blob success
                    setCurrentIndex(prev => prev + 1);
                }, 'image/png');
                
            } catch (error) {
                console.error("Error exporting invoice:", error);
                 // Move to the next item even if there's an error
                setCurrentIndex(prev => prev + 1);
            }
        };

        processQueue();
    }, [isExporting, currentIndex, invoices, isOpen]);

    const currentInvoiceForRender = invoices[currentIndex];

    return (
        <>
            {/* Hidden render target for html2canvas */}
            <div style={{ position: 'absolute', left: '-9999px', top: 0 }}>
                {isExporting && currentInvoiceForRender && <TuitionFeeNotice ref={noticeRef} invoice={currentInvoiceForRender} />}
            </div>

            <Modal isOpen={isOpen} onClose={isExporting ? () => {} : onClose} title="Xuất Hàng loạt Hóa đơn">
                <div className="text-center p-8">
                    {isExporting ? (
                        <>
                            <div className="flex justify-center items-center mb-4">
                                {ICONS.loading}
                            </div>
                            <h3 className="text-lg font-semibold">Đang nén các hóa đơn...</h3>
                            <p className="text-gray-500">
                                Đã xử lý {currentIndex} / {invoices.length} hóa đơn.
                            </p>
                            <p className="text-sm mt-2 text-gray-400">Vui lòng không đóng cửa sổ này. Quá trình tải về sẽ bắt đầu khi hoàn tất.</p>
                        </>
                    ) : (
                        <>
                             <div className="flex justify-center items-center mb-4 text-green-500">
                                {React.cloneElement(ICONS.checkCircle, {width: 48, height: 48})}
                            </div>
                            <h3 className="text-lg font-semibold">Hoàn tất!</h3>
                            <p className="text-gray-500">
                                Đã nén thành công {invoices.length} hóa đơn. Quá trình tải xuống đã bắt đầu.
                            </p>
                            <Button onClick={onClose} className="mt-6">Đóng</Button>
                        </>
                    )}
                </div>
            </Modal>
        </>
    );
};