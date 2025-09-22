import { useEffect, useRef, useState } from "react";
import { categoriasDespesaTrier } from "../categoriasTrierMock";

interface Categoria {
  id: number;
  descricao: string;
}
interface Props {
  onSelect: (categoria: Categoria) => void; // callback pro pai
}

export default function CategoriasButton({ onSelect }: Props) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const categoriasDespesa = categoriasDespesaTrier;

  const filtered = categoriasDespesa.filter((cat) =>
    cat.descricao.toLowerCase().includes(query.toLowerCase())
  );

  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (cat: Categoria) => {
    setQuery(cat.descricao); // mostra apenas a descrição no input
    setOpen(false);
    onSelect(cat);
  };

  return (
    <div ref={wrapperRef} className="relative w-full pb-2">
      <input
        type="text"
        value={query}
        placeholder="Selecione a categoria..."
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        className="pl-2 w-full rounded-lg border border-gray-300 
                   focus:border-blue-400 focus:ring-2 focus:ring-blue-400 
                   outline-none transition-all duration-200 bg-white 
                   shadow-md placeholder:text-x1 placeholder:text-center"
      />

      {open && filtered.length > 0 && (
        <ul className="absolute z-10 w-full bg-white border rounded mt-1 max-h-48 overflow-y-auto shadow">
          {filtered.map((cat) => (
            <li
              key={cat.id}
              onClick={() => handleSelect(cat)}
              className="p-2 hover:bg-gray-100 cursor-pointer"
            >
              {cat.descricao}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
