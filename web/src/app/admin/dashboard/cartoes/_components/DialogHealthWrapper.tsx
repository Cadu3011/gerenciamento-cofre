"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { HealthDetailsDialog } from "./HealthDetailsDialog";

interface Props {
  type?: string;
  data: any[];
}

export default function DialogHealthWrapper({ type, data }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  return (
    <HealthDetailsDialog
      open={!!type}
      data={data}
      onOpenChange={(open) => {
        if (!open) {
          const params = new URLSearchParams(searchParams.toString());

          params.delete("type");

          router.replace(`?${params.toString()}`);
        }
      }}
    />
  );
}
