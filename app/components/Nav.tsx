import { Container, Divider, Stack, Typography } from "@mui/material";
import { Link } from "@remix-run/react";
import { useOptionalUser } from "~/utils/user";

export default function Nav() {

    const optionalUser = useOptionalUser()

    return (
       <>
         <Container sx={{paddingY: '8px'}}>
            <Stack direction="row" justifyContent={"space-between"}>
                <Typography component="h1">🚀</Typography>
                {optionalUser ? (<Link to="/logout">Log out</Link>) : (<Link to="/login">Login</Link>)}
            </Stack>
        </Container>
        <Divider/>
       </>
    )
}