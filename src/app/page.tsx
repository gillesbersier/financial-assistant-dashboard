'use client';

import { useState } from 'react';
import Image from "next/image";
import Header from '@/components/Header';
import StatsCards from '@/components/StatsCards';
import SpendingChart from '@/components/SpendingChart';
import ReceiptUpload from '@/components/ReceiptUpload';
import InvoicesTable from '@/components/InvoicesTable';
import { useInvoices } from '@/hooks/useInvoices';
import styles from './page.module.css';

export default function Home() {
  const [selectedMonth, setSelectedMonth] = useState<Date | null>(null);
  const [spendingRange, setSpendingRange] = useState<[number, number] | null>(null);

  // Lifted state to parent so all components share the same data
  const { invoices, loading, totalAmount, error, refresh, updateCategory, syncStatus } = useInvoices();

  return (
    <main className="container">
      <div className={styles.dashboard}>
        <Header />

        <StatsCards
          dateRange={spendingRange}
          invoices={invoices}
          loading={loading}
          totalAmount={totalAmount}
        />

        <div className={styles.mainGrid}>
          <SpendingChart
            onMonthSelect={setSelectedMonth}
            selectedMonth={selectedMonth}
            onRangeChange={setSpendingRange}
            invoices={invoices}
            loading={loading}
          />
          <ReceiptUpload onUploadSuccess={refresh} />
        </div>

        <InvoicesTable
          filterMonth={selectedMonth}
          dateRange={spendingRange}
          invoices={invoices}
          loading={loading}
          error={error}
          refresh={refresh}
          updateCategory={updateCategory}
          syncStatus={syncStatus}
        />
      </div>
    </main>
  );
}
