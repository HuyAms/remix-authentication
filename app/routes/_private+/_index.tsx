import { Typography, Container, List, ListItem, Button } from "@mui/material";
import type { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { Form, json, useLoaderData } from "@remix-run/react";
import { requireUser, sessionKey } from "~/utils/auth.server";
import { prisma } from "~/utils/db.server";
import { sessionStorage } from "~/utils/session.server";

export const meta: MetaFunction = () => {
  return [
    { title: "New Remix App" },
    { name: "description", content: "Welcome to Remix!" },
  ];
};

export async function loader({request}: LoaderFunctionArgs) {

  const userId = await requireUser(request)

  const sessions = await prisma.session.findMany({
    where: {
      userId: userId
    }
  })

  return {
    sessions
  }
}

const signOutOfSessionsActionIntent = 'sign-out-of-sessions'

export async function action({ request }: ActionFunctionArgs) {
	const userId = await requireUser(request)
	const formData = await request.formData()
	const intent = formData.get('intent')
	switch (intent) {
		case signOutOfSessionsActionIntent: {

      const cookieSession = await sessionStorage.getSession(
        request.headers.get('cookie'),
      )
      const sessionId = cookieSession.get(sessionKey)

      if (!sessionId) {
        throw new Response('No session found', { status: 400 })
      }

      await prisma.session.deleteMany({
        where: {
          userId,
          id: { not: sessionId },
        },
      })

      return json({ status: 'success' } as const)
		}
		default: {
			throw new Response(`Invalid intent "${intent}"`, { status: 400 })
		}
	}
}

export default function Index() {

  const {sessions} = useLoaderData<typeof loader>()

  function renderSessionList() {

    if (sessions.length === 1) {
      return (
        <Typography sx={{marginY: '24px'}}>🙋‍♂️ This is your only session</Typography>
      )
    }

    return (
      <>
        <List sx={{marginBottom: '24px'}}>
        {sessions.map(session => (
          <ListItem sx={{display: "flex", flexDirection: 'row', gap: '8px'}} key={session.id}>
            <div>{session.id} - Expired at: {new Date(session.expirationDate).toLocaleDateString()}</div>
          </ListItem>
        ))}
      </List>
       <Form method="POST">
       <Button name="intent" value={signOutOfSessionsActionIntent} type="submit" variant="contained" color="primary">Sign out of other sessions</Button>
     </Form>
      </>
    )
  }

  return (
    <Container sx={{paddingY: '16px'}}>
      <Typography variant="h3" component="h1">Session List: {sessions.length}</Typography>
      {renderSessionList()}
     
    </Container>
  );
}
