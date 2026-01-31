'use client';

import { useState, useRef, Fragment } from 'react';
import { UploadCloud, FileText, X, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import styles from './ReceiptUpload.module.css';


interface ReceiptUploadProps {
    onUploadSuccess?: () => void;
}

export default function ReceiptUpload({ onUploadSuccess }: ReceiptUploadProps) {
    const [file, setFile] = useState<File | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [statusMessage, setStatusMessage] = useState('');
    const [docType, setDocType] = useState<'invoice' | 'receipt'>('receipt');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [extractedData, extractedDataSet] = useState<any>(null);
    const setExtractedData = (data: any) => extractedDataSet(data);
    const [isFlipped, setIsFlipped] = useState(false);
    const [isEditing, setIsEditing] = useState(false);

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
            setExtractedData(null);
            setIsFlipped(false);
            setIsEditing(false);
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
            setStatus('idle');
            setExtractedData(null);
            setIsFlipped(false);
            setIsEditing(false);
        }
    };

    const handleClick = () => {
        fileInputRef.current?.click();
    };

    const removeFile = (e: React.MouseEvent) => {
        e.stopPropagation();
        setFile(null);
        setStatus('idle');
        setExtractedData(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleSubmit = async () => {
        // If already success (meaning data extracted), flip to show details
        if (status === 'success') {
            setIsFlipped(true);
            return;
        }

        if (!file) return;

        setIsUploading(true);
        setStatus('idle');
        setExtractedData(null);

        const formData = new FormData();
        formData.append('type', docType);
        formData.append('data', file);

        try {
            const response = await fetch(`/api/upload-receipt?type=${docType}`, {
                method: 'POST',
                body: formData,
            });

            if (response.ok) {
                const rawData = await response.json().catch(() => ({}));

                // Normalize data extraction from N8N response
                // N8N often returns an array of items: [{ output: { ... } }] 
                // or sometimes just the object: { output: { ... } }
                const firstItem = Array.isArray(rawData) ? rawData[0] : rawData;
                const data = firstItem?.output || firstItem || {};

                // Normalize keys to our internal format
                const normalizedData = {
                    merchant: data.Provider || data.merchant || data.vendor,
                    date: data.date || data.Date,
                    amount: data.GrossAmount || data.amount || data.total,
                    currency: data.Currency || data.currency,
                    description: data.Description || data.description,
                    // Keep original raw data for other fields if needed
                    ...data
                };

                setExtractedData(normalizedData);
                setStatus('success');
                setStatusMessage('Receipt scanned successfully');
            } else {
                const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
                throw new Error(errorData.error || `Upload failed with status ${response.status}`);
            }
        } catch (error) {
            console.error('Upload Error:', error);
            setStatus('error');
            setStatusMessage(error instanceof Error ? error.message : 'Failed to scan receipt.');
        } finally {
            setIsUploading(false);
        }
    };

    const handleValidate = async () => {
        setIsUploading(true);
        try {
            const response = await fetch('/api/save-invoice', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(extractedData)
            });

            if (response.ok) {
                setStatus('idle'); // Reset to initial state or show a 'Saved' state
                setStatusMessage('Saved successfully!');

                // Trigger refresh of parent data
                if (onUploadSuccess) {
                    onUploadSuccess();
                }

                handleReset(); // Clear form and go back to start
            } else {
                throw new Error('Failed to save data');
            }
        } catch (error) {
            console.error('Validation Error:', error);
            alert('Failed to save data. Please try again.');
        } finally {
            setIsUploading(false);
        }
    }

    const handleReset = () => {
        setIsFlipped(false);
        // Wait for flip to finish before clearing
        setTimeout(() => {
            setFile(null);
            setStatus('idle');
            setExtractedData(null);
            setIsEditing(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }, 500);
    };

    return (
        <div className={styles.panel}>
            <div className={`${styles.flipper} ${isFlipped ? styles.flipped : ''}`}>
                {/* FRONT SIDE */}
                <div className={styles.front}>
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
                            {status !== 'success' && (
                                <button onClick={removeFile} className={styles.removeBtn} aria-label="Remove file">
                                    <X size={18} />
                                </button>
                            )}
                        </div>
                    )}

                    {file && (
                        <button
                            className={`${styles.submitBtn} ${status === 'success' ? styles.statusSuccess : ''}`}
                            onClick={handleSubmit}
                            disabled={isUploading}
                            style={status === 'success' ? { background: 'var(--success-bg)', color: 'var(--success)' } : {}}
                        >
                            {isUploading ? (
                                <>
                                    <Loader2 size={18} className={styles.spin} />
                                    Uploading...
                                </>
                            ) : status === 'success' ? (
                                <>
                                    <CheckCircle size={18} />
                                    {statusMessage}
                                </>
                            ) : (
                                <>Submit Receipt</>
                            )}
                        </button>
                    )}

                    {status === 'error' && (
                        <div className={`${styles.status} ${styles.statusError}`}>
                            <AlertCircle size={18} />
                            {statusMessage}
                        </div>
                    )}
                </div>

                {/* BACK SIDE */}
                <div className={styles.back}>
                    <div className={styles.header}>
                        <h3 className={styles.title}>Extracted Details</h3>
                        <div style={{ padding: '4px 8px', background: 'var(--bg-subtle)', borderRadius: '4px', fontSize: '11px', color: 'var(--text-secondary)' }}>
                            Saved to Sheets
                        </div>
                    </div>

                    <div style={{ flex: 1, overflowY: 'auto' }}>
                        {extractedData ? (
                            <form className={styles.dataGrid}>
                                {[
                                    { key: 'merchant', label: 'Merchant' },
                                    { key: 'date', label: 'Date' },
                                    { key: 'amount', label: 'Amount' },
                                    { key: 'currency', label: 'Currency' },
                                    { key: 'description', label: 'Description' }
                                ].map(({ key, label }) => {
                                    const val = extractedData[key] || '';
                                    return (
                                        <Fragment key={key}>
                                            <div className={styles.label}>{label}</div>
                                            {isEditing ? (
                                                <input
                                                    className={styles.editInput}
                                                    value={val}
                                                    onChange={(e) => {
                                                        setExtractedData({
                                                            ...extractedData,
                                                            [key]: e.target.value
                                                        });
                                                    }}
                                                    style={key === 'description' ? { width: '100%' } : {}}
                                                />
                                            ) : (
                                                <div
                                                    className={styles.value}
                                                    style={key === 'description' ? {
                                                        whiteSpace: 'normal',
                                                        textAlign: 'right',
                                                        maxWidth: '200px',
                                                        marginLeft: 'auto',
                                                        display: '-webkit-box',
                                                        WebkitLineClamp: 2,
                                                        WebkitBoxOrient: 'vertical',
                                                        overflow: 'hidden',
                                                        textOverflow: 'ellipsis'
                                                    } : {}}
                                                    title={key === 'description' ? String(val) : undefined}
                                                >
                                                    {String(val)}
                                                </div>
                                            )}
                                        </Fragment>
                                    );
                                })}
                            </form>
                        ) : (
                            <div className={styles.stateContainer} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-tertiary)' }}>
                                <FileText size={48} style={{ opacity: 0.2, marginBottom: '16px' }} />
                                <p>Processing complete.</p>
                            </div>
                        )}
                    </div>

                    <div style={{ display: 'flex', gap: '12px', marginTop: 'auto' }}>
                        <button
                            className={styles.submitBtn}
                            onClick={handleValidate}
                            disabled={isUploading}
                            style={{
                                flex: 1,
                                background: 'var(--primary)',
                                color: 'white'
                            }}
                        >
                            {isUploading ? <Loader2 size={16} className={styles.spin} /> : 'Validate'}
                        </button>
                        <button
                            className={styles.submitBtn}
                            onClick={(e) => {
                                e.preventDefault();
                                setIsEditing(!isEditing);
                            }}
                            disabled={isUploading}
                            style={{
                                flex: 1,
                                background: isEditing ? 'var(--neutral-100)' : 'transparent',
                                border: '1px solid var(--neutral-300)',
                                color: 'var(--text-secondary)'
                            }}
                        >
                            {isEditing ? 'Done' : 'Edit'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
