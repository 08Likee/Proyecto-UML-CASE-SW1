import { useTheme } from './theme.context';

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const esOscuro = theme === 'dark';

  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={toggleTheme}
      aria-label={esOscuro ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
      title={esOscuro ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
    >
      <span aria-hidden="true">{esOscuro ? '☀' : '☾'}</span>
      <span>{esOscuro ? 'Claro' : 'Oscuro'}</span>
    </button>
  );
}
