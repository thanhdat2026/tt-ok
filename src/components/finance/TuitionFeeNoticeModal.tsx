import React, { useRef, useState } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { TuitionFeeNotice } from './TuitionFeeNotice';
import { Invoice } from '../../types';
import { ICONS } from '../../constants';

declare global {
    interface Window {
        html2canvas: any;
    }
}

interface TuitionFeeNoticeModalProps {
    isOpen: boolean;
    onClose: () => void;
    invoice: Invoice | null;
}

export const TuitionFeeNoticeModal: React.FC<TuitionFeeNoticeModalProps> = ({ isOpen, onClose, invoice }) => {
    const noticeRef = useRef<HTMLDivElement>(null);
    const [isDownloading, setIsDownloading] = useState(false);

    const handleDownloadImage = async () => {
        if (!noticeRef.current || !invoice || !window.html2canvas) {
            console.error("html2canvas is not available or ref is not set.");
            return;
        }

        setIsDownloading(true);
        try {
            const canvas = await window.html2canvas(noticeRef.current, {
                scale: 2, // Higher resolution for better quality
                useCORS: true, // Important if the notice contains images from other origins (like a logo)
            });
            const link = document.createElement('a');
            link.download = `PhieuHocPhi_${invoice.studentId}_${invoice.month}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
        } catch (error) {
            console.error("Lỗi khi xuất ảnh hóa đơn:", error);
        } finally {
            setIsDownloading(false);
        }
    };


    if (!invoice) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Chi tiết Hóa đơn #${invoice.id}`}>
            <TuitionFeeNotice ref={noticeRef} invoice={invoice} />
            <div className="flex justify-end gap-4 mt-6 pt-4 border-t dark:border-gray-700">
                <Button variant="secondary" onClick={onClose}>
                    Đóng
                </Button>
                <Button onClick={handleDownloadImage} isLoading={isDownloading} disabled={isDownloading}>
                    {ICONS.download} Tải ảnh
                </Button>
            </div>
        </Modal>
    );
};