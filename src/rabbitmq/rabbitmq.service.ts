import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import * as amqp from 'amqplib';
import { ChannelModel } from 'amqplib';
import { LogService } from '@/log/log.service';

@Injectable()
export class RabbitmqService implements OnModuleInit, OnModuleDestroy {
  private connection: ChannelModel;
  private channel: amqp.Channel;

  private readonly rabbitmqUrl =
    process.env.RABBITMQ_URL || 'amqp://localhost:5672';

  constructor(private readonly logger: LogService) {}

  async onModuleInit() {
    try {
      this.connection = await amqp.connect(this.rabbitmqUrl);
      this.channel = await this.connection.createChannel();
      this.logger.log('Успішно підключено до RabbitMQ');
    } catch (error) {
      this.logger.error('Помилка підключення до RabbitMQ:', error);
      throw error;
    }
  }

  async onModuleDestroy() {
    try {
      await this.channel?.close();
      await this.connection?.close();
      this.logger.log("З'єднання з RabbitMQ закрито");
    } catch (error) {
      this.logger.error("Помилка при закритті з'єднання з RabbitMQ:", error);
    }
  }

  async publish(
    exchange: string,
    routingKey: string,
    content: any,
    options?: amqp.Options.Publish,
  ) {
    try {
      await this.channel.assertExchange(exchange, 'fanout', { durable: true });
      return this.channel.publish(
        exchange,
        routingKey,
        Buffer.from(JSON.stringify(content)),
        options,
      );
    } catch (error) {
      this.logger.error('Помилка публікації повідомлення:', error);
      throw error;
    }
  }

  async publishFanoutExchange(
    exchange: string,
    routingKey: string,
    content: any,
    options?: amqp.Options.Publish,
  ) {
    try {
      await this.channel.assertExchange(exchange, 'fanout', { durable: true });
      return this.channel.publish(
        exchange,
        routingKey,
        Buffer.from(JSON.stringify(content)),
        options,
      );
    } catch (error) {
      this.logger.error(
        'Помилка публікації повідомлення в fanout exchange:',
        error,
      );
      throw error;
    }
  }

  async subscribeFanoutExchange(
    exchange: string,
    queueName: string,
    callback: (msg: amqp.ConsumeMessage | null) => void,
    options?: amqp.Options.Consume,
  ) {
    try {
      await this.channel.assertExchange(exchange, 'fanout', { durable: true });
      const q = await this.channel.assertQueue(queueName, { durable: true });
      await this.channel.bindQueue(q.queue, exchange, '');
      return this.channel.consume(q.queue, callback, {
        ...options,
        noAck: false,
      });
    } catch (error) {
      this.logger.error('Помилка підписки на fanout exchange:', error);
      throw error;
    }
  }

  async publishToQueue(
    queue: string,
    content: any,
    options?: amqp.Options.Publish,
  ) {
    try {
      await this.channel.assertQueue(queue, { durable: true });
      return this.channel.sendToQueue(
        queue,
        Buffer.from(JSON.stringify(content)),
        { persistent: true, ...options },
      );
    } catch (error) {
      this.logger.error('Помилка публікації повідомлення в чергу:', error);
      throw error;
    }
  }

  async subscribe(
    queue: string,
    callback: (msg: amqp.ConsumeMessage) => void,
    options?: amqp.Options.Consume,
  ) {
    try {
      await this.channel.assertQueue(queue, { durable: true });
      return this.channel.consume(
        queue,
        (msg) => {
          if (msg) {
            callback(msg);
          }
        },
        { ...options, noAck: false },
      );
    } catch (error) {
      this.logger.error('Помилка підписки на чергу:', error);
      throw error;
    }
  }

  async ack(msg: amqp.ConsumeMessage) {
    this.channel.ack(msg);
  }

  async bindQueue(queue: string, exchange: string, pattern: string) {
    await this.channel.assertQueue(queue, { durable: true });
    await this.channel.assertExchange(exchange, 'fanout', { durable: true });
    await this.channel.bindQueue(queue, exchange, pattern);
  }

  getChannel(): amqp.Channel {
    return this.channel;
  }
}
