import { getInputProps, useForm } from '@conform-to/react';
import { getZodConstraint, parseWithZod } from '@conform-to/zod';
import { Button, Container as MUIContainer, Stack, TextField, Typography, styled } from "@mui/material";
import { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { Form, redirect, useActionData, useLoaderData } from "@remix-run/react";
import { z } from 'zod';
import { requireAnonymous, resetPassword } from "~/utils/auth.server";
import { prisma } from "~/utils/db.server";
import { PasswordSchema } from "~/utils/user-validation";
import { resetPasswordUsernameSessionKey, verifySessionStorage } from "~/utils/verification.server";

const Container = styled(MUIContainer)({
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100vh',
});

const ResetPasswordSchema = z.object({
    password: PasswordSchema,
    confirmPassword: PasswordSchema,
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

async function requireEmailOrUsername(request: Request) {
    const cookieVerification = await verifySessionStorage.getSession(request.headers.get('Cookie'))
    const emailOrUsername = cookieVerification.get(resetPasswordUsernameSessionKey)

    const existingUser = await prisma.user.findFirst({
        select: {username: true},
        where: {
            OR: [
                {email: emailOrUsername},
                {username: emailOrUsername}
            ]
        }
    })

    if (!existingUser) {
        throw redirect('/forgot-password')
    }


    return existingUser.username
}
  

export async function loader({request}: LoaderFunctionArgs) {
    await requireAnonymous(request)

    const username = await requireEmailOrUsername(request)

    return {
        username
    }
}

export async function action({ request }: ActionFunctionArgs) {
    const formData = await request.formData();
    const username = await requireEmailOrUsername(request);

    const submission = parseWithZod(formData, {schema: ResetPasswordSchema})

    if (submission.status !== 'success') {
        return submission.reply();
    }

    await resetPassword({username, password: submission.value.password})

    const cookieVerification = await verifySessionStorage.getSession(request.headers.get('Cookie'))
    
    return redirect('/login', {
        headers: {
            'Set-Cookie': await verifySessionStorage.destroySession(cookieVerification),
        }
    })}

function getFirstErrorText(errors: string[] | undefined) {
    if (errors && errors.length > 0) {
        return errors[0];
    }

    return ""
}

export default function ResetPasswordScreen() {

    const { username } = useLoaderData<typeof loader>()

    const actionData = useActionData<typeof action>()


    const [form, fields] = useForm({
        id: 'reset-password-form',
        shouldValidate: 'onBlur',
        shouldRevalidate: 'onInput',
        lastResult: actionData,
        constraint: getZodConstraint(ResetPasswordSchema),
        onValidate({ formData }) {
          return parseWithZod(formData, { schema: ResetPasswordSchema });
        },
      });

    return (
      <Container>
        <Stack direction="column" spacing={2}>
            <Typography variant="h5" component="h1" textAlign="center">Reset password: {username}</Typography>
            <Form id={form.id} onSubmit={form.onSubmit} method='POST'>
                <Stack direction="column" spacing={3}>
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
                    <Button type="submit" variant="contained">Reset password</Button>
                </Stack>
            </Form>
            {form.errors && <Typography color="error">{getFirstErrorText(form.errors)}</Typography>}
        </Stack>
      </Container>
    );
  }
  