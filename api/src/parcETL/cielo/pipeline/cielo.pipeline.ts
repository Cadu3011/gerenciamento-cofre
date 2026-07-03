import { Inject, Injectable } from '@nestjs/common';
import { CieloParcTransform } from '../transform/cielo.cardTransform';
import { CieloParcLoad } from '../load/cielo.cardLoad';

Injectable();
export class CieloParcETLPipeline {
  @Inject()
  private readonly transform: CieloParcTransform;

  @Inject()
  private readonly load: CieloParcLoad;
  async execute(fileNames: string[]) {
    const data = await this.transform.execute(fileNames);

    await this.load.execute(data);
  }
}
