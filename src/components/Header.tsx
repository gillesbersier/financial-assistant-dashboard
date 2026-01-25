import styles from './Header.module.css';
import { ShieldCheck, Bell, User } from 'lucide-react';

export default function Header() {
    return (
        <header className={styles.header}>
            <div className={styles.logoSection}>
                <div className={styles.logoIcon}>
                    <ShieldCheck size={24} color="var(--primary)" />
                </div>
                <h1 className={styles.title}>Financial Assistant</h1>
                <span className={styles.proBadge}>PRO</span>
            </div>

            <div className={styles.actions}>
                <div className={`${styles.statusBadge} tooltip`} data-tip="System Operational">
                    <span className={styles.statusDot}></span>
                    <span className={styles.statusText}>N8N Pipeline Active</span>
                </div>

                <button className={styles.iconBtn}>
                    <Bell size={20} className="text-secondary" />
                </button>

                <div className={styles.avatar}>
                    <User size={20} color="white" />
                </div>
            </div>
        </header>
    );
}
