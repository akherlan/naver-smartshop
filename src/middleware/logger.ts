import { Request, Response, NextFunction } from "express";

interface LogData {
  method: string;
  url: string;
  statusCode: number;
  responseTime: number;
  userAgent?: string;
  ip: string;
  timestamp: string;
}

export const logger = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  const startTime = Date.now();

  // Capture original end method
  const originalEnd = res.end;

  // Override end method to capture response data
  res.end = function (chunk?: any, encoding?: any, cb?: any) {
    const responseTime = Date.now() - startTime;

    const logData: LogData = {
      method: req.method,
      url: req.originalUrl || req.url,
      statusCode: res.statusCode,
      responseTime,
      userAgent: req.get("User-Agent"),
      ip: req.ip || req.connection.remoteAddress || "unknown",
      timestamp: new Date().toISOString(),
    };

    // Color code based on status
    const getStatusColor = (status: number): string => {
      if (status >= 500) return "\x1b[31m"; // Red
      if (status >= 400) return "\x1b[33m"; // Yellow
      if (status >= 300) return "\x1b[36m"; // Cyan
      if (status >= 200) return "\x1b[32m"; // Green
      return "\x1b[0m"; // Reset
    };

    const resetColor = "\x1b[0m";
    const statusColor = getStatusColor(logData.statusCode);

    console.log(
      `${logData.timestamp} [${logData.method}] ${logData.url} - ` +
        `${statusColor}${logData.statusCode}${resetColor} - ` +
        `${logData.responseTime}ms - ${logData.ip}`,
    );

    // Log detailed info for errors
    if (logData.statusCode >= 400) {
      console.log(`  └─ User-Agent: ${logData.userAgent || "Unknown"}`);
    }

    // Call original end method and return its result
    return originalEnd.call(this, chunk, encoding, cb);
  };

  next();
};

export const logInfo = (message: string, data?: any): void => {
  console.log(`${new Date().toISOString()} [INFO] ${message}`, data || "");
};

export const logError = (message: string, error?: any): void => {
  console.error(`${new Date().toISOString()} [ERROR] ${message}`, error || "");
};

export const logWarning = (message: string, data?: any): void => {
  console.warn(`${new Date().toISOString()} [WARN] ${message}`, data || "");
};
