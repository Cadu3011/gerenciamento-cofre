import { Role } from "@prisma/client"

export class CreateUserDto {
    login: number
    password: string
    name: string
    role: Role

}
