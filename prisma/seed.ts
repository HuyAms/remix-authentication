import { faker } from '@faker-js/faker'
import { PrismaClient } from '@prisma/client'
import { UniqueEnforcer } from 'enforce-unique';
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

const uniqueEnforcer = new UniqueEnforcer();

function createUser() {
	const firstName = faker.person.firstName()
	const lastName = faker.person.lastName()

    const name = `${firstName} ${lastName}`
    const username = uniqueEnforcer.enforce(() => {
        return (
            faker.string.alphanumeric({ length: 2 }) +
            '_' +
            faker.internet.userName({
                firstName: firstName.toLowerCase(),
                lastName: lastName.toLowerCase(),
            })
        )
    })
    
    const email = `${username}@${faker.internet.domainName()}`

    return {
        email,
        username,
        name
    }
}

function createPassword(password: string = faker.internet.password()) {
    return bcrypt.hashSync(password, 10)
}


async function init() {

    console.log("🌱 Seeding database ...")

    console.time("🧹 Cleanup database")
    await prisma.user.deleteMany()
    console.timeEnd("🧹 Cleanup database")

    console.time("🧑‍💻 Create users")
    const numberOfUsers = 3
    await Promise.all(Array.from({length: numberOfUsers}).map(() => {
        const user = createUser()
        return prisma.user.create({
            data: {
                email: user.email,
                username: user.username,
                name: user.name,
                password: {
                    create: {
                        hash: createPassword('password')
                    }
                }
            }
        })
    }))

    await  prisma.user.create({
        data: {
            email: 'huyt@gmail.com',
            username: 'huyt',
            name: 'Huy Trinh',
            password: {
                create: {
                    hash: createPassword('123456')
                }
            }
        }
    })
    console.timeEnd("🧑‍💻 Create users")
}

console.time("🌱 Database has been seeded")
await init()
console.timeEnd("🌱 Database has been seeded")