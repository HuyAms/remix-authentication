import { getInputProps, useForm } from '@conform-to/react';
import { getZodConstraint, parseWithZod } from '@conform-to/zod';
import { Button, Container as MUIContainer, Stack, TextField, Typography, styled } from "@mui/material";
import * as E from '@react-email/components';
import { ActionFunctionArgs, LoaderFunctionArgs, redirect } from "@remix-run/node";
import { Form, useActionData } from "@remix-run/react";
import { z } from 'zod';
import { requireAnonymous } from "~/utils/auth.server";
import { prisma } from "~/utils/db.server";
import { sendEmail } from "~/utils/email.server";
import { EmailSchema, UserNameSchema } from "~/utils/user-validation";
import { prepareVerification } from "~/utils/verify.server";

const Container = styled(MUIContainer)({
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100vh',
});

const ForgotPasswordSchema = z.object({
    emailOrUsername: z.union([EmailSchema, UserNameSchema])
  });

export async function loader({request}: LoaderFunctionArgs) {
    await requireAnonymous(request)

    return {}
}

export async function action({ request }: ActionFunctionArgs) {
    const formData = await request.formData();
    const submission = await parseWithZod(formData, {schema: 
        ForgotPasswordSchema.transform(async (data, ctx) => {

            const {emailOrUsername} = data
            const existingUser = await prisma.user.findFirst({
                select: {id: true, email: true},
                where: {
                    OR: [
                        {email: emailOrUsername},
                        {username: emailOrUsername}
                    ]
                }
            })

            if (!existingUser) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: 'No user exists with this username or email',
                    path: ['emailOrUsername'],
                })

                return z.NEVER
            }

            return {
                ...data,
                email: existingUser.email
            }
        }),
        async: true});

    if (submission.status !== 'success') {
        return submission.reply();
    }

    const { otp, verifyUrl, redirectTo} = await prepareVerification({
        period: 60 * 10, // 10 mins
        request,
        type: "reset-password",
        target: submission.value.email,
    })

    const response = await sendEmail({
		to: submission.value.email,
		subject: `Forgot password`,
		react: <ForgotPasswordEmail verifyUrl={verifyUrl.toString()} otp={otp} />,
	})

    if (response.status === "error") {
        return submission.reply({
            formErrors: ['There was an error sending the email']
        });
    }

    // redirect to verify screen
    return redirect(redirectTo.toString())
}

function getFirstErrorText(errors: string[] | undefined) {
    if (errors && errors.length > 0) {
        return errors[0];
    }

    return ""
}

export default function ForgotPassword() {

    const actionData = useActionData<typeof action>()


    const [form, fields] = useForm({
        id: 'forogt-password-form',
        shouldValidate: 'onBlur',
        shouldRevalidate: 'onInput',
        lastResult: actionData,
        constraint: getZodConstraint(ForgotPasswordSchema),
        onValidate({ formData }) {
          return parseWithZod(formData, { schema: ForgotPasswordSchema });
        },
      });

    return (
      <Container>
        <Stack direction="column" spacing={2}>
            <Typography variant="h5" component="h1" textAlign="center">Forgot password: Please enter your email or username</Typography>
            <Form id={form.id} onSubmit={form.onSubmit} method='POST'>
                <Stack direction="column" spacing={3}>
                    <TextField 
                        {...getInputProps(fields.emailOrUsername, {type: "text"})} 
                        helperText={getFirstErrorText(fields.emailOrUsername.errors)} 
                        error={Boolean(fields.emailOrUsername.errors && fields.emailOrUsername.errors.length > 0 )} 
                        label="Email or username" variant="outlined"    
                    />
                    <Button type="submit" variant="contained">Submit</Button>
                </Stack>
            </Form>
            {form.errors && <Typography color="error">{getFirstErrorText(form.errors)}</Typography>}
        </Stack>
      </Container>
    );
  }
  

export function ForgotPasswordEmail({
	verifyUrl,
	otp,
}: {
	verifyUrl: string
	otp: string
}) {
	return (
		<E.Html lang="en" dir="ltr">
			<E.Container>
				<h1>
					<E.Text>Forgot password</E.Text>
				</h1>
				<p>
					<E.Text>
						Your verification code: <strong>{otp}</strong>
					</E.Text>
				</p>
				<p>
					<E.Text>Or click the link to get started:</E.Text>
				</p>
				<E.Link href={verifyUrl}>{verifyUrl}</E.Link>
			</E.Container>
		</E.Html>
	)
}