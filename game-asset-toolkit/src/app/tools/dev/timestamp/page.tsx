import { Metadata } from "next";
import { TimestampClient } from "./TimestampClient";

export const metadata: Metadata = {
  title: "Timestamp Converter",
  description: "Convert between Unix timestamps and human-readable dates.",
};

export default function Page() {
  return <TimestampClient />;
}
