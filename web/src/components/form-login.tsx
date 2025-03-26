"use client";
import { useState } from "react";
import InputComp from "./input";
import { handlePostLogin } from "@/app/api/post";

export function LoginForm() {
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append("login", login);
    formData.append("password", password);
    const response = await handlePostLogin(formData);
  };
  return (
    <div>
      <form action="" method="post" onSubmit={handleSubmit} className="bg-blue-400 w-80 p-3 space-y-5 ">
        <div className="border-b border-gray-500"><img src="" alt="" /></div>
        <div className=" flex justify-center">Entrar</div>
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
        <div className="flex justify-center">
        <input type="submit" className="bg-gray-300 pr-3 pl-3 rounded hover:bg-slate-50"/>
        </div>
        
      </form>
    </div>
  );
}
