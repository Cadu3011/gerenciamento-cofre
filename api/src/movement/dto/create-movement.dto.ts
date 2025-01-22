import { Category } from "@prisma/client"

export class CreateMovementDto {
    descrition:string
    value: number
    type: Category
}
