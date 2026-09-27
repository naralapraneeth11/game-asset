import Link from "next/link";
import { ChevronRight } from "lucide-react";

export interface Crumb {
  name: string;
  href: string;
}

/** Home › Video › Video Compressor. The last item is the current page. */
export function Breadcrumb({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="text-[13px] text-muted-foreground">
      <ol className="flex flex-wrap items-center gap-1">
        {items.map((item, index) => {
          const last = index === items.length - 1;
          return (
            <li key={item.href} className="flex items-center gap-1">
              {last ? (
                <span aria-current="page" className="text-foreground/80">{item.name}</span>
              ) : (
                <>
                  <Link href={item.href} className="rounded hover:text-foreground hover:underline hover:underline-offset-4">{item.name}</Link>
                  <ChevronRight className="h-3.5 w-3.5 opacity-60" aria-hidden />
                </>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
