import { betterAuth } from "better-auth";
import { Pool } from "pg";
import { oneTap } from "better-auth/plugins";
import "dotenv/config";


export const auth = betterAuth({
    database: new Pool({
        connectionString:  process.env.DATABASE_URL!,
    }),
    baseURL: process.env.BETTER_AUTH_URL ,
    trustedOrigins: [process.env.TRUSTED_ORIIGIN_URL!],
    
    plugins: [
        oneTap(),
    ],
   
    socialProviders: {
        google: {
            clientId: process.env.AUTH_CLIENT_ID!,
            clientSecret: process.env.AUTH_CLIENT_SECRET!,
        },
    },
});
