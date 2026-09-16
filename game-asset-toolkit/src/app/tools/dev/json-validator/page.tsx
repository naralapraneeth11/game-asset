import JsonTool from "@/tools/developer/json/JsonTool";
import { developerMetadata } from "@/lib/dev/metadata";

export const metadata = developerMetadata("json-validator");

export default function Page() {
  return <JsonTool validatorOnly />;
}
