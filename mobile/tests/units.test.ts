import { displayVolume, displayWeight, inputWeightToKg, kgToLb, lbToKg } from "@/utils/units";

test("converts kilograms and pounds", () => {
  expect(Math.round(kgToLb(100))).toBe(220);
  expect(Math.round(lbToKg(220))).toBe(100);
});

test("formats display weight by unit preference", () => {
  expect(displayWeight(82.5, "kg")).toBe("82.5 kg");
  expect(displayWeight(100, "lb")).toBe("220.5 lb");
});

test("formats volume and converts input by unit preference", () => {
  expect(displayVolume(1653.21, "kg")).toBe("1,653 kg");
  expect(displayVolume(1653.21, "lb")).toBe("3,645 lb");
  expect(inputWeightToKg("135", "lb")).toBeCloseTo(61.23, 2);
  expect(inputWeightToKg("61.23", "kg")).toBeCloseTo(61.23, 2);
});
