import { LoaderFunctionArgs } from "@remix-run/node";
import { Outlet } from "@remix-run/react";
import Nav from "~/components/Nav";
import { requireUser } from "~/utils/auth.server";

export async function loader({request}: LoaderFunctionArgs) {

   await requireUser(request)

    return {}
}

export default function Layout() {
    return (
        <>
            <Nav/>
            <Outlet/>
        </>
    )
}