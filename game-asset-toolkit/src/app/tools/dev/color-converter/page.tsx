import { Metadata } from "next";
import { ColorClient } from "./ColorClient";

export const metadata: Metadata = {
  title: "Color Converter",
  description: "Convert between HEX, RGB and HSL colors.",
};

export default function Page() {
  return <ColorClient />;
}
