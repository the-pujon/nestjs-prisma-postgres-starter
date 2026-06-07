import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import * as fs from 'fs';
import * as path from 'path';
import config from '../../config/app.config';
import AppError from '../errors/app.error';
import httpStatus from 'http-status';
import { CustomLoggerService } from '../logging/logger.service';

export interface EmailOptions {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor(private readonly customLogger: CustomLoggerService) {
    this.transporter = nodemailer.createTransport({
      host: String(config.email_host),
      port: Number(config.email_port),
      secure: config.email_port === 465, // true for 465, false for other ports
      auth: {
        user: String(config.email_user),
        pass: String(config.email_pass),
      },
    });
  }

  /**
   * Send an email
   */
  async sendEmail(options: EmailOptions): Promise<void> {
    this.customLogger.log(
      `Sending email to: ${options.to}, subject: ${options.subject}`,
      'EmailService',
    );
    const mailOptions = {
      from: String(config.email_from || config.email_user),
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      this.customLogger.log(
        `Email sent successfully to: ${options.to}`,
        'EmailService',
      );
    } catch (error) {
      this.customLogger.error(
        `Error sending email to ${options.to}`,
        error instanceof Error ? error.stack : undefined,
        'EmailService',
      );
      console.error('Error sending email:', error);
      throw AppError.badRequest('Email sending failed, something went wrong!');
    }
  }

  /**
   * Load and parse email template
   */
  getEmailTemplate(
    filePath: string,
    replacements: Record<string, string>,
  ): string {
    try {
      const absolutePath = path.resolve(
        process.cwd(),
        'templates',
        'emails',
        filePath,
      );
      let template = fs.readFileSync(absolutePath, { encoding: 'utf-8' });

      for (const key in replacements) {
        template = template.replace(
          new RegExp(`{{${key}}}`, 'g'),
          replacements[key],
        );
      }

      return template;
    } catch (error) {
      console.error('Error reading email template:', error);
      throw new AppError(
        httpStatus.INTERNAL_SERVER_ERROR,
        'Email template loading failed.',
      );
    }
  }

  /**
   * Send verification email
   */
  async sendVerificationEmail(
    email: string,
    username: string,
    verificationCode: string,
  ): Promise<void> {
    const html = this.getEmailTemplate('verification.html', {
      username,
      verificationCode,
      year: new Date().getFullYear().toString(),
    });

    await this.sendEmail({
      to: email,
      subject: 'Verify your email address',
      html,
    });
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(
    email: string,
    username: string,
    resetCode: string,
  ): Promise<void> {
    const html = this.getEmailTemplate('password-reset.html', {
      username,
      resetCode,
      year: new Date().getFullYear().toString(),
    });

    await this.sendEmail({
      to: email,
      subject: 'Reset your password',
      html,
    });
  }

  /**
   * Send welcome email after verification
   */
  async sendWelcomeEmail(email: string, username: string): Promise<void> {
    const html = this.getEmailTemplate('welcome.html', {
      username,
      year: new Date().getFullYear().toString(),
    });

    await this.sendEmail({
      to: email,
      subject: 'Welcome to our platform!',
      html,
    });
  }
}
