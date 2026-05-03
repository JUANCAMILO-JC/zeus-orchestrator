import { Module } from '@nestjs/common';
import { AnthropicModule } from '../anthropic/anthropic.module';
import { AtlasService } from './atlas.service';
import { HermesService } from './hermes.service';
import { ZeusService } from './zeus.service';

@Module({
  imports: [AnthropicModule],
  providers: [AtlasService, HermesService, ZeusService],
  exports: [AtlasService, HermesService, ZeusService],
})
export class AgentsModule {}
