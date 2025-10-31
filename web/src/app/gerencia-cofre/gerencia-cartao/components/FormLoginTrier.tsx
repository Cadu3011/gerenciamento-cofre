"use client";
import { useEffect, useState } from "react";
import { toast, ToastContainer } from "react-toastify";
import InputComp from "@/components/input";
import { LoginTrier } from "@/app/api/cartao/trier";

interface Props {
  token?: string;
}
export function LoginFormTrier({ token }: Props) {
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [load, setLoad] = useState(false);
  const [response, setResponse] = useState("");
  const [showForm, setShowForm] = useState(true);
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append("login", login);
    formData.append("password", password);
    setLoad(true);
    //pegar controller fazendo get na pagina login , e efetuar login pegando o token e setando nos cookies
    const response = await LoginTrier(formData);
    if (response?.data) {
      setResponse(response.data);
      const showToast = () => {
        toast.error(response.data);
      };
      setLoad(false);
      showToast();
    }
    if (token) {
      setShowForm(false);
    }
  };

  return (
    <div className="flex justify-center">
      {showForm && (
        <div className="fixed top-0 left-0 w-full h-full bg-black bg-opacity-50 z-10 flex justify-center items-center">
          <div className="  rounded-xl relative w-[100%] max-w-md"></div>
          <form
            action=""
            method="post"
            onSubmit={handleSubmit}
            className="bg-blue-400 w-80 p-3 space-y-5 "
          >
            <div className="border-b border-gray-500">
              <div className="bg-white rounded-md flex-col flex justify-center items-center py-2">
                <img src="/OIP.jpg" alt="" />
                <div className="text-green-800 px-6 rounded-md font-bold font-serif flex justify-center ">
                  CAVALCANTE DROGARIAS
                </div>
              </div>
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
        </div>
      )}
      <div className="flex justify-center">
        <ToastContainer />
      </div>
    </div>
  );
}
