import { createCookieSessionStorage } from '@remix-run/node'

export const onboardingEmailSessionKey = 'onboardingEmail'
export const resetPasswordUsernameSessionKey = 'resetPasswordEmailOrUsername'

export const verifySessionStorage = createCookieSessionStorage({
    cookie: {
		name: 'en_verification',
		sameSite: 'lax',
		path: '/',
		httpOnly: true,
		maxAge: 60 * 10, // 10 minutes - important to keep this low
		secure: process.env.NODE_ENV === 'production',
	},
})