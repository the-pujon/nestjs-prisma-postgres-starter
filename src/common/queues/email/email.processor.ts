import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Inject } from '@nestjs/common';
import { Job } from 'bullmq';
import { EmailJob } from './email.queue';
import { EmailService } from 'src/common/services/email.service';
import { PrismaService } from '../../../shared/infrastructure/database/prisma.service';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';

@Processor('email')
export class EmailProcessor extends WorkerHost {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER)
    private readonly logger: Logger,
    private readonly emailService: EmailService,
    private readonly prismaService: PrismaService,
  ) {
    super();
  }

  async process(job: Job<EmailJob>): Promise<void> {
    this.logger.info(`Processing email job: ${job.name} (ID: ${job.id})`, {
      context: 'EmailProcessor',
      jobId: job.id,
      jobName: job.name,
    });

    try {
      switch (job.data.type) {
        case 'verification':
          await this.handleVerificationEmail(job);
          break;
        case 'welcome':
          await this.handleWelcomeEmail(job);
          break;
        default:
          this.logger.warn(
            `Unknown email job type: ${String((job.data as { type?: string }).type || 'undefined')}`,
            { context: 'EmailProcessor', jobId: job.id },
          );
      }
    } catch (error) {
      this.logger.error(`Failed to process email job ${job.id}`, {
        context: 'EmailProcessor',
        jobId: job.id,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error; // Re-throw to trigger retry
    }
  }

  private async handleVerificationEmail(job: Job<EmailJob>): Promise<void> {
    const data = job.data as Extract<EmailJob, { type: 'verification' }>;
    const { email, username, verificationCode, authId } = data;

    try {
      // Send the email
      await this.emailService.sendVerificationEmail(
        email,
        username,
        verificationCode,
      );

      // Update email history status to 'sent'
      await this.prismaService.emailHistory.updateMany({
        where: {
          authId,
          emailType: 'verification',
          emailStatus: 'pending',
        },
        data: {
          emailStatus: 'sent',
        },
      });

      this.logger.info(`Verification email sent successfully to ${email}`, {
        context: 'EmailProcessor',
        jobId: job.id,
        email,
      });
    } catch (error) {
      this.logger.error(`Failed to send verification email to ${email}`, {
        context: 'EmailProcessor',
        email,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      // Update email history status to 'failed'
      await this.prismaService.emailHistory.updateMany({
        where: {
          authId,
          emailType: 'verification',
          emailStatus: 'pending',
        },
        data: {
          emailStatus: 'failed',
          errorMessage:
            error instanceof Error ? error.message : 'Failed to send email',
        },
      });

      throw error; // Re-throw to trigger retry
    }
  }

  private async handleWelcomeEmail(job: Job<EmailJob>): Promise<void> {
    const data = job.data as Extract<EmailJob, { type: 'welcome' }>;
    const { email, username } = data;

    try {
      await this.emailService.sendWelcomeEmail(email, username);
      this.logger.info(`Welcome email sent successfully to ${email}`, {
        context: 'EmailProcessor',
        jobId: job.id,
        email,
      });
    } catch (error) {
      this.logger.error(`Failed to send welcome email to ${email}`, {
        context: 'EmailProcessor',
        email,
        error: error instanceof Error ? error.message : String(error),
      });
      // Don't throw for welcome emails - they're non-critical
      // Just log the error and mark job as complete
    }
  }
}
