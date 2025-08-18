/* eslint-disable @typescript-eslint/no-explicit-any */
import passport from "passport";
import { Strategy as GoogleStrategy, Profile, VerifyCallback } from "passport-google-oauth20";
import { envVars } from "./env";
import { User } from "../modules/user/user.model";
import { Role } from "../modules/user/user.interface";

passport.use(new GoogleStrategy(
    {
        clientID: envVars.GOOGLE_CLIENT_ID,
        clientSecret: envVars.GOOGLE_CLIENT_SECRET,
        callbackURL: envVars.GOOGLE_CALLBACK_URL
    },
    async (accessToken: string, refreshToken: string, profile: Profile, done: VerifyCallback) => {
        try {
            const email= profile.emails?.[0]?.value;
            if(!email){
                return done(null, false, { message: "Email not found in Google profile" });
            }
            let user=await User.findOne({ email });
            if(!user){
                user=await User.create({
                    name:profile.displayName,
                    email,
                    picture:profile.photos?.[0].value,
                    role:Role.RIDER,
                    auths:[{
                        provider: 'google',
                        providerId: profile.id
                    }],
                    isVerified: true
                })
            }
            return done(null,user)
        } catch (error) {
            return done(error)
        }
    }
));
passport.serializeUser((user: any, done: (err: any, id?: unknown) => void) => {
    done(null, user._id)
})

passport.deserializeUser(async (id: string, done: any) => {
    try {
        const user = await User.findById(id);
        done(null, user)
    } catch (error) {
        console.log(error);
        done(error)
    }
})