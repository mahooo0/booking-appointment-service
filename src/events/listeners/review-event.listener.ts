import { Injectable, OnModuleInit } from '@nestjs/common';
import { RabbitmqService } from '@/rabbitmq/rabbitmq.service';
import { LogService } from '@/log/log.service';
import { PrismaService } from '@/prisma/prisma.service';

@Injectable()
export class ReviewEventListener implements OnModuleInit {
  constructor(
    private readonly rabbitmqService: RabbitmqService,
    private readonly logger: LogService,
    private readonly prisma: PrismaService,
  ) {}

  async onModuleInit() {
    await this.subscribeToReviewEvents();
  }

  private async subscribeToReviewEvents() {
    try {
      await this.rabbitmqService.subscribeFanoutExchange(
        'review',
        'booking-appointment.review-events',
        (msg) => {
          if (msg) {
            try {
              const data = JSON.parse(msg.content.toString());
              const routingKey = msg.fields.routingKey;
              this.handleMessage(data, routingKey).catch((error) => {
                this.logger.error(
                  'Error processing review event:',
                  error,
                );
              });
              this.rabbitmqService.ack(msg);
            } catch (parseError) {
              this.logger.error('Error parsing review message:', parseError);
              this.rabbitmqService.ack(msg);
            }
          }
        },
      );

      this.logger.log('Subscribed to review events');
    } catch (error) {
      this.logger.error('Error subscribing to review events:', error);
    }
  }

  private async handleMessage(data: any, routingKey?: string) {
    if (!routingKey) return;

    if (routingKey === 'review.created') {
      await this.handleReviewCreated(data);
    }
  }

  private async handleReviewCreated(data: any) {
    const appointmentId = data.appointmentId;
    if (!appointmentId) return;

    try {
      await this.prisma.appointment.update({
        where: { id: appointmentId },
        data: { hasCustomerReview: true },
      });
      this.logger.log(
        `Set hasCustomerReview=true for appointment: ${appointmentId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to update hasCustomerReview for appointment: ${appointmentId}`,
        error,
      );
    }
  }
}
