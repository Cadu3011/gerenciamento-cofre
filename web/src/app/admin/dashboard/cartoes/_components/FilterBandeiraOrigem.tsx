"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Check, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const ORIGENS = ["TRIER", "REDE", "CIELO"];

const STATUS = [
  { valor: "PENDENTE", rotulo: "Pendente" },
  { valor: "DIVERGENTE", rotulo: "Divergente" },
  { valor: "CONCILIADO", rotulo: "Conciliado" },
];

/** Quantas bandeiras cabem na prévia do gatilho antes de virar "+N". */
const PREVIA_MAX = 2;

/**
 * Filtro de origem + bandeiras, compartilhado pelos dashboards.
 *
 * Duas variantes, porque os dashboards não pedem a mesma coisa:
 *
 *  - `origemMulti`: o dashboard de parcelas quer comparar origens em conjunto
 *    e usa o parâmetro `adquirentes` (lista). O de cartões quer uma origem por
 *    vez e usa `adquirente` (singular) — mexer no parâmetro dele quebraria o
 *    endpoint de cartões, que ainda espera valor único.
 *  - `comStatus`: só parcelas tem as colunas `valorPendente`/
 *    `valorDivergente`/`valorConciliado` no fato, então só lá o filtro de
 *    situação tem o que filtrar.
 *
 *  - `bandeirasEmDialog`: o de cartões e o de parcelas têm duas dezenas de
 *    bandeiras e uma seleção cheia estourava a barra de filtros com um badge por
 *    item. Com a prop ligada, o gatilho mostra só uma prévia ("as 2 primeiras
 *    +N") e a lista completa vive num diálogo. Desligada, o gatilho abre um
 *    popover e a seleção aparece em badges ao lado.
 *
 * A Rede nunca aparece na lista de bandeiras: suas parcelas não têm bandeira.
 * Isso não é um filtro escondido — `getFiltros` não devolve chave para a Rede,
 * porque não existe bandeira não-vazia em nenhum fato dela. E, como ela não é
 * filtrável por bandeira, a API a mantém no resultado de qualquer seleção de
 * bandeiras (ramo `adquirente: 'REDE'` do `OR`).
 */
export default function FilterBandeiraOrigem({
  filtros,
  origemMulti = false,
  comStatus = false,
  bandeirasEmDialog = false,
}: {
  filtros: Record<string, string[]>;
  origemMulti?: boolean;
  comStatus?: boolean;
  bandeirasEmDialog?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [dialogAberto, setDialogAberto] = useState(false);
  const [busca, setBusca] = useState("");
  // Rascunho local da seleção enquanto o diálogo está aberto. Não usa a URL de
  // propósito: cada clique dispara `router.replace`, e como o filtro mora dentro
  // de um `<Suspense>` que re-suspende a cada navegação, o diálogo era
  // desmontado no meio da marcação. Aqui a URL só muda no "Aplicar". O valor
  // inicial é irrelevante: quem garante o estado certo é `abreDialog`.
  const [rascunho, setRascunho] = useState<string[]>([]);

  const origemParam = origemMulti ? "adquirentes" : "adquirente";

  const origens = useMemo(
    () =>
      searchParams
        .get(origemParam)
        ?.split(",")
        .map((o) => o.trim())
        .filter(Boolean) ?? [],
    [searchParams, origemParam],
  );

  const modo = searchParams.get("bandeirasModo") ?? "incluir";
  const selected =
    searchParams.get("bandeiras")?.split(",").filter(Boolean) ?? [];
  const status = searchParams.get("status")?.split(",").filter(Boolean) ?? [];

  // União das bandeiras das origens selecionadas. Sem origem marcada, mostra
  // tudo — e a Rede nunca entra, porque não tem chave em `filtros`.
  const bandeiras = useMemo(() => {
    const chaves = origens.length ? origens : Object.keys(filtros);
    const set = new Set<string>();
    chaves.forEach((o) => (filtros[o] ?? []).forEach((b) => set.add(b)));
    return [...set].sort();
  }, [filtros, origens]);

  function apply(opts: {
    origens?: string[];
    bandeiras?: string[];
    modo?: string;
    status?: string[];
  }) {
    const params = new URLSearchParams(searchParams.toString());

    const nextOrigens = opts.origens ?? origens;
    if (nextOrigens.length) params.set(origemParam, nextOrigens.join(","));
    else params.delete(origemParam);

    const nextBandeiras = opts.bandeiras ?? selected;
    if (nextBandeiras.length) {
      params.set("bandeiras", nextBandeiras.join(","));
      params.set("bandeirasModo", opts.modo ?? modo);
    } else {
      params.delete("bandeiras");
      params.delete("bandeirasModo");
    }

    const nextStatus = opts.status ?? status;
    if (nextStatus.length) params.set("status", nextStatus.join(","));
    else params.delete("status");

    router.replace(`${pathname}?${params.toString()}`);
  }

  function toggleOrigem(o: string) {
    // Trocar a origem zera as bandeiras: a lista exibida muda e as antigas
    // podem não existir mais na origem nova.
    apply({
      origens: origens.includes(o)
        ? origens.filter((x) => x !== o)
        : [...origens, o],
      bandeiras: [],
    });
  }

  function onModoChange(value: string) {
    apply({ modo: value });
  }

  function toggleBandeira(b: string) {
    apply({
      bandeiras: selected.includes(b)
        ? selected.filter((x) => x !== b)
        : [...selected, b],
    });
  }

  function toggleStatus(s: string) {
    apply({
      status: status.includes(s)
        ? status.filter((x) => x !== s)
        : [...status, s],
    });
  }

  /** Abrir o diálogo sempre parte do que está na URL, não do rascunho antigo. */
  function abreDialog() {
    setRascunho(selected);
    setBusca("");
    setDialogAberto(true);
  }

  function toggleRascunho(b: string) {
    setRascunho((atual) =>
      atual.includes(b) ? atual.filter((x) => x !== b) : [...atual, b],
    );
  }

  /** O rascunho diverge do que já está aplicado? Decide o estado do "Aplicar". */
  const rascunhoMudou =
    rascunho.length !== selected.length ||
    rascunho.some((b) => !selected.includes(b));

  const origensRotulo =
    origens.length === 0
      ? "Todas"
      : origens.length === 1
        ? origens[0]
        : `${origens.length} selecionadas`;

  const statusRotulo =
    status.length === 0
      ? "Todas"
      : status.length === 1
        ? (STATUS.find((s) => s.valor === status[0])?.rotulo ?? status[0])
        : `${status.length} selecionadas`;

  const verbo = modo === "excluir" ? "Excluindo" : "Incluindo";
  const previa = selected.slice(0, PREVIA_MAX);
  const restantes = selected.length - previa.length;

  const bandeirasFiltradas = useMemo(() => {
    const alvo = busca.trim().toLowerCase();
    return alvo
      ? bandeiras.filter((b) => b.toLowerCase().includes(alvo))
      : bandeiras;
  }, [bandeiras, busca]);

  return (
    <div className="flex flex-wrap items-center gap-4">
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold">Fonte/Origem:</span>

        {origemMulti ? (
          <>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-44 justify-between">
                  {origensRotulo}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-60 p-2">
                <div className="space-y-2 max-h-72 overflow-auto">
                  {ORIGENS.map((o) => (
                    <div
                      key={o}
                      className="flex items-center justify-between rounded px-2 py-1 hover:bg-accent cursor-pointer"
                      onClick={() => toggleOrigem(o)}
                    >
                      <span>{o}</span>
                      {origens.includes(o) && (
                        <Check className="h-4 w-4 text-green-600" />
                      )}
                    </div>
                  ))}
                </div>
              </PopoverContent>
            </Popover>

            {origens.map((o) => (
              <Badge
                key={o}
                variant="secondary"
                className="flex items-center gap-1"
              >
                {o}
                <button onClick={() => toggleOrigem(o)}>✕</button>
              </Badge>
            ))}
          </>
        ) : (
          <Select
            value={origens[0] ?? "TODAS"}
            onValueChange={(v) =>
              apply({ origens: v === "TODAS" ? [] : [v], bandeiras: [] })
            }
          >
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Todas" />
            </SelectTrigger>
            <SelectContent className="bg-white">
              <SelectItem value="TODAS">Todas</SelectItem>
              {ORIGENS.map((o) => (
                <SelectItem key={o} value={o}>
                  {o}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {comStatus && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold">Situação:</span>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-44 justify-between">
                {statusRotulo}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-60 p-2">
              <div className="space-y-2 max-h-72 overflow-auto">
                {STATUS.map((s) => (
                  <div
                    key={s.valor}
                    className="flex items-center justify-between rounded px-2 py-1 hover:bg-accent cursor-pointer"
                    onClick={() => toggleStatus(s.valor)}
                  >
                    <span>{s.rotulo}</span>
                    {status.includes(s.valor) && (
                      <Check className="h-4 w-4 text-green-600" />
                    )}
                  </div>
                ))}
              </div>
            </PopoverContent>
          </Popover>

          {status.map((s) => (
            <Badge
              key={s}
              variant="secondary"
              className="flex items-center gap-1"
            >
              {STATUS.find((x) => x.valor === s)?.rotulo ?? s}
              <button onClick={() => toggleStatus(s)}>✕</button>
            </Badge>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-semibold">Bandeiras:</span>
        <Select value={modo} onValueChange={onModoChange}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-white">
            <SelectItem value="incluir">Incluir</SelectItem>
            <SelectItem value="excluir">Excluir</SelectItem>
          </SelectContent>
        </Select>
        {bandeirasEmDialog ? (
          <Dialog
            open={dialogAberto}
            onOpenChange={(open) =>
              open ? abreDialog() : setDialogAberto(false)
            }
          >
            <DialogTrigger asChild>
              <Button variant="outline" className="w-80 justify-between gap-2">
                <span className="truncate">
                  {selected.length === 0
                    ? "Todas as bandeiras"
                    : `${verbo}: ${previa.join(", ")}`}
                </span>
                {/* Sinaliza que a prévia está truncada: sem isso o usuário lê a
                    lista como completa e não sabe o que mais está marcado. */}
                {restantes > 0 && (
                  <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-xs font-semibold">
                    +{restantes}
                  </span>
                )}
              </Button>
            </DialogTrigger>
            <DialogContent
              className="max-w-md bg-white"
              onOpenAutoFocus={(e) => e.preventDefault()}
            >
              <DialogHeader>
                <DialogTitle>Bandeiras</DialogTitle>
                <DialogDescription>
                  {rascunho.length === 0
                    ? "Nenhuma marcada — a consulta traz todas as bandeiras."
                    : `${rascunho.length} marcada${rascunho.length > 1 ? "s" : ""}, ${verbo.toLowerCase()} na consulta.`}
                </DialogDescription>
              </DialogHeader>

              <div className="relative">
                <Search className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  placeholder="Buscar bandeira..."
                  className="pl-8"
                />
              </div>

              <div className="max-h-72 space-y-1 overflow-auto">
                {bandeirasFiltradas.length === 0 && (
                  <p className="px-2 py-1 text-sm text-muted-foreground">
                    {bandeiras.length === 0
                      ? "Selecione uma origem"
                      : "Nenhuma bandeira encontrada"}
                  </p>
                )}
                {bandeirasFiltradas.map((b) => (
                  <div
                    key={b}
                    className="flex items-center justify-between rounded px-2 py-1 hover:bg-accent cursor-pointer"
                    onClick={() => toggleRascunho(b)}
                  >
                    <span>{b}</span>
                    {rascunho.includes(b) && (
                      <Check className="h-4 w-4 text-green-600" />
                    )}
                  </div>
                ))}
              </div>

              {/* Container próprio em vez de `DialogFooter`: sobrescrever o
                  `sm:justify-end` dele dependeria da ordem das utilities no
                  CSS do Tailwind. */}
              <div className="flex items-center justify-between gap-2">
                <Button
                  variant="ghost"
                  onClick={() => setRascunho([])}
                  disabled={rascunho.length === 0}
                >
                  Limpar
                </Button>
                <Button
                  onClick={() => {
                    apply({ bandeiras: rascunho });
                    setDialogAberto(false);
                  }}
                  disabled={!rascunhoMudou}
                >
                  Aplicar
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        ) : (
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-52 justify-between">
                Selecionar...
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-60 p-2">
              <div className="space-y-2 max-h-72 overflow-auto">
                {bandeiras.length === 0 && (
                  <div className="px-2 py-1 text-sm text-muted-foreground">
                    Selecione uma origem
                  </div>
                )}
                {bandeiras.map((b) => (
                  <div
                    key={b}
                    className="flex items-center justify-between rounded px-2 py-1 hover:bg-accent cursor-pointer"
                    onClick={() => toggleBandeira(b)}
                  >
                    <span>{b}</span>
                    {selected.includes(b) && (
                      <Check className="h-4 w-4 text-green-600" />
                    )}
                  </div>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        )}

        {/* Os badges só fazem sentido no modo popover: no diálogo a seleção
            já é visível e rolável inteira, e o gatilho mostra a prévia. */}
        {!bandeirasEmDialog &&
          selected.map((b) => (
            <Badge
              key={b}
              variant="secondary"
              className="flex items-center gap-1"
            >
              {b}
              <button
                onClick={() =>
                  apply({ bandeiras: selected.filter((x) => x !== b) })
                }
              >
                ✕
              </button>
            </Badge>
          ))}
      </div>
    </div>
  );
}
