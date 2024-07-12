# Web Authenticaton

I built this project to learn the web authentication. It's built with:

- [Remix](https://remix.run/)
- [Zod](https://zod.dev/)
- [Prisma](https://www.prisma.io/)

## 👾 Features

- Using cookie to identify users
- Managing and storing user password
- Managing logout and "remember me" feature

## 📒 Process

<details>
<summary><h3> 🚀 User-Password model</h3></summary>

👉 I started by implementing a database model for user and password.

It's important to have a separate model for storing user and password. This prevents accidentally including passwords when querying user data, reducing the risk of exposing password hashes to the UI.

A `Password`model has a 1-1 relationship to the `User` model - [See the Schema here](https://github.com/HuyAms/remix-authentication/blob/main/prisma/schema.prisma)

👉 Password should be hashed

Never store plain passwords in the database for security reasons. Always hash passwords before saving them.

Hashing is different from encrypting. Encryption allows reversing the process to retrieve the original data, while hashing is a one-way process that cannot be reversed.

</details>

<details>
<summary><h3> 🚀 Seeding DB</h3></summary>

I seeded the database with mock data, including one user for testing purposes.

To reset the database, simply run the seed script again.

```bash
npx prisma db seed
```

👉 [See the seeding file here](https://github.com/HuyAms/remix-authentication/blob/main/prisma/seed.ts)

</details>

<details>
<summary><h3> 🚀 Login with password</h3></summary>
I created a form for the user to login. We can access it with the `/login` route.

[Conform](https://conform.guide/) is used to validate the form data in both client and server.

When a user logs in, we hash their password. We then find the user by their username and compare the hashed password with the stored hash in the database. If they match, the user is authenticated and can log in.

</details>

<details>
<summary><h3> 🚀 Using cookie to identify user</h3></summary>
After loggin/register succesfully, we save the `userId` (later we will save the `sessionId` instead) to the cookie.

We know the user is authenticated when the userId appears in the cookie.

👉 **Cookie vs LocalStorage**

Cookies are more secure because they can be configured to be inaccessible to JavaScript, preventing tampering. Additionally, cookies are automatically attached to request headers and sent to the server.

We can add an expireDate to the cookie to automatically log out the user after a set period. More updates will follow with the remember me feature.

</details>

<details>
<summary><h3> 🚀 Logout and remember me</h3></summary>
I created a `/logout` route to handle user logouts.

When a user logs out, we delete the cookie that stores the userId and redirect the user to the `/login` page.

👉 **Remember me** feature

By default, a cookie's `Expires` attribute is set to `Session`, meaning it will expire when the user closes their browser, logging them out.

When the **remember me** checkbox is checked, we set the Expires attribute to a future date, such as 30 days from now. Thus, user's authentication state is saved for 30 days.

</details>
