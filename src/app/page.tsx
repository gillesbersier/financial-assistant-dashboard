import Image from "next/image";
import Header from '@/components/Header';
import StatsCards from '@/components/StatsCards';
import SpendingChart from '@/components/SpendingChart';
import ReceiptUpload from '@/components/ReceiptUpload';
import InvoicesTable from '@/components/InvoicesTable';
import styles from './page.module.css';

export default function Home() {
  return (
    <main className="container">
      <div className={styles.dashboard}>
        <Header />

        <StatsCards />

        <div className={styles.mainGrid}>
          <SpendingChart />
          <ReceiptUpload />

        </div>

        <InvoicesTable />
      </div>
    </main>
  );
}
