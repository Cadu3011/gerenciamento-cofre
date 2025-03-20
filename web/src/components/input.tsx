"use client";

interface Props {
  value: string;
  setValue: (value: string) => void;
  placeholder: string;
  type: string;
}

export default function InputComp({
  type,
  value,
  setValue,
  placeholder,
}: Props) {
  return (
    <input
      type={type}
      className="w-full rounded-lg border border-gray-300 focus:border-blue-400 focus:ring-2 focus:ring-blue-400 outline-none transition-all duration-200 bg-white shadow-md placeholder:text-x1 placeholder:text-center"
      placeholder={`${placeholder}`}
      onChange={(e) => setValue(e.target.value)}
      required
    />
  );
}
