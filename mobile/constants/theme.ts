import { ColorSchemeName } from "react-native";

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32
};

export const lightTheme = {
  mode: "light",
  background: "#F7F8FA",
  surface: "#FFFFFF",
  surfaceMuted: "#EEF1F4",
  border: "#D9DEE5",
  text: "#101820",
  muted: "#5C6672",
  primary: "#2563EB",
  primaryText: "#FFFFFF",
  danger: "#C2410C",
  success: "#0F766E"
};

export const darkTheme = {
  mode: "dark",
  background: "#101214",
  surface: "#181B20",
  surfaceMuted: "#242932",
  border: "#333A45",
  text: "#F4F7FA",
  muted: "#A8B0BB",
  primary: "#60A5FA",
  primaryText: "#08111F",
  danger: "#FB923C",
  success: "#2DD4BF"
};

export type ForgeTheme = typeof lightTheme;

export function themeForScheme(scheme: ColorSchemeName): ForgeTheme {
  return scheme === "dark" ? darkTheme : lightTheme;
}
