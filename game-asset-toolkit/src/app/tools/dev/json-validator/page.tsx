import { Metadata } from "next";
import { JsonValidatorClient } from "./JsonValidatorClient";

export const metadata: Metadata = {
  title: "JSON Validator",
  description: "Validate JSON with clear error messages. Runs entirely in your browser.",
};

export default function Page() {
  return <JsonValidatorClient />;
}
