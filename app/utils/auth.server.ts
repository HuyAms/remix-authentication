import { redirect } from '@remix-run/node'
import bcrypt from 'bcryptjs'
import {prisma} from '~/utils/db.server'
import { sessionStorage } from './session.server'

export const sessionKey = 'sessionId'

// 30 days
const SESSION_EXPIRATION_TIME = 1000 * 60 * 60 * 24 * 30

export function getSessionExpireDate() {
        return new Date(Date.now() + SESSION_EXPIRATION_TIME)
}

export async function getUserId(request: Request) {
    const cookieSession = await sessionStorage.getSession(request.headers.get('Cookie'))
    const sessionId = cookieSession.get(sessionKey)

    if (!sessionId) {
        return null
    }

    return sessionId

}

export async function requireUser(request: Request) {
    const sessionId = await getUserId(request)

    if (!sessionId) {
        throw redirect('/login')
    }

    return sessionId
}

export async function requireAnonymous(request: Request) {
    const sessionId = await getUserId(request)

    if (sessionId) {
        throw redirect('/')
    }
}

export async function verifyUserWithPassword(username: string, password: string) {
    const userWithPassword = await prisma.user.findUnique({
        select: {id: true, password: {select: {hash: true}}},  
        where: {
            username: username,
        }
    })

    if (!userWithPassword || !userWithPassword.password) {
        return null
    }

    const isValid = await bcrypt.compare(password, userWithPassword.password.hash)

    if (!isValid) {
        return null
    }

    return {
        id: userWithPassword.id,
    }
}

export async function logout(request: Request) {
    const cookieSession = await sessionStorage.getSession(request.headers.get('Cookie'))
    
    throw redirect('/', {
        headers: {
            'set-cookie': await sessionStorage.destroySession(cookieSession),
        }
    })

}