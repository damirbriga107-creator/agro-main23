export type Request = any;
export type Response = any;
export type NextFunction = (...args: any[]) => void;
import Joi from 'joi';
/**
 * Middleware utilities for microservices
 */
export declare class MiddlewareUtils {
    /**
     * Create async error wrapper
     */
    static asyncWrapper: (fn: Function) => (req: Request, res: Response, next: NextFunction) => void;
    /**
     * Create request ID middleware
     */
    static requestId: () => (req: Request, res: Response, next: NextFunction) => void;
    /**
     * Create request metrics middleware
     */
    static requestMetrics: (metricsService?: any) => (req: Request, res: Response, next: NextFunction) => void;
    /**
     * Create validation middleware
     */
    static validate: (schema: Joi.ObjectSchema, target?: "body" | "query" | "params") => (req: Request, res: Response, next: NextFunction) => void;
    /**
     * Create pagination middleware
     */
    static pagination: () => (req: Request, res: Response, next: NextFunction) => void;
    /**
     * Create CORS middleware
     */
    static cors: (origins?: string[]) => (req: Request, res: Response, next: NextFunction) => void;
    /**
     * Create security headers middleware
     */
    static security: () => (req: Request, res: Response, next: NextFunction) => void;
    /**
     * Create error handling middleware
     */
    static errorHandler: (logger?: any) => (error: any, req: Request, res: Response, next: NextFunction) => void;
    /**
     * Create 404 handler middleware
     */
    static notFound: () => (req: Request, res: Response) => void;
}
//# sourceMappingURL=middleware.d.ts.map