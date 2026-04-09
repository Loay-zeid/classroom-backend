import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "../db/index.js"; // your drizzle instance
import * as schema from '../db/schema/auth.js'
import { trustedOrigins } from "./origins.js";

export const auth = betterAuth({
    secret: process.env.BETTER_AUTH_SECRET!,
    trustedOrigins,
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
            imageCldPubId : {
                type: "string",
                required: false,
                input : true,
            }
        }
    }
});
