import { useColorScheme } from "react-native";

import { themeForScheme } from "@/constants/theme";

export function useForgeTheme() {
  return themeForScheme(useColorScheme());
}
