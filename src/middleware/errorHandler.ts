import { Request, Response, NextFunction } from "express";

export interface ApiError extends Error {
  statusCode?: number;
  isOperational?: boolean;
  code?: string;
}

export class AppError extends Error implements ApiError {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string, statusCode: number = 500) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

export const errorHandler = (
  error: ApiError,
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  let { statusCode = 500, message } = error;

  // Handle specific error types
  if (error.name === "ValidationError") {
    statusCode = 400;
    message = "Invalid input data";
  } else if (error.name === "CastError") {
    statusCode = 400;
    message = "Invalid data format";
  } else if (error.code === "ENOTFOUND" || error.code === "ECONNREFUSED") {
    statusCode = 503;
    message = "External service unavailable";
  } else if (error.message?.includes("timeout")) {
    statusCode = 408;
    message = "Request timeout";
  }

  // Log comprehensive error details on server (including stack trace)
  console.error(`[ERROR] ${req.method} ${req.path} - ${statusCode}`, {
    message: error.message,
    statusCode,
    stack: error.stack,
    errorName: error.name,
    errorCode: error.code,
    isOperational: error.isOperational,
    timestamp: new Date().toISOString(),
    requestInfo: {
      ip: req.ip || req.connection.remoteAddress || "unknown",
      userAgent: req.get("User-Agent") || "unknown",
      body: req.body && Object.keys(req.body).length > 0 ? req.body : undefined,
      query: req.query && Object.keys(req.query).length > 0 ? req.query : undefined,
      params: req.params && Object.keys(req.params).length > 0 ? req.params : undefined,
    },
  });

  // Send clean error response (no stack traces or sensitive details)
  res.status(statusCode).json({
    success: false,
    error: {
      message,
      statusCode,
      timestamp: new Date().toISOString(),
      path: req.path,
      method: req.method,
    },
  });
};
