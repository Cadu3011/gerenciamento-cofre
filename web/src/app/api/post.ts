"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { jwtDecode } from "jwt-decode";

export const apiUrl = async (): Promise<string> => {
  const url = "localhost:4000";
  return url;
};
const Url = await apiUrl();
export async function handleFormSubmit(formData: FormData) {
  const descrition = formData.get("description") as string;
  const value = formData.get("value") as string;
  const type = formData.get("type") as string;
  const filialId = Number(formData.get("filialId") as string);
  const token = formData.get("token") as string;
  const idCategoria = formData.get("categoriaId") as string;
  const category = formData.get("categoriaDesc") as string;
  const transfIdDest = formData.get("transfIdDest") as string;
  const tokenCookie = (await cookies()).get("access_token")?.value;
  const userData = jwtDecode<UserPayload>(tokenCookie as string);
  const data = {
    descrition,
    value: value.replace(",", "."),
    type,
    filialId,
    idCategoria: Number(idCategoria),
    category,
    tokenTrier: userData.tokenTrier,
    idContaDest: Number(transfIdDest),
  };
  try {
    const dataPost = await fetch(`http://${Url}/movement`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });
    return JSON.stringify(dataPost);
  } catch (error) {
    console.log(error);
  }
}

export async function pushValueSangria(id: number, value: string) {
  const tokenCookie = (await cookies()).get("access_token")?.value;
  try {
    const data = {
      value: value,
    };
    const dataPost = await fetch(`http://${Url}/movement/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenCookie}`,
      },
      body: JSON.stringify(data),
    });
    return JSON.stringify(dataPost);
  } catch (error) {
    console.log(error);
  }
}
interface UserPayload {
  sub: number;
  roles: string;
  filialId: number;
  iat: number;
  exp: number;
  cofreIdTrier: number;
  tokenTrier?: string;
}
export async function handlePostLogin(formData: FormData) {
  const login = formData.get("login") as string;
  const password = formData.get("password") as string;

  const data = {
    login: parseInt(login),
    password,
  };
  const response = await fetch(`http://${Url}/auth/signin`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  console.log(response.status)
  if (response.status === 500 || response.status === 404 || response.status === 401) {
    return { data: "dados invalidos" };
  }
  const token = await response.json();

  (await cookies()).set("access_token", token.access_token, { httpOnly: true });
  const tokenCookie = (await cookies()).get("access_token")?.value;

  const userData = jwtDecode<UserPayload>(tokenCookie as string);

  if (userData.roles === "GESTOR") {
    redirect("/admin");
  }
  redirect("/gerencia-cofre");
}
export async function handleLogut() {
  (await cookies()).delete("access_token");
  redirect("/login");
}
export async function handleFormBalanceFisic(formData: FormData) {
  const value100_50 = formData.get("value100_50") as string;
  const value20 = formData.get("value20") as string;
  const value10 = formData.get("value10") as string;
  const value5 = formData.get("value5") as string;
  const value2 = formData.get("value2") as string;
  const valueMoedas = formData.get("valueMoedas") as string;
  const valueReserva = formData.get("valueReserva") as string;
  const BalanceFisics = await getBalanceFisics();
  const data = {
    value_100_50: value100_50.replace(",", "."),
    value_20: value20.replace(",", "."),
    value_10: value10.replace(",", "."),
    value_5: value5.replace(",", "."),
    value_2: value2.replace(",", "."),
    value_moedas: valueMoedas.replace(",", "."),
    value_reserva: valueReserva.replace(",", "."),
  };
  if (BalanceFisics.length !== 0) {
    try {
      const tokenCookie = (await cookies()).get("access_token")?.value;
      const dataPost = await fetch(`http://${Url}/balance-fisic`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tokenCookie}`,
        },
        body: JSON.stringify(data),
      });
      return JSON.stringify(dataPost);
    } catch (error) {
      console.log(error);
    }
  } else {
    try {
      const tokenCookie = (await cookies()).get("access_token")?.value;
      const dataPost = await fetch(`http://${Url}/balance-fisic`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tokenCookie}`,
        },
        body: JSON.stringify(data),
      });
      return JSON.stringify(dataPost);
    } catch (error) {
      console.log(error);
    }
  }
}
export async function getExtract(
  dateInit: string,
  dateFinal: string,
  filialId?: string
) {
  const tokenCookie = (await cookies()).get("access_token")?.value;
  console.log(dateInit, dateFinal, filialId);
  const extrato = await fetch(
    `http://${Url}/amount?dateInit=${dateInit}&dateFinal=${dateFinal}&filialId=${filialId}`,
    {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenCookie}`,
      },
    }
  ).then((res) => res.json());
  return extrato;
}
export async function getFiliais() {
  const tokenCookie = (await cookies()).get("access_token")?.value;
  const filiais = await fetch(`http://${Url}/filial`, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${tokenCookie}`,
    },
  }).then((res) => res.json());
  return filiais;
}
export async function fetchSaldos(filialId: string) {
  const tokenCookie = (await cookies()).get("access_token")?.value;
  try {
    const [resAnt, resAt, resFilial] = await Promise.all([
      fetch(`http://${Url}/amount/ant`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tokenCookie}`,
        },
      }).then((res) => res.json()),
      fetch(`http://${Url}/amount/last`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tokenCookie}`,
        },
      }).then((res) => res.json()),
      fetch(`http://${Url}/filial/${Number(filialId)}`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tokenCookie}`,
        },
      }).then((res) => res.json()),
    ]);

    return {
      saldosInfo: {
        saldoAnt: resAnt.balance,
        dataSaldoAnt: resAnt.createdAt,
        saldoAtual: resAt.balance || "0",
        filialName: resFilial.name || "0",
      },
    };
  } catch (err) {
    return {
      saldosInfo: {
        saldoAnt: 0,
        dataSaldoAnt: "",
        saldoAtual: 0,
        filialName: "Erro",
      },
    };
  }
}
export async function getMovements() {
  const tokenCookie = (await cookies()).get("access_token")?.value;
  const Url = await apiUrl();
  const movementList = await fetch(`http://${Url}/movement/operator`, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${tokenCookie}`,
    },
  }).then((res) => res.json());
  return movementList;
}
export async function getMovementsExtract() {
  const tokenCookie = (await cookies()).get("access_token")?.value;
  const Url = await apiUrl();
  const movementList = await fetch(`http://${Url}/movement/list`, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${tokenCookie}`,
    },
  }).then((res) => res.json());
  return movementList;
}

export async function deleteMoves(id: number) {
  const tokenCookie = (await cookies()).get("access_token")?.value;
  const Url = await apiUrl();
  await fetch(`http://${Url}/movement/${id}`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${tokenCookie}`, // Passa o token no header
    },
  });
}
export async function getBalanceFisics() {
  const tokenCookie = (await cookies()).get("access_token")?.value;
  const data = await fetch(`http://${Url}/balance-fisic`, {
    headers: {
      Authorization: `Bearer ${tokenCookie}`,
    },
  });
  const cash = await data.json();
  return cash;
}
export async function getMovementsAnt() {
  const tokenCookie = (await cookies()).get("access_token")?.value;
  const data = await fetch(`http://${Url}/movement/ant`, {
    headers: {
      Authorization: `Bearer ${tokenCookie}`,
    },
  });
  const cash = await data.json();
  return cash;
}
export async function getCofresTrier() {
  const tokenGetFilial = (await cookies()).get("access_token")?.value;
  const userData = jwtDecode<UserPayload>(tokenGetFilial as string);
  const dataMock = [
    { id: 12099, titulo: "Cofre CENTRAL CAVALCANTE" },
    { id: 6099, titulo: "Cofre FILIAL 1 - MATRIZ CAVALCANTE" },
    { id: 9099, titulo: "Cofre FILIAL 2 - TAIRU" },
    { id: 4099, titulo: "Cofre FILIAL 3 - ULTRA POPULAR" },
    { id: 14099, titulo: "Cofre FILIAL 4 - HIPER IDEAL" },
    { id: 17099, titulo: "Cofre FILIAL 5 - BOM DESPACHO" },
    { id: 30099, titulo: "Cofre FILIAL 6 - ULTRA IRMA DULCE" },
    { id: 32099, titulo: "Cofre FILIAL 7 - COROA" },
  ];
  function contasMock(userData: { cofreIdTrier: number }) {
    return dataMock.filter((data) => data.id !== userData.cofreIdTrier);
  }

  try {
    const data = await fetch(
      `http://farmargrande2.dyndns.org:4647/web-drogaria/financeiro/contas/filtrar?page=0&size=50`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",

          Authorization: `Bearer ${userData.tokenTrier}`,
        },
        body: JSON.stringify({
          tiposConta: ["CONTA_COFRE"],
          ignorarContas: [{ id: userData.cofreIdTrier }],
          ignorarTiposConta: [],
          incluirContasCompartilhadas: true,
          situacoes: ["ATIVO"],
        }),
      }
    );
    if (!data.ok) throw new Error("Erro na API");

    const cofres = await data.json();

    if (!cofres?.content || !Array.isArray(cofres.content)) {
      throw new Error("Resposta inválida da API");
    }

    return cofres.content;
  } catch (error) {
    const data = contasMock(userData);
    return data;
  }
}
export async function postUser(formData: FormData) {
  const login = formData.get("login") as string;
  const password = formData.get("password") as string;
  const name = formData.get("name") as string;
  const role = formData.get("role") as string;
  const filialId = formData.get("filialId") as string;
  const tokenCookie = (await cookies()).get("access_token")?.value;
  const data = {
    login: parseInt(login),
    password,
    name,
    role,
    filialId: parseInt(filialId),
  };
  const response = await fetch(`http://${Url}/users`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${tokenCookie}`,
    },
    body: JSON.stringify(data),
  });
  return;
}
