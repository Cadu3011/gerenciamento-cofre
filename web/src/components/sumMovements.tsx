import { apiPort } from "@/app/api/post";
import { useEffect, useState } from "react";
interface Props {
  type: string;
  filialId: string;
  token: string;
}
export default function SumMovements({ type, filialId, token }: Props) {
  async function getMovements(filialId: number, token: string) {
    const Port = await apiPort();
    console.log(filialId);
    const movementList = await fetch(
      `http://localhost:${Port}/movement/operator/${filialId}`,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`, // Passa o token no header
        },
      }
    ).then((res) => res.json());
    return movementList;
  }
  const [SumMovements, setSumMovements] = useState<number>(0);
  useEffect(() => {
    const fetchMovements = async () => {
      const movement = await getMovements(Number(filialId), token);
      const totalValue = movement
        .filter((move: { type: string }) => move.type === type)
        .reduce(
          (acumulador: number, valorAtual: { value: number }) =>
            acumulador + Number(valorAtual.value),
          0
        );

      setSumMovements(totalValue);
    };

    fetchMovements();
  }, [type]);
  return <>{SumMovements}</>;
}
