
import { generateTOTP, verifyTOTP } from '@epic-web/totp';
import { VerificationTypes, typeQueryParam, targetQueryParam, redirectToQueryParam, codeQueryParam } from '~/routes/_auth+/verify';
import { prisma } from '~/utils/db.server';
import { getDomainUrl } from '~/utils/misc';


export async function isCodeValid({
    type,
    target,
    code
}: {
	code: string
	type: VerificationTypes
	target: string
}) {

    const verification = await prisma.verification.findUnique({
        where: {
            target_type: {target, type},
            OR: [{ expiresAt: { gt: new Date() } }, { expiresAt: null }],
        },
        select: {
            secret: true,
            algorithm: true,
            period: true,
            charSet: true,
        }
    })

    if (!verification) {
        return false
    }

    const result = verifyTOTP({ 
        otp: code, 	
        secret: verification.secret,
		algorithm: verification.algorithm,
		period: verification.period,
		charSet: verification.charSet, 
    })

    if (!result) {
        return false
    }

    return true
}

export async function prepareVerification({
	period,
	request,
	type,
	target,
	redirectTo: postVerificationRedirectTo,
}: {
	period: number
	request: Request
	type: VerificationTypes
	target: string
	redirectTo?: string
}): Promise<{
    otp: string;
    redirectTo: URL;
    verifyUrl: URL;
}> {

    const verifyUrl = new URL(`${getDomainUrl(request)}/verify`)
    verifyUrl.searchParams.set(typeQueryParam, type)
    verifyUrl.searchParams.set(targetQueryParam, target)
    if (postVerificationRedirectTo) {
		verifyUrl.searchParams.set(redirectToQueryParam, postVerificationRedirectTo)
	}

    // it's the verifyUrl without the otp ocde
    const redirectTo = new URL(verifyUrl.toString())

    // generate a verification code
	const { otp, ...verificationConfig } = generateTOTP({
		algorithm: 'SHA256',
		period,
	})

    const verificationData = {
        type,
        target,
        expiresAt: new Date(Date.now() + verificationConfig.period * 1000),
        ...verificationConfig,
    }

    // upsert the verification in DB
    await prisma.verification.upsert({
        where: {target_type: {target, type}},
        update: {...verificationData},
        create: {...verificationData},
    })

    // aslo attach otp to the URL so we can auto verify the code
    verifyUrl.searchParams.set(codeQueryParam, otp)
  
    return {
        otp,
        verifyUrl,
        redirectTo
    }
} 