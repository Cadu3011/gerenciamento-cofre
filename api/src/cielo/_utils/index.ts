import * as fs from 'fs';
import * as path from 'path';

export function readSftpKey(envVarName: string): Buffer | undefined {
  const envPath = process.env[envVarName];
  if (!envPath) {
    console.warn(`[WARN] Environment variable ${envVarName} is not set.`);
    return undefined;
  }

  const keyPath = path.resolve(__dirname, envPath);

  if (!fs.existsSync(keyPath)) {
    console.warn(`[WARN] SFTP key not found at: ${keyPath}`);
    return undefined;
  }

  return fs.readFileSync(keyPath);
}