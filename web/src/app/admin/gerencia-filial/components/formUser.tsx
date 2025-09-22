"use client";

import { postUser } from "@/app/api/post";
import InputComp from "@/components/input";
import { useState } from "react";

enum Role {
  o = "OPERADOR",
  g = "GESTOR",
}
export function FormUser() {
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<Role>(Role.o);
  const [filialId, setFilialId] = useState("");
  const fetchUser = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append("login", login);
    formData.append("password", password);
    formData.append("name", name);
    formData.append("role", role);
    formData.append("filialId", filialId);

    await postUser(formData);
  };
  return (
    <div className="">
      <form
        method="POST"
        onSubmit={fetchUser}
        className="border border-blue-300 shadow-md p-2 space-y-4 "
      >
        <label className="flex justify-center text-blue-600">
          Cadastro de usuarios
        </label>

        <div>
          <InputComp
            value={login}
            setValue={setLogin}
            placeholder="Login"
            type="text"
          />
        </div>
        <div>
          <InputComp
            value={password}
            setValue={setPassword}
            placeholder="Senha"
            type="password"
          />
        </div>
        <div>
          <InputComp
            value={name}
            setValue={setName}
            placeholder="Nome"
            type="text"
          />
        </div>
        <div>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as Role)}
            className="ml-2 p-2 border rounded"
          >
            <option value={Role.g}>Gestor</option>
            <option value={Role.o}>Operador</option>
          </select>
        </div>
        <div>
          <InputComp
            value={filialId}
            setValue={setFilialId}
            placeholder="Filial"
            type="number"
          />
        </div>
        <div className="flex justify-center">
          <button
            type="submit"
            className="bg-blue-600 text-white pl-3 pr-3 rounded-sm"
          >
            Cadastrar
          </button>
        </div>
      </form>
    </div>
  );
}
