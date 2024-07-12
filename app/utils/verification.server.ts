import { createCookieSessionStorage } from '@remix-run/node'

export const onboardingEmailSessionKey = 'onboardingEmail'

export const verifySessionStorage = createCookieSessionStorage({
    cookie: {
		name: 'en_verification',
		sameSite: 'lax',
		path: '/',
		httpOnly: true,
		secure: process.env.NODE_ENV === 'production',
	},
})