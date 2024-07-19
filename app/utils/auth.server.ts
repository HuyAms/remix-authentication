import { redirect } from '@remix-run/node'
import bcrypt from 'bcryptjs'
import {prisma} from '~/utils/db.server'
import { sessionStorage } from './session.server'
import { type User } from '@prisma/client'

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

    const session = await prisma.session.findUnique({
        where: { id: sessionId, expirationDate: { gt: new Date() } },
        select: {
            userId: true,
        }
    })

	if (!session?.userId) {
		throw await logout(request)
	}

    return session.userId

}

export async function requireUser(request: Request) {
    const userId = await getUserId(request)

    if (!userId) {
        throw redirect('/login')
    }

    return userId
}

export async function requireAnonymous(request: Request) {
    const userId = await getUserId(request)

    if (userId) {
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

export async function getPasswordHash(password: string) {
	const hash = await bcrypt.hash(password, 10)
	return hash
}

export async function login({
    username, 
    password
}: {
    username: User['username'],
    password: string
}) {
    const userId = await verifyUserWithPassword(username, password)

    if (!userId) return null

    // create a session
    const session = await prisma.session.create({
        data: {
            userId: userId.id,
            expirationDate: getSessionExpireDate()
        },
        select: { id: true, expirationDate: true },

    })

    return session
}

export async function signup({
    username,
    name,
    password,
    email
}: {
    username: User['username'],
    name: User['name'],
    email: User['email'],
    password: string,
}) {

    const session = await prisma.session.create({
        data: {
            user: {
                create: {
                    username,
                    name,
                    email,
                    password: {
                        create: {
                            hash: await getPasswordHash(password)
                        }
                    }
                }
            },
            expirationDate: getSessionExpireDate()
        },
		select: { id: true, expirationDate: true },
    })

    return session
}

export async function resetPassword({username, password}: {username: User['username'], password: string}) {
   return prisma.user.update({
        where: {username: username},
        data: {
            password: {
                update: {
                    hash: await getPasswordHash(password)
                }
            }
        }
    }) 
}

export async function logout(request: Request) {
    const cookieSession = await sessionStorage.getSession(request.headers.get('Cookie'))
    const sessionId = cookieSession.get(sessionKey)

    // delete session if exists
    if (sessionId) {
		void prisma.session.deleteMany({ where: { id: sessionId } }).catch(() => {})
    }
    
    throw redirect('/', {
        headers: {
            'set-cookie': await sessionStorage.destroySession(cookieSession),
        }
    })

}