import styles from './AutomationPanel.module.css';
import { AUTOMATION_STEPS } from '../data/mock';
import { CheckCircle2, Circle, Loader2, AlertCircle } from 'lucide-react';

export default function AutomationPanel() {
    return (
        <div className={`card ${styles.panel}`}>
            <div className={styles.header}>
                <h3 className={styles.title}>Automation Status</h3>
                <span className={`${styles.badge} badge-success`}>Live</span>
            </div>

            <p className={styles.description}>
                Your financial autopilot is running smoothly. Last sync completed 2 min ago.
            </p>

            <div className={styles.steps}>
                {AUTOMATION_STEPS.map((step, index) => {
                    let Icon = Circle;
                    let colorClass = styles.textNeutral;

                    if (step.status === 'success') {
                        Icon = CheckCircle2;
                        colorClass = styles.textSuccess;
                    } else if (step.status === 'pending') {
                        Icon = Loader2;
                        colorClass = styles.textPrimary;
                    } else if (step.status === 'error') {
                        Icon = AlertCircle;
                        colorClass = styles.textError;
                    } else if (step.status === 'waiting') {
                        Icon = Circle;
                        colorClass = styles.textNeutral;
                    }

                    return (
                        <div key={index} className={styles.step}>
                            <div className={styles.iconWrapper}>
                                <Icon size={18} className={`${colorClass} ${step.status === 'pending' ? styles.spin : ''}`} />
                                {index < AUTOMATION_STEPS.length - 1 && (
                                    <div className={`${styles.line} ${step.status === 'success' ? styles.lineActive : ''}`} />
                                )}
                            </div>
                            <div className={styles.stepContent}>
                                <span className={`${styles.stepName} ${step.status === 'pending' ? styles.activeText : ''}`}>{step.name}</span>
                                <span className={styles.stepTime}>{step.time}</span>
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className={styles.footer}>
                <button className={styles.viewLogsBtn}>View Workflow Logs</button>
            </div>
        </div>
    );
}
