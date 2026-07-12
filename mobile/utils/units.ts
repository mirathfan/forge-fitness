import { WeightUnit } from "@/types/api";

export function kgToLb(kg: number): number {
  return kg * 2.2046226218;
}

export function lbToKg(lb: number): number {
  return lb / 2.2046226218;
}

export function displayWeight(weightKg: number, unit: WeightUnit): string {
  const value = unit === "lb" ? kgToLb(weightKg) : weightKg;
  return `${Number.isInteger(value) ? value.toFixed(0) : value.toFixed(1)} ${unit}`;
}

export function displayVolume(volumeKg: number, unit: WeightUnit): string {
  const value = unit === "lb" ? kgToLb(volumeKg) : volumeKg;
  return `${Math.round(value).toLocaleString()} ${unit}`;
}

export function inputWeightToKg(value: string, unit: WeightUnit): number {
  const parsed = Number.parseFloat(value);
  if (Number.isNaN(parsed)) return 0;
  return unit === "lb" ? lbToKg(parsed) : parsed;
}
