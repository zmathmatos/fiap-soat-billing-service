import { Router } from 'express';
import { QuotationController } from '../controllers/QuotationController';

export function quotationRoutes(controller: QuotationController): Router {
  const router = Router();

  router.post('/', (req, res, next) => controller.create(req, res, next));
  router.patch('/:id/approve', (req, res, next) => controller.approve(req, res, next));
  router.patch('/:id/reject', (req, res, next) => controller.reject(req, res, next));

  return router;
}
