import nodemailer from 'nodemailer';
import { IEmailService, SendEmailOptions } from '../../application/services/IEmailService';
import { env } from '../../shared/config/env';

export class NodemailerEmailService implements IEmailService {
  private transporter = nodemailer.createTransport({
    host: env.smtp.host,
    port: env.smtp.port,
    auth: env.smtp.user ? { user: env.smtp.user, pass: env.smtp.pass } : undefined,
  });

  async send(options: SendEmailOptions): Promise<void> {
    await this.transporter.sendMail({
      from: env.smtp.from,
      to: options.to,
      subject: options.subject,
      html: options.html,
    });
  }
}
