# Web Authenticaton

I built this project to learn the web authentication. It's built with:

- [Remix](https://remix.run/)
- [Zod](https://zod.dev/)
- [Prisma](https://www.prisma.io/)

## 👾 Features

- Using cookie to identify users
- Managing and storing user password
- Locking down UI and backend routes
- Managing logout and "remember me" feature
- Server-managed session
- Email verification (eg: when creating account)
- Forgot password and Reset password flows

## 📒 Process

### 🚀 User-Password model

👉 I started by implementing a database model for user and password.

It's important to have a separate model for storing user and password. This prevents accidentally including passwords when querying user data, reducing the risk of exposing password hashes to the UI.

A `Password`model has a 1-1 relationship to the `User` model - [See the Schema here](https://github.com/HuyAms/remix-authentication/blob/main/prisma/schema.prisma)

👉 Password should be hashed

Never store plain passwords in the database for security reasons. Always hash passwords before saving them.

Hashing is different from encrypting. Encryption allows reversing the process to retrieve the original data, while hashing is a one-way process that cannot be reversed.

### 🚀 Seeding DB

I seeded the database with mock data, including one user for testing purposes. Fake user data is generated using [FakerJS](https://github.com/faker-js/faker)

To reset the database, simply run the seed script again.

```bash
npx prisma db seed
```

👉 [See the seeding file here](https://github.com/HuyAms/remix-authentication/blob/main/prisma/seed.ts)

### 🚀 Register/Login

I created a form for the user to login/register. We can access it with the `/login` and `/register` route.

[Conform](https://conform.guide/) is used to validate the form data in both client and server.

When a user logs in, we hash their password. We then find the user by their username and compare the hashed password with the stored hash in the database. If they match, the user is authenticated and can log in.

### 🚀 Using cookie to identify user

After loggin/register succesfully, we save the `userId` (later we will save the `sessionId` instead) to the cookie.

We know the user is authenticated when the userId appears in the cookie.

👉 **Cookie vs LocalStorage**

Cookies are more secure because they can be configured to be inaccessible to JavaScript, preventing tampering. Additionally, cookies are automatically attached to request headers and sent to the server.

We can add an expireDate to the cookie to automatically log out the user after a set period. More updates will follow with the remember me feature.

### 🚀 Logout and remember me

I created a `/logout` route to handle user logouts.

When a user logs out, we delete the cookie that stores the userId and redirect the user to the `/login` page.

👉 **Remember me** feature

By default, a cookie's `Expires` attribute is set to `Session`, meaning it will expire when the user closes their browser, logging them out.

When the **remember me** checkbox is checked, we set the Expires attribute to a future date, such as 30 days from now. Thus, user's authentication state is saved for 30 days.

### 🚀 Managed session

If we save the session to the cookie, there is no way to logout of a session on another computer.

Imagine that the users used a device from a public place (eg: library) and forgot to logout. They couldn't access that device again to logout - delete the cookie 😅 This is when the managed session comes in.

Instead of saving the session in cookie like before, we want to save the session information in a database and give a session ID to the user

👉 How it works?

- The user makes a login request and the frontend app sends the request to the backend server (see: the login function from `auth.server.ts`)
- The backend creates a session using a secret key and stores the data in session storage
- Then, the server sends a cookie back to the client with the unique session ID (see the action function in the `/routes/_auth+/login.tsx`)
- The user makes a new request to view another page and the browser sends the session id along with it.
- The server verifies the user using this ID (see: the `getUserId`function from `auth.server.ts`)
- When uesrs logout, simply delete the session and also destroy the cookie.

📚 Resources

- [JWT vs Session-based authentication](https://www.linkedin.com/posts/saurabh-dashora_i-asked-this-question-to-11-candidates-and-activity-7216328068603236352-ZKzW?utm_source=share&utm_medium=member_desktop)

### 🚀 Email verification

There are many approaches when it comes to verification. The most common one is to send user a code and asking them to enter it into the application.

A good way to generate the code is to use a one-time password. Here we are using this [@epic-web/totp](https://npm.im/@epic-web/totp) package

👉 How it works?

Try out the sign up flow and explore the code in

- `/routes/_auth+/register.tsx`
- `/utils/verify.server.ts`

Give user the OTP code

- Generate OTP code
- Save all the configurations used to generate the code in DB (see the **Verification** model)
- Send email to user with the OTP code

Verify the email

- User enter and submit the code
- We retrive the verification config in DB
- Verify code
- Delete the verification item in DB
- Redirect users to a relevent page

## 💡 Ideas

Impletement these when having time

- Supporting 2FA code
- OAuth / Third Party login
