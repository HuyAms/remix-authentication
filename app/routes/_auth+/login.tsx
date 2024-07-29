import { Container, Stack, Typography, TextField, FormControlLabel, Checkbox, Button, styled } from "@mui/material";
import { z } from 'zod';
import { useForm, getInputProps } from '@conform-to/react';
import { parseWithZod, getZodConstraint } from '@conform-to/zod';
import { Form, Link, redirect, useActionData } from "@remix-run/react";
import { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { PasswordSchema, UserNameSchema } from "~/utils/user-validation";
import { login, requireAnonymous, sessionKey } from "~/utils/auth.server";
import { sessionStorage } from "~/utils/session.server";

const LoginContainer = styled(Container)({
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100vh',
});

const LoginSchema = z.object({
    username: UserNameSchema,
    password: PasswordSchema,
    remember: z.boolean().optional(),
  });

export async function loader({request}: LoaderFunctionArgs) {
    await requireAnonymous(request)

    return {}
}

export async function action({ request }: ActionFunctionArgs) {
    const formData = await request.formData();
    const submission = await parseWithZod(formData, {
        schema: LoginSchema.transform(async (data, ctx) => {

            const session = await login({
                username: data.username,
                password: data.password
            })

            if (!session) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: 'Invalid username or password',
                })

                return z.NEVER
            }

            // create session

            return {
                ...data,
                session: session
            }

        }),
        async: true,
    });

    // delete password hash
    delete submission.payload.password

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
    })
}

function getFirstErrorText(errors: string[] | undefined) {
    if (errors && errors.length > 0) {
        return errors[0];
    }

    return ""
}

export default function LoginScreen() {

    const actionData = useActionData<typeof action>()


    const [form, fields] = useForm({
        id: 'login-form',
        shouldValidate: 'onBlur',
        shouldRevalidate: 'onInput',
        lastResult: actionData,
        constraint: getZodConstraint(LoginSchema),
        onValidate({ formData }) {
          return parseWithZod(formData, { schema: LoginSchema });
        },
      });

    return (
      <LoginContainer>
        <Stack direction="column" spacing={2}>
            <Typography variant="h5" component="h1" textAlign="center">Login</Typography>
            <Form id={form.id} onSubmit={form.onSubmit} method='POST'>
                <Stack direction="column" spacing={3}>
                    <TextField 
                        {...getInputProps(fields.username, {type: "text"})} 
                        helperText={getFirstErrorText(fields.username.errors)} 
                        error={Boolean(fields.username.errors && fields.username.errors.length > 0 )} 
                        label="Username" variant="outlined"    
                    />
                    <TextField 
                        {...getInputProps(fields.password, {type: "password"})} 
                        helperText={getFirstErrorText(fields.password.errors)} 
                        error={Boolean(fields.password.errors && fields.password.errors.length > 0 )} 
                        label="Password" 
                        variant="outlined" 
                    />
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <FormControlLabel control={<Checkbox {...getInputProps(fields.remember, {type: "checkbox"})} />} label="Remember me" />
                        <Link to="/forgot-password">
                            <Typography variant="body1">Forgot password?</Typography>
                        </Link>
                    </Stack>
                    <Button type="submit" variant="contained">Login</Button>
                    <Link to="/register">
                        <Typography variant="body1">Create an account</Typography>
                    </Link>
                </Stack>
            </Form>
            {form.errors && <Typography color="error">{getFirstErrorText(form.errors)}</Typography>}
        </Stack>
      </LoginContainer>
    );
  }
  