import type { Request, Response, NextFunction } from "express";
import aj from "../config/arcjet";
import { type ArcjetNodeRequest, slidingWindow } from "@arcjet/node";

const securityMiddleware = async (req:Request,res:Response,next:NextFunction) => {
if(process.env.NODE_ENV === 'test') return next();

try {
    const role: RateLimitRole = req.user?.role ?? "guest";
    let limit: number;
    let message: string;

    switch(role) {
        case 'admin':
            limit = 20;
            message = "Admin request limit exceeded (20 per minute). Slow down.";
            break;
            case 'teacher':
            case 'student':
                limit = 10;
                message = "User request limit exceeded (10 per minute). Please wait.";
                break;
                default:
                    limit = 5;
            message = "Guest request limit exceeded (5 per minute). Please wait.";

    }

    const client = aj.withRule(
        slidingWindow({
            mode: 'LIVE',
            interval:'1m',
            max:limit,
        })
    )
     const ip = req.ip ?? req.socket.remoteAddress ?? "127.0.0.1";
     const arcjetRequest: ArcjetNodeRequest = {
        headers: req.headers,
         method: req.method,
         url:req.originalUrl,
         socket : {remoteAddress: ip},
     }

     const decision = await client.protect(arcjetRequest);
     if (process.env.ARCJET_ENV === "development") {
         console.log("Arcjet decision:", {
             denied: decision.isDenied(),
             reason: decision.reason?.constructor?.name,
             message: (decision.reason as { message?: string } | undefined)?.message,
         });
     }

    if (decision.isDenied() && decision.reason.isBot()){
        return res.status(403).json({
            error: 'forbidden.',
            message: 'Automated requests are not allowed .',
        });




    }  if (decision.isDenied() && decision.reason.isShield()){
        return res.status(403).json({
            error: 'forbidden.',
            message: 'Request blocked by security policy .',
        });




    }  if (decision.isDenied() && decision.reason.isRateLimit()){
        return res.status(403).json({
            error: 'Too many requests .', message
        });
    }  if (decision.isDenied() && decision.reason.isError()){
        console.warn("Arcjet decision error:", decision.reason.message);
        return res.status(500).json({
            error: "Arcjet error",
            message: decision.reason.message,
        });
    }

    next();
}catch (e){
    console.error('Arcjet middleware error:', e);
    res.status(500).json({error: 'Internal error', message: 'Something went wrong with security middleware'});
}
}
export default securityMiddleware;
