import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "../db/index.js"; // your drizzle instance
import * as schema from '../db/schema/auth.js'
import { trustedOrigins } from "./origins.js";

const authBaseUrl =
    process.env.BETTER_AUTH_URL ??
    process.env.BACKEND_URL ??
    (process.env.RAILWAY_PUBLIC_DOMAIN?.trim()
        ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN.trim()}`
        : undefined);
const isProduction = process.env.NODE_ENV === "production";
const resolvedAuthBaseUrl =
    authBaseUrl ?? `http://localhost:${process.env.PORT ?? "8080"}`;

export const auth = betterAuth({
    secret: process.env.BETTER_AUTH_SECRET!,
    baseURL: resolvedAuthBaseUrl,
    trustedOrigins,
    trustedProxyHeaders: true,
    advanced: {
        useSecureCookies: isProduction,
        defaultCookieAttributes: {
            sameSite: isProduction ? "none" : "lax",
        },
    },
    database: drizzleAdapter(db, {
        provider: "pg",
        schema,
    }),
    emailAndPassword: {
        enabled: true,
    },
    user :{
        additionalFields: {
            role : {
                type: "string",
                required: true,
                default: "student",
                input : true,
            },
            approvalStatus: {
                type: "string",
                required: false,
                default: "approved",
                input: false,
            },
            imageCldPubId : {
                type: "string",
                required: false,
                input : true,
            }
        }
    },
    databaseHooks: {
        user: {
            create: {
                before: async (incomingUser) => {
                    const safeRole =
                        incomingUser.role === "teacher" ? "teacher" : "student";
                    const approvalStatus =
                        safeRole === "teacher" ? "pending" : "approved";

                    return {
                        data: {
                            ...incomingUser,
                            role: safeRole,
                            approvalStatus,
                        },
                    };
                },
            },
        },
    },
});
