import { Container as MUIContainer, Stack, Typography, TextField, Button, styled } from "@mui/material";
import { z } from 'zod';
import { useForm, getInputProps } from '@conform-to/react';
import { parseWithZod, getZodConstraint } from '@conform-to/zod';
import { Form, useActionData } from "@remix-run/react";
import { ActionFunctionArgs, LoaderFunctionArgs, redirect } from "@remix-run/node";
import { EmailSchema} from "~/utils/user-validation";
import { requireAnonymous} from "~/utils/auth.server";
import * as E from '@react-email/components'
import { prisma } from "~/utils/db.server";
import { sendEmail } from "~/utils/email.server";
import { prepareVerification } from "~/utils/verify.server";

const Container = styled(MUIContainer)({
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100vh',
});

const RegisterSchema = z.object({
    email: EmailSchema
  });

export async function loader({request}: LoaderFunctionArgs) {
    await requireAnonymous(request)

    return {}
}

export async function action({ request }: ActionFunctionArgs) {
    const formData = await request.formData();
    const submission = await parseWithZod(formData, {schema: 
        RegisterSchema.superRefine(async ({email}, ctx) => {
            const existingUser = await prisma.user.findUnique({
                select: {id: true},
                where: {
                    email: email
                }
            })

            if (existingUser) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: 'There is already an account with this email',
                    path: ['email'],
                })

                return z.NEVER
            }
        }),
        async: true});

    if (submission.status !== 'success') {
        return submission.reply();
    }

    const { otp, verifyUrl, redirectTo} = await prepareVerification({
        period: 60 * 10, // 10 mins
        request,
        type: "onboarding",
        target: submission.value.email,
        redirectTo: '/onboarding',
    })

    const response = await sendEmail({
		to: submission.value.email,
		subject: `Email verification`,
		react: <SignupEmail onboardingUrl={verifyUrl.toString()} otp={otp} />,
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

export default function RegisterScreen() {

    const actionData = useActionData<typeof action>()


    const [form, fields] = useForm({
        id: 'register-form',
        shouldValidate: 'onBlur',
        shouldRevalidate: 'onInput',
        lastResult: actionData,
        constraint: getZodConstraint(RegisterSchema),
        onValidate({ formData }) {
          return parseWithZod(formData, { schema: RegisterSchema });
        },
      });

    return (
      <Container>
        <Stack direction="column" spacing={2}>
            <Typography variant="h5" component="h1" textAlign="center">Signup: Please enter your email</Typography>
            <Form id={form.id} onSubmit={form.onSubmit} method='POST'>
                <Stack direction="column" spacing={3}>
                    <TextField 
                        {...getInputProps(fields.email, {type: "email"})} 
                        helperText={getFirstErrorText(fields.email.errors)} 
                        error={Boolean(fields.email.errors && fields.email.errors.length > 0 )} 
                        label="Email" variant="outlined"    
                    />
                    <Button type="submit" variant="contained">Submit</Button>
                </Stack>
            </Form>
            {form.errors && <Typography color="error">{getFirstErrorText(form.errors)}</Typography>}
        </Stack>
      </Container>
    );
  }
  

export function SignupEmail({
	onboardingUrl,
	otp,
}: {
	onboardingUrl: string
	otp: string
}) {
	return (
		<E.Html lang="en" dir="ltr">
			<E.Container>
				<h1>
					<E.Text>Welcome to Remix Authentication!</E.Text>
				</h1>
				<p>
					<E.Text>
						Your verification code: <strong>{otp}</strong>
					</E.Text>
				</p>
				<p>
					<E.Text>Or click the link to get started:</E.Text>
				</p>
				<E.Link href={onboardingUrl}>{onboardingUrl}</E.Link>
			</E.Container>
		</E.Html>
	)
}