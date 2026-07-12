import { Text as RNText, TextProps as RNTextProps } from "react-native";

import { useForgeTheme } from "@/hooks/useForgeTheme";

type TextProps = RNTextProps & {
  variant?: "title" | "heading" | "body" | "caption" | "label";
  muted?: boolean;
};

const sizes = {
  title: 32,
  heading: 22,
  body: 16,
  caption: 13,
  label: 14
};

const weights = {
  title: "800",
  heading: "700",
  body: "400",
  caption: "400",
  label: "700"
} as const;

export function Text({ variant = "body", muted = false, style, ...props }: TextProps) {
  const theme = useForgeTheme();
  return (
    <RNText
      style={[
        {
          color: muted ? theme.muted : theme.text,
          fontSize: sizes[variant],
          fontWeight: weights[variant],
          letterSpacing: 0,
          lineHeight: Math.round(sizes[variant] * 1.3)
        },
        style
      ]}
      {...props}
    />
  );
}
