export interface RedeAuth {
  idRede: number;
  date: string;
}

export interface RedeExtractStrategy<TOut = unknown> {
  readonly key: string;
  execute(ctx: RedeAuth): Promise<TOut>;
}
