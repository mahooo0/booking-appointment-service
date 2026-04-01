import { Injectable, OnModuleInit } from '@nestjs/common';
import { LogService } from '@/log/log.service';
import { RabbitmqService } from '@/rabbitmq/rabbitmq.service';
import { StorageMessage } from '@/common/dto/storage-message.dto';
import { SpecialistService } from '../specialist.service';

@Injectable()
export class SpecialistStorageListener implements OnModuleInit {
  constructor(
    private readonly rabbitmqService: RabbitmqService,
    private readonly logger: LogService,
    private readonly specialistService: SpecialistService,
  ) {}

  async onModuleInit() {
    await this.subscribeToStorageMessages();
  }

  private async subscribeToStorageMessages() {
    try {
      await this.rabbitmqService.subscribeFanoutExchange(
        'storage',
        'booking.specialist.storage',
        (msg) => {
          if (msg) {
            try {
              const data: StorageMessage = JSON.parse(
                msg.content.toString(),
              );
              const routingKey = msg.fields.routingKey;
              this.handleStorageMessage(data, routingKey).catch((error) => {
                this.logger.error(
                  'Error processing storage message for specialist:',
                  error,
                );
              });
              this.rabbitmqService.ack(msg);
            } catch (parseError) {
              this.logger.error('Error parsing storage message:', parseError);
              this.rabbitmqService.ack(msg);
            }
          }
        },
      );

      this.logger.log('Subscribed to storage messages for specialists');
    } catch (error) {
      this.logger.error(
        'Error subscribing to storage messages for specialists:',
        error,
      );
    }
  }

  private async handleStorageMessage(
    data: StorageMessage,
    routingKey?: string,
  ) {
    this.logger.log('Specialist storage message received:', data);

    if (!routingKey) return;

    if (routingKey === 'file.uploaded') {
      if (data.entityType === 'SPECIALIST_IMAGE') {
        await this.specialistService.handleSpecialistImageUpdate(data);
      }
    } else if (routingKey === 'file.deleted') {
      if (data.entityType === 'SPECIALIST_IMAGE') {
        await this.specialistService.handleSpecialistImageDelete(data);
      }
    }
  }
}
