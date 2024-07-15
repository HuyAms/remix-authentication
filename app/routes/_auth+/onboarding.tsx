import { Container as MUIContainer, Stack, Typography, TextField, FormControlLabel, Checkbox, Button, styled } from "@mui/material";
import { z } from 'zod';
import { useForm, getInputProps } from '@conform-to/react';
import { parseWithZod, getZodConstraint } from '@conform-to/zod';
import { Form, redirect, useActionData, useLoaderData } from "@remix-run/react";
import { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { PasswordSchema, UserNameSchema } from "~/utils/user-validation";
import { requireAnonymous, sessionKey, signup } from "~/utils/auth.server";
import { onboardingEmailSessionKey, verifySessionStorage } from "~/utils/verification.server";
import { prisma } from "~/utils/db.server";
import { sessionStorage } from "~/utils/session.server";

const Container = styled(MUIContainer)({
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100vh',
});

const OnboardingSchema = z.object({
    username: UserNameSchema,
    name: z.string(),
    password: PasswordSchema,
    confirmPassword: PasswordSchema,
    remember: z.boolean().optional(),
  }).superRefine(({password, confirmPassword}, ctx) => {
    if (password !== confirmPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['confirmPassword'],
        message: 'The passwords must match',
        });

        return z.NEVER;
    }
})

async function requireOnboardingEmail(request: Request) {
    const cookieVerification = await verifySessionStorage.getSession(request.headers.get('Cookie'))
    const email = cookieVerification.get(onboardingEmailSessionKey)

    if (typeof email != 'string' || !email) {
        throw redirect('/register')
    }

    return email
}
  

export async function loader({request}: LoaderFunctionArgs) {
    await requireAnonymous(request)

    const email = await requireOnboardingEmail(request)

    return {
        email
    }
}

export async function action({ request }: ActionFunctionArgs) {
    const formData = await request.formData();
    const email = await requireOnboardingEmail(request);

    const submission = await parseWithZod(formData, {
        schema: OnboardingSchema.superRefine(async ({username}, ctx) => {
            const existingUser = await prisma.user.findUnique({
                where: {username: username}
            })

            if (existingUser) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    path: ['username'],
                    message: 'A user already exists with this username',
                    });
            
                return z.NEVER;
            }
        }).transform(async (data) => {
            const session = await signup({
                ...data,
                email
            })

            return {
                ...data,
                session
            }

        }),
        async: true})

    if (submission.status !== 'success') {
        return submission.reply();
    }

    // set session in cookie then redirect users
    const cookieSession = await sessionStorage.getSession(request.headers.get('Cookie'))  
    cookieSession.set(sessionKey, submission.value.session.id)

    return redirect('/', {
        headers: {
            'set-cookie': await sessionStorage.commitSession(cookieSession, {
                expires: submission.value.remember ? submission.value.session.expirationDate : undefined,
            })
        }
    })}

function getFirstErrorText(errors: string[] | undefined) {
    if (errors && errors.length > 0) {
        return errors[0];
    }

    return ""
}

export default function OnboardingScreen() {

    const { email } = useLoaderData<typeof loader>()

    const actionData = useActionData<typeof action>()


    const [form, fields] = useForm({
        id: 'login-form',
        shouldValidate: 'onBlur',
        shouldRevalidate: 'onInput',
        lastResult: actionData,
        constraint: getZodConstraint(OnboardingSchema),
        onValidate({ formData }) {
          return parseWithZod(formData, { schema: OnboardingSchema });
        },
      });

    return (
      <Container>
        <Stack direction="column" spacing={2}>
            <Typography variant="h5" component="h1" textAlign="center">Welcome {email}</Typography>
            <Form id={form.id} onSubmit={form.onSubmit} method='POST'>
                <Stack direction="column" spacing={3}>
                    <TextField 
                        {...getInputProps(fields.username, {type: "text"})} 
                        helperText={getFirstErrorText(fields.username.errors)} 
                        error={Boolean(fields.username.errors && fields.username.errors.length > 0 )} 
                        label="Username" variant="outlined"    
                    />
                        <TextField 
                        {...getInputProps(fields.name, {type: "text"})} 
                        helperText={getFirstErrorText(fields.name.errors)} 
                        error={Boolean(fields.name.errors && fields.name.errors.length > 0 )} 
                        label="Name" variant="outlined"    
                    />
                    <TextField 
                        {...getInputProps(fields.password, {type: "password"})} 
                        helperText={getFirstErrorText(fields.password.errors)} 
                        error={Boolean(fields.password.errors && fields.password.errors.length > 0 )} 
                        label="Password" 
                        variant="outlined" 
                    />
                     <TextField 
                        {...getInputProps(fields.confirmPassword, {type: "password"})} 
                        helperText={getFirstErrorText(fields.confirmPassword.errors)} 
                        error={Boolean(fields.confirmPassword.errors && fields.confirmPassword.errors.length > 0 )} 
                        label="Confirm Password" 
                        variant="outlined" 
                    />
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <FormControlLabel control={<Checkbox {...getInputProps(fields.remember, {type: "checkbox"})} />} label="Remember me" />
                    </Stack>
                    <Button type="submit" variant="contained">Create an account</Button>
                </Stack>
            </Form>
            {form.errors && <Typography color="error">{getFirstErrorText(form.errors)}</Typography>}
        </Stack>
      </Container>
    );
  }
  