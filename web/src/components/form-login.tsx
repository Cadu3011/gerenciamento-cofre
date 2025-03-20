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
      <form action="" method="post" onSubmit={handleSubmit}>
        <div>Entrar</div>
        <div>
          <label htmlFor="">Login</label>
          <InputComp
            value={login}
            setValue={setLogin}
            placeholder=""
            type="text"
          />
        </div>
        <div>
          <label htmlFor="">Senha</label>
          <InputComp
            value={password}
            setValue={setPassword}
            placeholder=""
            type="password"
          />
        </div>
        <input type="submit" />
      </form>
    </div>
  );
}
