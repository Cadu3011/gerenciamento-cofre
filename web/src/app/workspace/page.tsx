import Link from "next/link";

export default function Workspace() {
  return (
    <div className="flex justify-center">
      <div className=" w-1/2 bg-blue-300 px-10 flex gap-3 flex-col justify-center rounded-md py-10">
        <div className="flex justify-center w-full gap-10">
          {" "}
          <div className=" bg-white py-5 px-5 text-lg w-full font-bold rounded-md">
            <div className="flex justify-center">Workspace</div>
          </div>
        </div>
        <div className="flex justify-between w-full gap-10">
          <Link
            href="/workspace/gerencia-caixas"
            className="hover:bg-green-400 bg-white py-5 px-5 rounded-md"
          >
            Conferir Caixas
          </Link>
          <Link
            href="/workspace/gerencia-cartao"
            className="hover:bg-green-400 bg-white py-5 px-5 rounded-md"
          >
            Conferir Cartões
          </Link>
          <Link
            href="/workspace/gerencia-cofre"
            className="hover:bg-green-400 bg-white py-5 px-5 rounded-md"
          >
            Gerenciar Cofre
          </Link>
        </div>
      </div>
    </div>
  );
}
