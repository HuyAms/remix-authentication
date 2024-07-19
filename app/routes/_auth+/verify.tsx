import { getInputProps, useForm } from '@conform-to/react';
import { getZodConstraint, parseWithZod } from '@conform-to/zod';
import {
    Button,
    Container as MUIContainer,
    Stack,
    TextField,
    Typography,
    styled
} from "@mui/material";
import { ActionFunctionArgs, LoaderFunctionArgs, redirect } from "@remix-run/node";
import { Form, useActionData, useSearchParams } from "@remix-run/react";
import { z } from 'zod';
import { requireAnonymous } from "~/utils/auth.server";
import { prisma } from '~/utils/db.server';
import { onboardingEmailSessionKey, verifySessionStorage } from "~/utils/verification.server";
import { isCodeValid } from '~/utils/verify.server';

const types = ['onboarding'] as const
export const VerificationTypeSchema = z.enum(types)
export type VerificationTypes = z.infer<typeof VerificationTypeSchema>


// we attach these to the URL as query params
// so when users click on the link in the email and go to the app
// we can extract these values from the URL
export const codeQueryParam = 'code'
export const targetQueryParam = 'target'
export const typeQueryParam = 'type'
export const redirectToQueryParam = 'redirectTo'


const Container = styled(MUIContainer)({
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100vh',
});

export const VerifySchema = z.object({
    [codeQueryParam]: z.string().min(6).max(6),
    [targetQueryParam]: z.string(),
    [typeQueryParam]: VerificationTypeSchema,
    [redirectToQueryParam]: z.string().optional(),
});
async function handleOnboardingVerification(request: Request, email: string) {
    const cookieSession = await verifySessionStorage.getSession(request.headers.get('Cookie'));
    cookieSession.set(onboardingEmailSessionKey, email)

    return redirect('/onboarding', {
        headers: {
            'set-cookie': await verifySessionStorage.commitSession(cookieSession)
        }
    })

}

async function validateRequest(request: Request, body: URLSearchParams | FormData,) {

    const submission = parseWithZod(body, {schema: VerifySchema});

    if (submission.status !== 'success') {
        return submission.reply();
    }

    const codeValid = await isCodeValid({
        type: submission.value[typeQueryParam],
        code: submission.value[codeQueryParam],
        target: submission.value[targetQueryParam]
    })

    if (!codeValid) {
        return submission.reply({
            formErrors: ['Invalid code']
        })
    }

    // success 
    await prisma.verification.delete({
        where: {
            target_type: {
                target: submission.value[targetQueryParam],
                type: submission.value[typeQueryParam],
            }
        }
    })

    switch(submission.value[typeQueryParam]) {
        case 'onboarding': {
            return await handleOnboardingVerification(request, submission.value[targetQueryParam])
        }
    }
}

export async function action({ request }: ActionFunctionArgs) {
    const formData = await request.formData();
    return await validateRequest(request, formData)

}

export async function loader({request}: LoaderFunctionArgs) {
    await requireAnonymous(request)
	const params = new URL(request.url).searchParams

    return await validateRequest(request, params)
}


function getFirstErrorText(errors: string[] | undefined) {
    if (errors && errors.length > 0) {
        return errors[0];
    }

    return ""
}

export default function VerifyScreen() {

    const actionData = useActionData<typeof action>()
    const [searchParams] = useSearchParams()


    const [form, fields] = useForm({
        id: 'verify-form',
        shouldValidate: 'onBlur',
        shouldRevalidate: 'onInput',
        lastResult: actionData,
        constraint: getZodConstraint(VerifySchema),
        defaultValue: {
            [codeQueryParam]: searchParams.get(codeQueryParam) ?? '',
            [targetQueryParam]: searchParams.get(targetQueryParam) ?? '',
            [typeQueryParam]: searchParams.get(typeQueryParam) ?? '',
            [redirectToQueryParam]: searchParams.get(redirectToQueryParam) ?? '',
        },
        onValidate({ formData }) {
          return parseWithZod(formData, { schema: VerifySchema });
        },
    });

    return (
      <Container>
        <Stack direction="column" spacing={2}>
            <Typography variant="h5" component="h1" textAlign="center">Check your email</Typography>
            <Typography textAlign="center">We&apos;ve sent you code to verify your email address</Typography>
            <Form id={form.id} onSubmit={form.onSubmit} method='POST'>
                <Stack direction="column" spacing={3}>
                        <input
							{...getInputProps(fields[typeQueryParam], { type: 'hidden' })}
						/>
						<input
							{...getInputProps(fields[targetQueryParam], { type: 'hidden' })}
						/>
						<input
							{...getInputProps(fields[redirectToQueryParam], {
								type: 'hidden',
							})}
						/>
                    <TextField 
                        {...getInputProps(fields.code, {type: "text"})} 
                        helperText={getFirstErrorText(fields[codeQueryParam].errors)} 
                        error={Boolean(fields.code.errors && fields.code.errors.length > 0 )} 
                        label="Code" variant="outlined"    
                    />
                    <Button type="submit" variant="contained">Submit</Button>
                </Stack>
            </Form>
            {form.errors && <Typography color="error">{getFirstErrorText(form.errors)}</Typography>}
        </Stack>
      </Container>
    );
  }
  