import { ActionFunctionArgs } from "@remix-run/node";
import { redirect } from "@remix-run/react";
import { logout } from "~/utils/auth.server";

export function loader() {
    return redirect('/')
}

export async function action({request}: ActionFunctionArgs) {
    throw await logout(request)
}