import { Request, Response } from "express";

export interface TContext {
  req: Request;
  res: Response;
}
