import s from '../../styles/components/particles.module.css';

export default function ScannerSweep() {
  return (
    <div className={s.scannerOverlay}>
      <div className={s.scannerGradient} />
    </div>
  );
}
