import { Container, Stack, Typography, TextField, FormControlLabel, Checkbox, Button, styled } from "@mui/material";
import { Link } from "@remix-run/react";

const LoginContainer = styled(Container)({
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100vh',
});

export default function LoginScreen() {
    return (
      <LoginContainer>
        <Stack direction="column" spacing={2}>
            <Typography variant="h5" component="h1" textAlign="center">Login</Typography>
            <form>
                <Stack direction="column" spacing={3}>
                    <TextField label="Username" variant="outlined" />
                    <TextField label="Password" variant="outlined" />
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <FormControlLabel control={<Checkbox defaultChecked />} label="Remember me" />
                        <Link to="/">
                            <Typography variant="body1">Forgot password?</Typography>
                        </Link>
                    </Stack>
                    <Button variant="contained">Login</Button>
                    <Link to="/">
                        <Typography variant="body1">Create an account</Typography>
                    </Link>
                </Stack>
            </form>
        </Stack>
      </LoginContainer>
    );
  }
  