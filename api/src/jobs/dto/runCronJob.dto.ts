import { Transform } from 'class-transformer';
import { IsBoolean, IsDateString, IsEnum, IsOptional } from 'class-validator';

export enum JobPeriodType {
  AUTO = 'AUTO',
  DATE = 'DATE',
  RANGE = 'RANGE',
}

export enum LogLevel {
  ALL = 'ALL',
  WARN_ERROR = 'WARN_ERROR',
  ERROR_ONLY = 'ERROR_ONLY',
  NONE = 'NONE',
}

export class RunJobQueryDto {
  @IsOptional()
  @IsEnum(JobPeriodType)
  period?: JobPeriodType;

  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @Transform(({ value }) => value === 'true')
  @IsBoolean()
  force?: boolean;

  @IsOptional()
  @Transform(({ value }) => value === 'true')
  @IsBoolean()
  bigCharge?: boolean;

  @IsOptional()
  @IsEnum(LogLevel)
  logLevel?: LogLevel;
}
