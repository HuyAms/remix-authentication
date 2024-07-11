import { Container, Divider, Stack, Typography, Button } from "@mui/material";
import { Form } from "@remix-run/react";

export default function Nav() {

    return (
       <>
         <Container sx={{paddingY: '8px'}}>
            <Stack direction="row" justifyContent={"space-between"}>
                <Typography component="h1">🚀</Typography>
               <Form method="POST" action="/logout">
                <Button type="submit">Log out</Button>
               </Form>
            </Stack>
        </Container>
        <Divider/>
       </>
    )
}