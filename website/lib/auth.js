import GoogleProvider from 'next-auth/providers/google';

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || 'primeshmarasingha@gmail.com')
  .split(',')
  .map(e => e.trim().toLowerCase())
  .filter(Boolean);

export const authOptions = {
  providers: [
    GoogleProvider({
      clientId:     process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
  session: { strategy: 'jwt' },
  pages: {
    signIn: '/book',
  },
  callbacks: {
    async jwt({ token }) {
      token.isAdmin = ADMIN_EMAILS.includes((token.email || '').toLowerCase());
      return token;
    },
    async session({ session, token }) {
      if (session?.user) {
        session.user.id = token.sub;
        session.user.isAdmin = !!token.isAdmin;
      }
      return session;
    },
    async redirect({ url, baseUrl }) {
      // Allow relative and same-origin redirects (covers /admin callbackUrl)
      if (url.startsWith('/')) return `${baseUrl}${url}`;
      if (url.startsWith(baseUrl)) return url;
      return baseUrl;
    },
  },
};
