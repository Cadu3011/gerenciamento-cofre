import { Inject, Injectable } from '@nestjs/common';
import { ExtractParc } from './repository/extract-parc';
import { ConciliacaoParcMatch } from './conciliacao-parc.match';

@Injectable()
export class ConciliacaoParcPipeline {
    @Inject()
    private readonly extract: ExtractParc
    
    @Inject()
    private readonly matchService: ConciliacaoParcMatch

    async execute(date: string,
    filialId: number){
        const data = await this.extract.execute(date,filialId)
        const match = this.matchService.match(data)
    }
}
