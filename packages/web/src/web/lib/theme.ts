import { createContext, useContext } from "react";
import type { Theme } from "../hooks/useTheme";

export const ThemeContext = createContext<{
  theme: Theme;
  toggle: () => void;
}>({ theme: "dark", toggle: () => {} });

export const useThemeContext = () => useContext(ThemeContext);
