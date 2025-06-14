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

  // Log error details
  console.error(`[ERROR] ${req.method} ${req.path}`, {
    error: error.message,
    stack: error.stack,
    statusCode,
    timestamp: new Date().toISOString(),
    ip: req.ip,
    userAgent: req.get("User-Agent"),
  });

  // Send error response
  res.status(statusCode).json({
    error: {
      message,
      statusCode,
      timestamp: new Date().toISOString(),
      path: req.path,
      method: req.method,
    },
    ...(process.env.NODE_ENV === "development" && {
      stack: error.stack,
      details: error,
    }),
  });
};
