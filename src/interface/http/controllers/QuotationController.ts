import { Request, Response, NextFunction } from 'express';
import { ApproveQuotationUseCase } from '../../../application/use-cases/ApproveQuotationUseCase';
import { RejectQuotationUseCase } from '../../../application/use-cases/RejectQuotationUseCase';

export class QuotationController {
  constructor(
    private readonly approveQuotation: ApproveQuotationUseCase,
    private readonly rejectQuotation: RejectQuotationUseCase,
  ) {}

  async approve(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await this.approveQuotation.execute(req.params.id);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  async reject(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await this.rejectQuotation.execute(req.params.id);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
}
