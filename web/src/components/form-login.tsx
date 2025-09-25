"use client";
import { useState } from "react";
import InputComp from "./input";
import { handlePostLogin } from "@/app/api/post";
import { toast, ToastContainer } from "react-toastify";

export function LoginForm() {
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [load, setLoad] = useState(false);
  const [response, setResponse] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append("login", login);
    formData.append("password", password);
    setLoad(true);
    const response = await handlePostLogin(formData);
    if (response.data) {
      setResponse(response.data);
      const showToast = () => {
        toast.error(response.data);
      };
      setLoad(false);
      showToast();
    }
  };
  return (
    <div>
      <form
        action=""
        method="post"
        onSubmit={handleSubmit}
        className="bg-blue-400 w-80 p-3 space-y-5 "
      >
        <div className="border-b border-gray-500">
          <img
            src="http://farmargrande2.dyndns.org:4647/sgfpod1/images/logo-versao.png"
            alt=""
          />
        </div>
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
          <button
            type="submit"
            disabled={load}
            className={`bg-gray-300 pr-3 pl-3 rounded hover:bg-slate-50 ${
              load === true
                ? "opacity-50 cursor-not-allowed" // sem hover quando bloqueado
                : "hover:bg-red-50"
            }`}
          >
            {load ? (
              <svg
                className="animate-spin h-5 w-5 text-blue-500"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                ></path>
              </svg>
            ) : (
              "Enviar"
            )}
          </button>
        </div>
      </form>
      <div className="flex justify-center">
        <ToastContainer />
      </div>
    </div>
  );
}
