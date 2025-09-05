import { getMovements } from "@/app/api/post";
import { useEffect, useState } from "react";
interface Props {
  type: string;
  filialId: string;
  token: string;
}
export default function SumMovements({ type, filialId, token }: Props) {
  const [SumMovements, setSumMovements] = useState<number>(0);
  useEffect(() => {
    const fetchMovements = async () => {
      const movement = await getMovements();
      console.log(movement);
      const totalValue = movement
        .filter((move: { type: string }) => move.type === type)
        .reduce(
          (acumulador: number, valorAtual: { value: number }) =>
            acumulador + Number(valorAtual.value),
          0
        );
      console.log(totalValue);

      setSumMovements(totalValue);
    };

    fetchMovements();
  }, [type]);
  return <>{SumMovements}</>;
}
