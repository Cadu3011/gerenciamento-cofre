import { Category, Status } from '@prisma/client';

export class CreateMovementDto {
  id?: number;
  descrition: string;
  value: number;
  type: Category;
  filialId: number;
  idTrier?: number;
  status: Status;
  category?: string;
  idCategoria: number;
  tokenTrier?: string;
  idContaDest?: number;
}
