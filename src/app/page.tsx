'use client';

import { useState } from 'react';
import Image from "next/image";
import Header from '@/components/Header';
import StatsCards from '@/components/StatsCards';
import SpendingChart from '@/components/SpendingChart';
import ReceiptUpload from '@/components/ReceiptUpload';
import InvoicesTable from '@/components/InvoicesTable';
import styles from './page.module.css';

export default function Home() {
  const [selectedMonth, setSelectedMonth] = useState<Date | null>(null);

  return (
    <main className="container">
      <div className={styles.dashboard}>
        <Header />

        <StatsCards />

        <div className={styles.mainGrid}>
          <SpendingChart
            onMonthSelect={setSelectedMonth}
            selectedMonth={selectedMonth}
          />
          <ReceiptUpload />
        </div>

        <InvoicesTable filterMonth={selectedMonth} />
      </div>
    </main>
  );
}
