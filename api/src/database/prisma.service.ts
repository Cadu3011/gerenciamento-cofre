import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

const DEFAULT_POOL_SIZE = 15;

function buildDatasourceUrl() {
  const raw = process.env.DATABASE_URL;
  if (!raw) return undefined;
  if (raw.includes('connection_limit')) return raw;
  const sep = raw.includes('?') ? '&' : '?';
  return `${raw}${sep}connection_limit=${DEFAULT_POOL_SIZE}`;
}

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  constructor() {
    const url = buildDatasourceUrl();
    super(
      url
        ? {
            datasources: { db: { url } },
          }
        : {},
    );
  }

  async onModuleInit() {
    await this.$connect();
  }
}