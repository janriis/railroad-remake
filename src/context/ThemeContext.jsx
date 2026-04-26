import { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext({ theme: 'victorian', setTheme: () => {} });

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(
    () => localStorage.getItem('iron-empire-theme') ?? 'victorian'
  );

  useEffect(() => {
    if (theme === 'modern') {
      document.documentElement.setAttribute('data-theme', 'modern');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
    localStorage.setItem('iron-empire-theme', theme);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
