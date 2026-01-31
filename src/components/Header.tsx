import styles from './Header.module.css';
import { ShieldCheck, Bell, User, Search } from 'lucide-react';

export default function Header() {
    return (
        <header className={styles.header}>
            <div className={styles.logoSection}>
                <div className={styles.logoIcon}>
                    <ShieldCheck size={28} color="#ffffff" />
                </div>
                <h1 className={styles.title}>Financial Assistant</h1>
            </div>

            <div className={styles.actions}>
                <div className={styles.searchContainer}>
                    <Search size={16} className={styles.searchIcon} />
                    <input
                        type="text"
                        placeholder="Search..."
                        className={styles.searchInput}
                    />
                </div>

                <button className={styles.iconBtn}>
                    <Bell size={20} color='white' />
                </button>

                <div className={styles.avatar}>
                    <User size={20} color="white" />
                </div>
            </div>
        </header>
    );
}
