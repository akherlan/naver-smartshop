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
      console.log(`  └─ Error Response: ${logData.statusCode >= 500 ? 'Server Error' : 'Client Error'}`);
    }

    // Call original end method and return its result
    return originalEnd.call(this, chunk, encoding, cb);
  };

  next();
};

export const logInfo = (message: string, data?: any): void => {
  const timestamp = new Date().toISOString();
  console.log(`${timestamp} [INFO] ${message}`);

  if (data) {
    if (typeof data === 'object') {
      console.log(`  └─ Details:`, JSON.stringify(data, null, 2));
    } else {
      console.log(`  └─ Details: ${data}`);
    }
  }
};

export const logError = (message: string, error?: any): void => {
  const timestamp = new Date().toISOString();
  console.error(`${timestamp} [ERROR] ${message}`);

  if (error) {
    if (error instanceof Error) {
      console.error(`  └─ Error: ${error.message}`);
      console.error(`  └─ Stack: ${error.stack}`);
      if (error.name) console.error(`  └─ Type: ${error.name}`);
    } else if (typeof error === 'object') {
      console.error(`  └─ Details:`, JSON.stringify(error, null, 2));
    } else {
      console.error(`  └─ Details: ${error}`);
    }
  }
};

export const logWarning = (message: string, data?: any): void => {
  const timestamp = new Date().toISOString();
  console.warn(`${timestamp} [WARN] ${message}`);

  if (data) {
    if (typeof data === 'object') {
      console.warn(`  └─ Details:`, JSON.stringify(data, null, 2));
    } else {
      console.warn(`  └─ Details: ${data}`);
    }
  }
};
