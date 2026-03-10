import SkyPulseLogo from './SkyPulseLogo';
import s from '../../styles/components/footer.module.css';

export default function AppFooter() {
  return (
    <footer className={s.footer}>
      <div className={s.divider} />
      <div className={s.brand}>
        <SkyPulseLogo size={14} /> SkyPulse
      </div>
      <div className={s.sub}>Powered by OpenWeatherMap</div>
    </footer>
  );
}
