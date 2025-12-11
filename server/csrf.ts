import { Request, Response, NextFunction } from "express";
import crypto from "crypto";

declare module "express-session" {
  interface SessionData {
    csrfToken?: string;
  }
}

function generateToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export function csrfProtection(req: Request, res: Response, next: NextFunction) {
  // Generate CSRF token if not exists
  if (!req.session.csrfToken) {
    req.session.csrfToken = generateToken();
  }

  // Skip CSRF check for GET, HEAD, OPTIONS requests
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) {
    return next();
  }

  // Get token from header only (more secure, doesn't require body parsing)
  const clientToken = req.headers["x-csrf-token"] as string | undefined;
  
  if (!clientToken || clientToken !== req.session.csrfToken) {
    return res.status(403).json({ message: "Token CSRF invalide" });
  }

  next();
}

export function getCsrfToken(req: Request, res: Response) {
  if (!req.session.csrfToken) {
    req.session.csrfToken = generateToken();
  }
  res.json({ csrfToken: req.session.csrfToken });
}
