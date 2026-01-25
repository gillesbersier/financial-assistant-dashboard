'use client';

import { useState, useRef } from 'react';
import { UploadCloud, FileText, X, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import styles from './ReceiptUpload.module.css';

export default function ReceiptUpload() {
    const [file, setFile] = useState<File | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [statusMessage, setStatusMessage] = useState('');
    const [docType, setDocType] = useState<'invoice' | 'receipt'>('receipt');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            setFile(e.dataTransfer.files[0]);
            setStatus('idle');
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
            setStatus('idle');
        }
    };

    const handleClick = () => {
        fileInputRef.current?.click();
    };

    const removeFile = (e: React.MouseEvent) => {
        e.stopPropagation();
        setFile(null);
        setStatus('idle');
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleSubmit = async () => {
        if (!file) return;

        setIsUploading(true);
        setStatus('idle');

        const formData = new FormData();
        // N8N Form trigger might expect specific field names or just any file
        // Append 'type' FIRST so streaming parsers read it before the heavy binary 'data'
        formData.append('type', docType);
        formData.append('data', file);

        try {
            // We proxy through our own API to avoid CORS issues
            // We also pass type in query params as a fallback redundancy
            const response = await fetch(`/api/upload-receipt?type=${docType}`, {
                method: 'POST',
                body: formData,
            });

            if (response.ok) {
                setStatus('success');
                setStatusMessage('Receipt uploaded successfully!');
                setFile(null);
                if (fileInputRef.current) fileInputRef.current.value = '';
            } else {
                const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
                throw new Error(errorData.error || `Upload failed with status ${response.status}`);
            }
        } catch (error) {
            console.error('Upload Error:', error);
            setStatus('error');
            setStatusMessage(error instanceof Error ? error.message : 'Failed to upload receipt.');
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className={`card ${styles.panel}`}>
            <div className={styles.header}>
                <h3 className={styles.title}>Uploading Documents</h3>
            </div>

            <div className={styles.typeSelector}>
                <label className={styles.checkboxLabel}>
                    <input
                        type="checkbox"
                        className={styles.checkboxInput}
                        checked={docType === 'invoice'}
                        onChange={() => setDocType('invoice')}
                    />
                    Invoice
                </label>
                <label className={styles.checkboxLabel}>
                    <input
                        type="checkbox"
                        className={styles.checkboxInput}
                        checked={docType === 'receipt'}
                        onChange={() => setDocType('receipt')}
                    />
                    Receipt
                </label>
            </div>

            {!file ? (
                <div
                    className={`${styles.uploadArea} ${isDragging ? styles.active : ''}`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={handleClick}
                >
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileSelect}
                        style={{ display: 'none' }}
                        accept="image/*,.pdf"
                    />
                    <UploadCloud size={48} className={styles.icon} />
                    <span className={styles.uploadText}>Click or drag receipt here</span>
                    <span className={styles.uploadSubtext}>Supports PDF, JPG, PNG</span>
                </div>
            ) : (
                <div className={styles.filePreview}>
                    <div className={styles.fileInfo}>
                        <FileText size={24} className={styles.textPrimary} />
                        <div>
                            <div className={styles.fileName}>{file.name}</div>
                            <div className={styles.fileSize}>{(file.size / 1024 / 1024).toFixed(2)} MB</div>
                        </div>
                    </div>
                    <button onClick={removeFile} className={styles.removeBtn} aria-label="Remove file">
                        <X size={18} />
                    </button>
                </div>
            )}

            {file && (
                <button
                    className={styles.submitBtn}
                    onClick={handleSubmit}
                    disabled={isUploading}
                >
                    {isUploading ? (
                        <>
                            <Loader2 size={18} className={styles.spin} />
                            Uploading...
                        </>
                    ) : (
                        <>Submit Receipt</>
                    )}
                </button>
            )}

            {status === 'success' && (
                <div className={`${styles.status} ${styles.statusSuccess}`}>
                    <CheckCircle size={18} />
                    {statusMessage}
                </div>
            )}

            {status === 'error' && (
                <div className={`${styles.status} ${styles.statusError}`}>
                    <AlertCircle size={18} />
                    {statusMessage}
                </div>
            )}
        </div>
    );
}
