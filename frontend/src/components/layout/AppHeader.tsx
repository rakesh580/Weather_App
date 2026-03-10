import s from '../../styles/components/header.module.css';

export default function AppHeader() {
  return (
    <header className={s.header}>
      <h1 className={s.title}>
        <i className="fa-solid fa-cloud-sun" /> SkyPulse
      </h1>
      <p className={s.subtitle}>Real-time weather, worldwide</p>
    </header>
  );
}
