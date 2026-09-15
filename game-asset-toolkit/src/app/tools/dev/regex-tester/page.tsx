import { Metadata } from "next";
import { RegexClient } from "./RegexClient";

export const metadata: Metadata = {
  title: "Regex Tester",
  description: "Test regular expressions with live matching.",
};

export default function Page() {
  return <RegexClient />;
}
