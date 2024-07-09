import { Typography, Container } from "@mui/material";
import type { MetaFunction } from "@remix-run/node";

export const meta: MetaFunction = () => {
  return [
    { title: "New Remix App" },
    { name: "description", content: "Welcome to Remix!" },
  ];
};

export default function Index() {
  return (
    <Container sx={{paddingY: '16px'}}>
      <Typography variant="h3" component="h1">Home page</Typography>
    </Container>
  );
}
