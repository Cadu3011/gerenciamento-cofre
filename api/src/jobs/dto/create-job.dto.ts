import { IsNotEmpty, IsString } from 'class-validator';

export class CreateJobDto {
  @IsString()
  @IsNotEmpty({ message: 'Nome da tarefa deve ser informado' })
  jobName: string;
}
