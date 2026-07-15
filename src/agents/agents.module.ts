import { Module } from '@nestjs/common';
import { AnthropicModule } from '../anthropic/anthropic.module';
import { ApoloService } from './apolo.service';
import { AtlasService } from './atlas.service';
import { HermesService } from './hermes.service';
import { ZeusService } from './zeus.service';

@Module({
  imports: [AnthropicModule],
  providers: [ApoloService, AtlasService, HermesService, ZeusService],
  exports: [ApoloService, AtlasService, HermesService, ZeusService],
})
export class AgentsModule {}
