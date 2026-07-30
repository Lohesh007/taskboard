import { useTheme } from '../context/ThemeContext';

export default function ThemeToggle() {
  const { isDark, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className={`relative flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all duration-300 ${
        isDark
          ? 'bg-white/5 border-white/10 text-gray-300 hover:text-white hover:border-white/20'
          : 'bg-gray-100 border-gray-200 text-gray-600 hover:text-gray-900 hover:border-gray-300'
      }`}
      title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
    >
      <span className="text-sm">
        {isDark ? '🌙' : '☀️'}
      </span>
      <span className="hidden sm:block">
        {isDark ? 'Dark' : 'Light'}
      </span>
    </button>
  );
}